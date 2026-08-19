/**
 * dsh-niao-quick-open — 浏览器端：对话消息「删除」按钮。
 *
 * 在每条用户消息下方那一行操作按钮（复制按钮所在行）末尾追加一个
 * 「删除」图标按钮：点击弹出二次确认，确认后通知宿主端以 surface
 * replace 遮蔽机制删除该用户消息（连带其后续的大模型回复，即整轮）。
 *
 * 界面同步删除：DSH 客户端界面（human transcript）故意不跟随 replace
 * 遮蔽（被删旧消息刷新后仍会重新渲染，这是产品设计），因此本模块用
 * 「已删除」标记（宿主端 list-surface 返回的 deleted 字段，来自日志里
 * 的 nio-delete 占位事件）把对应的 DOM 消息行 CSS 隐藏——删除后立即
 * 隐藏，刷新后经 list-surface 重新识别并继续隐藏，跨会话/跨刷新持久。
 *
 * 定位策略（不依赖原生 hash 类名）：
 *  - 消息行：React 渲染的 flowItem 带稳定 data 属性
 *    [data-chat-flow-kind="user"]（用户输入）；
 *  - seq 定位：调用宿主端 list-surface 拉取当前会话全部 append 用户消息
 *    （按 seq 升序，与界面 transcript 顺序一致），与 DOM 行按顺序配对；
 *  - 操作行：消息行内 aria-label 为「复制 / Copy」的按钮的父元素
 *    （原生 MessageIconActions 行），回退 [class*="actions"]。
 * 受配置「消息删除」开关控制（关闭时移除已注入按钮、恢复被隐藏行）。
 *
 * @module dsh-niao-quick-open/client/delete-message
 */

import { pluginConfig, runtimeCtx } from './state.js'
import { rpc } from './utils.js'
import { trashSvg } from './icons.js'
import { registerUIApply } from './config.js'

/** 用户消息列表缓存：{ sessionId, at, users }；2s 内不重复拉取。 */
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
 * 拉取当前会话的用户消息列表（带缓存与节流）。
 * @returns {Promise<Array<{seq:number, role:string, text:string, deleted:boolean}>>}
 */
async function fetchSurface(sessionId) {
  if (!sessionId) return []
  const now = Date.now()
  if (surfaceCache && surfaceCache.sessionId === sessionId && now - surfaceCache.at < SURFACE_TTL) {
    return surfaceCache.users
  }
  if (surfaceFetching === sessionId) return []
  surfaceFetching = sessionId
  try {
    const res = await rpc('list-surface', { sessionId })
    const items = (res.ok && res.value && Array.isArray(res.value.items)) ? res.value.items : []
    const users = items.filter((item) => item && item.role === 'user' && typeof item.seq === 'number')
    surfaceCache = { sessionId, at: now, users }
    return users
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

/** 注入单个删除按钮到操作行；行已注入且 seq 相同则跳过。 */
function injectDeleteButton(row, actions, seq) {
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
  btn.setAttribute('data-nio-del-role', 'user')
  btn.setAttribute('aria-label', '删除该消息')
  const tip = document.createElement('span')
  tip.className = 'nio-del-tip'
  tip.textContent = '删除该消息（含回复）'
  btn.appendChild(trashSvg.cloneNode(true))
  btn.appendChild(tip)
  btn.addEventListener('click', (e) => {
    e.stopPropagation()
    showDeleteConfirm(row, seq)
  })
  actions.appendChild(btn)
}

/** 把 DOM 消息行标记为「已删除」并隐藏；同时隐藏其后的大模型回复行。 */
function hideDeletedRegion(userRow) {
  userRow.classList.add('nio-del-hidden')
  // 隐藏其后直到下一条 user 消息之前的所有回复行（assistant-step / turn-tail）。
  let node = userRow.nextElementSibling
  while (node) {
    const kind = node.getAttribute && node.getAttribute('data-chat-flow-kind')
    if (kind === 'user') break
    node.classList.add('nio-del-hidden')
    node = node.nextElementSibling
  }
}

/** 恢复全部被隐藏的行并移除按钮（开关关闭 / 数据源变更时调用）。 */
function clearDeletedRegions() {
  for (const el of Array.from(document.querySelectorAll('.nio-del-hidden'))) el.classList.remove('nio-del-hidden')
}

/**
 * 按顺序把宿主端用户消息列表配对到 DOM 用户消息行：
 *  - deleted=true 的行 → 隐藏该行及其后回复（不注入按钮）；
 *  - 其余行 → 注入删除按钮。
 */
function applyDeleteButtons(sessionId, items) {
  if (!sessionId) return
  const users = Array.isArray(items) ? items : []
  const userRows = Array.from(document.querySelectorAll('[data-chat-flow-kind="user"]'))
  // 防御：宿主端只返回真实用户消息（source.kind==='user'），数量应与界面
  // 用户行一致；不一致说明数据源或渲染有偏差，宁可跳过本次配对也不错位。
  if (userRows.length !== users.length) {
    if (window.console) console.warn('[dsh-niao-quick-open] 用户消息列表与界面行数不一致（list=%d dom=%d），跳过注入', users.length, userRows.length)
    return
  }
  for (let i = 0; i < userRows.length; i += 1) {
    const row = userRows[i]
    const item = users[i]
    if (!item) continue
    if (item.deleted) {
      hideDeletedRegion(row)
    } else {
      row.classList.remove('nio-del-hidden')
      const actions = actionsRowOf(row)
      if (actions) injectDeleteButton(row, actions, item.seq)
    }
  }
}

/** 移除所有已注入的删除按钮（开关关闭时调用）。 */
function removeDeleteButtons() {
  for (const btn of Array.from(document.querySelectorAll('[data-nio-del]'))) btn.remove()
}

/**
 * 扫描并维护消息删除按钮与已删除行的隐藏。幂等：已注入且 seq 相同的行
 * 跳过；列表缓存过期 / 会话切换时重新拉取后配对。
 */
export function ensureDeleteButtons() {
  if (!pluginConfig.messageDelete) {
    removeDeleteButtons()
    clearDeletedRegions()
    return
  }
  if (!document.querySelector('[data-conversation-scroll]')) return
  const sessionId = currentSessionId()
  if (!sessionId) return
  const now = Date.now()
  if (surfaceCache && surfaceCache.sessionId === sessionId && now - surfaceCache.at < SURFACE_TTL) {
    applyDeleteButtons(sessionId, surfaceCache.users)
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

/** 弹出删除二次确认框；确认后执行删除并同步隐藏界面。 */
function showDeleteConfirm(row, seq) {
  if (deleteOverlay) closeDeleteOverlay()
  const sessionId = currentSessionId()
  if (!sessionId) {
    failOverlay('无法确定当前会话')
    return
  }
  const overlay = document.createElement('div')
  overlay.className = 'nio-confirm'
  overlay.setAttribute('data-nio-confirm', '1')
  const dialog = document.createElement('div')
  dialog.className = 'nio-confirm-dialog'
  dialog.setAttribute('role', 'dialog')
  dialog.setAttribute('aria-modal', 'true')
  const title = document.createElement('div')
  title.className = 'nio-confirm-title'
  title.textContent = '删除这条消息？'
  const desc = document.createElement('div')
  desc.className = 'nio-confirm-desc'
  desc.textContent = '将删除该消息及其后续回复，模型将不再记得这条对话内容。此操作不可恢复（模型视角）。'
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
        // 界面同步：隐藏该行及其后回复；清缓存，让下一次 scan 用
        // list-surface 的 deleted 标记重新对齐（刷新后依然隐藏）。
        hideDeletedRegion(row)
        surfaceCache = null
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
