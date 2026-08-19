/**
 * dsh-niao-quick-open — 浏览器端：对话消息「删除」按钮。
 *
 * 在每条用户消息 / 大模型回复下方那一行操作按钮（复制按钮所在行）末尾
 * 追加一个「删除」图标按钮：点击弹出二次确认，确认后通知宿主端以
 * surface replace 遮蔽机制从模型上下文中删除该消息（连同其回复）。
 *
 * 定位策略（不依赖原生 hash 类名）：
 *  - 消息行：React 渲染的 flowItem 带稳定 data 属性
 *    [data-chat-flow-kind="user"]（用户输入）/ [data-chat-flow-kind=
 *    "assistant-step"]（大模型回复，含 streaming 中的行）；
 *  - seq 定位：调用宿主端 list-surface 拉取当前会话 surface 节点
 *    （模型可见消息，按 seq 升序），与 DOM 行按「同角色、同顺序」配对；
 *    正在生成的回复行在 surface 中尚无对应节点，自动跳过不注入；
 *  - 操作行：消息行内 aria-label 为「复制 / Copy」的按钮的父元素
 *    （原生 MessageIconActions 行），回退 [class*="actions"]。
 * 受配置「消息删除」开关控制（关闭时移除已注入按钮）。
 *
 * @module dsh-niao-quick-open/client/delete-message
 */

import { pluginConfig, runtimeCtx } from './state.js'
import { rpc } from './utils.js'
import { trashSvg } from './icons.js'
import { registerUIApply } from './config.js'

/** surface 列表缓存：{ sessionId, at, users, assistants }；2s 内不重复拉取。 */
let surfaceCache = null
const SURFACE_TTL = 2000
/** 正在拉取的 sessionId（防并发重复请求）。 */
let surfaceFetching = ''

/** 当前打开的删除确认层元素。 */
let deleteOverlay = null

/** 读取当前活动会话 id（客户端 sessions service 的当前选中项）。 */
function currentSessionId() {
  try {
    const sessions = runtimeCtx && runtimeCtx.get('sessions')
    if (!sessions || !sessions.list) return ''
    const snapshot = sessions.list.getSnapshot()
    return (snapshot && typeof snapshot.current === 'string') ? snapshot.current : ''
  } catch { return '' }
}

/**
 * 拉取当前会话的 surface 节点列表（带缓存与节流）。
 * @returns {Promise<Array<{seq:number, role:string, text:string}>>}
 */
async function fetchSurface(sessionId) {
  if (!sessionId) return []
  const now = Date.now()
  if (surfaceCache && surfaceCache.sessionId === sessionId && now - surfaceCache.at < SURFACE_TTL) {
    return [...surfaceCache.users, ...surfaceCache.assistants]
  }
  if (surfaceFetching === sessionId) return []
  surfaceFetching = sessionId
  try {
    const res = await rpc('list-surface', { sessionId })
    const items = (res.ok && res.value && Array.isArray(res.value.items)) ? res.value.items : []
    const users = []
    const assistants = []
    for (const item of items) {
      if (item && typeof item.seq === 'number') {
        if (item.role === 'user') users.push(item)
        else if (item.role === 'assistant') assistants.push(item)
      }
    }
    surfaceCache = { sessionId, at: now, users, assistants }
    return items
  } finally {
    surfaceFetching = ''
  }
}

/** 找到一条消息行内「操作按钮行」（复制按钮所在行）的容器元素。 */
function actionsRowOf(row) {
  const copy = row.querySelector('button[aria-label="复制"], button[aria-label="Copy"]')
  if (copy && copy.parentElement) return copy.parentElement
  const byClass = row.querySelector('[class*="actions"]')
  if (byClass && byClass !== row) return byClass
  return null
}

/** 从行内提取可展示的文本（用于调试/校验；不作为配对依据）。 */
function rowText(row) {
  const text = row.textContent || ''
  return text.replace(/\s+/g, ' ').trim().slice(0, 120)
}

/** 注入单个删除按钮到操作行；行已注入且 seq 相同则跳过。 */
function injectDeleteButton(row, actions, seq, role) {
  const existing = row.querySelector('[data-nio-del]')
  if (existing) {
    if (existing.getAttribute('data-nio-del-seq') === String(seq)) return
    existing.remove()
  }
  const btn = document.createElement('button')
  btn.type = 'button'
  btn.className = 'nio-del'
  btn.setAttribute('data-nio-del', '1')
  btn.setAttribute('data-nio-del-seq', String(seq))
  btn.setAttribute('data-nio-del-role', role)
  btn.setAttribute('aria-label', '删除该消息')
  const tip = document.createElement('span')
  tip.className = 'nio-del-tip'
  tip.textContent = role === 'user' ? '删除该消息（含回复）' : '删除该回答'
  btn.appendChild(trashSvg.cloneNode(true))
  btn.appendChild(tip)
  btn.addEventListener('click', (e) => {
    e.stopPropagation()
    showDeleteConfirm(role, seq)
  })
  actions.appendChild(btn)
}

/** 按「同角色、同顺序」把 surface 节点配对到 DOM 消息行并注入按钮。 */
function applyDeleteButtons(sessionId, items) {
  if (!sessionId || !Array.isArray(items) || items.length === 0) return
  const users = items.filter((item) => item.role === 'user')
  const assistants = items.filter((item) => item.role === 'assistant')
  const userRows = Array.from(document.querySelectorAll('[data-chat-flow-kind="user"]'))
  const assistantRows = Array.from(document.querySelectorAll('[data-chat-flow-kind="assistant-step"]'))
  let ui = 0
  for (const row of userRows) {
    if (ui >= users.length) break
    const actions = actionsRowOf(row)
    if (!actions) continue
    injectDeleteButton(row, actions, users[ui].seq, 'user')
    ui += 1
  }
  let ai = 0
  for (const row of assistantRows) {
    if (ai >= assistants.length) break
    const actions = actionsRowOf(row)
    if (!actions) continue
    injectDeleteButton(row, actions, assistants[ai].seq, 'assistant')
    ai += 1
  }
}

/** 移除所有已注入的删除按钮（开关关闭时调用）。 */
function removeDeleteButtons() {
  for (const btn of Array.from(document.querySelectorAll('[data-nio-del]'))) btn.remove()
}

/**
 * 扫描并维护消息删除按钮。幂等：已注入且 seq 相同的行跳过；
 * surface 缓存过期 / 会话切换时重新拉取后配对。
 */
export function ensureDeleteButtons() {
  if (!pluginConfig.messageDelete) {
    removeDeleteButtons()
    return
  }
  if (!document.querySelector('[data-conversation-scroll]')) return
  const sessionId = currentSessionId()
  if (!sessionId) return
  const now = Date.now()
  if (surfaceCache && surfaceCache.sessionId === sessionId && now - surfaceCache.at < SURFACE_TTL) {
    // 缓存有效：直接用缓存配对（幂等，避免每次 scan 都拉取）。
    applyDeleteButtons(sessionId, [...surfaceCache.users, ...surfaceCache.assistants])
    return
  }
  if (surfaceFetching === sessionId) return
  fetchSurface(sessionId).then((items) => applyDeleteButtons(sessionId, items))
}

/** 关闭当前删除确认层并解除监听。 */
function closeDeleteOverlay() {
  if (!deleteOverlay) return
  if (typeof deleteOverlay._nioCleanup === 'function') deleteOverlay._nioCleanup()
  deleteOverlay.remove()
  deleteOverlay = null
}

/** 在确认框内显示错误反馈（防重入：错误文案只在弹窗内）。 */
function failOverlay(text) {
  const dialog = deleteOverlay && deleteOverlay.querySelector('.nio-confirm-dialog')
  if (!dialog) return
  const old = dialog.querySelector('[data-nio-del-error]')
  if (old) old.remove()
  const err = document.createElement('div')
  err.className = 'nio-confirm-desc nio-del-err'
  err.setAttribute('data-nio-del-error', '1')
  err.textContent = text
  dialog.appendChild(err)
}

/** 弹出删除二次确认框；确认后执行删除并处理结果。 */
function showDeleteConfirm(role, seq) {
  if (deleteOverlay) closeDeleteOverlay()
  const sessionId = currentSessionId()
  if (!sessionId) {
    failOverlay('无法确定当前会话')
    return
  }
  const isUser = role === 'user'
  const overlay = document.createElement('div')
  overlay.className = 'nio-confirm'
  overlay.setAttribute('data-nio-confirm', '1')
  const dialog = document.createElement('div')
  dialog.className = 'nio-confirm-dialog'
  dialog.setAttribute('role', 'dialog')
  dialog.setAttribute('aria-modal', 'true')
  const title = document.createElement('div')
  title.className = 'nio-confirm-title'
  title.textContent = isUser ? '删除这条消息？' : '删除这条回答？'
  const desc = document.createElement('div')
  desc.className = 'nio-confirm-desc'
  desc.textContent = isUser
    ? '将删除该消息及其后续回复，模型将不再记得这条对话内容。此操作不可恢复（模型视角）。'
    : '将删除该回答，模型将不再记得这条内容。此操作不可恢复（模型视角）。'
  const actions = document.createElement('div')
  actions.className = 'nio-confirm-actions'
  const cancel = document.createElement('button')
  cancel.type = 'button'
  cancel.className = 'nio-confirm-btn'
  cancel.textContent = '取消'
  const ok = document.createElement('button')
  ok.type = 'button'
  ok.className = 'nio-confirm-btn nio-confirm-danger'
  ok.textContent = '确认删除'
  actions.appendChild(cancel)
  actions.appendChild(ok)
  dialog.appendChild(title)
  dialog.appendChild(desc)
  dialog.appendChild(actions)
  overlay.appendChild(dialog)

  const onKey = (e) => { if (e.key === 'Escape') closeDeleteOverlay() }
  const onDown = (e) => { if (e.target === overlay) closeDeleteOverlay() }
  cancel.addEventListener('click', () => closeDeleteOverlay())
  ok.addEventListener('click', () => {
    ok.disabled = true
    ok.textContent = '删除中…'
    rpc('delete-message', { sessionId, seq }).then((res) => {
      if (res.ok) {
        closeDeleteOverlay()
        return
      }
      ok.disabled = false
      ok.textContent = '确认删除'
      failOverlay(res.error || '删除失败')
    })
  })
  document.addEventListener('keydown', onKey)
  overlay.addEventListener('pointerdown', onDown)
  overlay._nioCleanup = () => {
    document.removeEventListener('keydown', onKey)
    overlay.removeEventListener('pointerdown', onDown)
  }
  document.body.appendChild(overlay)
  deleteOverlay = overlay
  ok.focus()
}

/** 配置「消息删除」开关变化时重建按钮。 */
registerUIApply(() => { try { ensureDeleteButtons() } catch { /* 会话区未就绪时忽略 */ } })
