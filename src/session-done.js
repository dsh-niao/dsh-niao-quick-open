/**
 * dsh-niao-quick-open — 浏览器端：会话待办标记。
 *
 * 在空闲会话行前注入可点击的标记圆点（hover 浅灰点「设为待办」，
 * 点击变绿「已完成」，复刻原生 done 状态点样式）；切换会话自动取消
 * 待办。状态存浏览器 localStorage（不占配置，避免触发重启横幅）。
 * 受配置「会话待办标记」开关控制。
 *
 * @module dsh-niao-quick-open/client/session-done
 */

import { DONE_IDS_KEY } from './constants.js'
import { pluginConfig, runtimeCtx } from './state.js'
import { registerUIApply } from './config.js'
import { setText, setAttr } from './utils.js'

/** 读取已标记「已完成」的会话 id 数组（浏览器缓存）。 */
function readDoneIds() {
  try {
    const raw = window.localStorage.getItem(DONE_IDS_KEY)
    const parsed = raw ? JSON.parse(raw) : null
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === 'string') : []
  } catch { return [] }
}

/** 写入浏览器缓存（整体替换，保持最小体积）。 */
function writeDoneIds(ids) {
  try { window.localStorage.setItem(DONE_IDS_KEY, JSON.stringify(ids)) } catch { /* 存储不可用 */ }
}

/** 用户已标记为「已完成」的会话 id 集合（从浏览器缓存读取）。 */
function doneSessionIdSet() {
  return new Set(readDoneIds())
}

/**
 * 标记 / 取消标记会话为「已完成」。直接存浏览器缓存（localStorage），
 * 不走宿主端 set-config —— 不产生「需要重启才能生效」的配置修改；
 * 取消标记时从缓存中移除该 id，避免缓存累积。
 */
export function setSessionDone(id, done) {
  const ids = readDoneIds()
  const set = new Set(ids)
  if (done) set.add(id)
  else set.delete(id)
  writeDoneIds([...set])
  try { ensureSessionDoneDots() } catch { /* 会话区未就绪时忽略 */ }
}

/** 会话快照（会话行注入的数据来源）：返回会话数组，含 id/displayTitle/running/pendingInteraction/completed/blank。 */
export function sessionSnapshotRows() {
  const sessions = runtimeCtx ? runtimeCtx.get('sessions') : undefined
  if (!sessions) return []
  try {
    const snapshot = sessions.list.getSnapshot()
    const byId = snapshot && snapshot.byId ? snapshot.byId : {}
    const ids = snapshot && Array.isArray(snapshot.ids) ? snapshot.ids : []
    const out = []
    for (const id of ids) {
      const s = byId[id]
      if (!s) continue
      out.push({
        id,
        displayTitle: typeof s.displayTitle === 'string' ? s.displayTitle : '',
        running: !!s.running,
        pending: !!s.pendingInteraction,
        completed: !!s.completed,
        blank: !!s.blank,
      })
    }
    return out
  } catch { return [] }
}

/** 根据行 DOM 解析标题（会话行的 title span 文本）。 */
export function sessionRowTitle(row) {
  const titleEl = row.querySelector('[class*="title"]')
  return ((titleEl ? titleEl.textContent : row.textContent) || '').trim()
}

/** 会话行 → sessionId 映射：行数与会话数一致时按序配对，否则按标题配对（同标题按出现序）。 */
export function mapSessionRowsToIds(rows) {
  const sessions = sessionSnapshotRows()
  const out = new Map()
  if (sessions.length === 0 || rows.length === 0) return out
  if (rows.length === sessions.length) {
    for (let i = 0; i < rows.length; i++) out.set(rows[i], sessions[i].id)
    return out
  }
  // 标题配对：构建 title → [id] 队列，按行顺序取用。
  const byTitle = new Map()
  for (const s of sessions) {
    const key = s.displayTitle || s.id
    const list = byTitle.get(key) || []
    list.push(s.id)
    byTitle.set(key, list)
  }
  for (const row of rows) {
    const title = sessionRowTitle(row)
    if (!title) continue
    const candidates = byTitle.get(title)
    if (!candidates || candidates.length === 0) continue
    out.set(row, candidates.shift())
  }
  return out
}

/** 会话是否处于空闲（原生无状态点、可被标记）：非运行、非等待、非空会话。 */
export function isIdleSession(s) {
  return !s.running && !s.pending && !s.completed && !s.blank
}

/** 最近一次已执行「打开自动取消待办」的会话 id（防止同一 current 重复清理）。 */
let lastClearedSessionId = null

/** 会话切换为当前时，自动取消其待办标记（语义：正在看的会话不再是待办）。 */
export function clearDoneOnOpen() {
  const sessions = runtimeCtx ? runtimeCtx.get('sessions') : undefined
  if (!sessions) return
  let current = null
  try { current = sessions.list.getSnapshot().current || null } catch { return }
  if (!current || current === lastClearedSessionId) return
  lastClearedSessionId = current
  if (doneSessionIdSet().has(current)) setSessionDone(current, false)
}

/** 原生状态圆点类名（如 _dot_10orb_3）：动态获取并缓存，样式/阴影/outline 与原生完全一致。 */
let nativeDotClass = ''

/** 从页面已渲染的原生状态点取类名（用户/运行/已完成会话的圆点均可）。 */
function findNativeDotClass() {
  if (nativeDotClass) return nativeDotClass
  try {
    const el = document.querySelector('span[data-state]')
    if (el && el.className && typeof el.className === 'string') nativeDotClass = el.className
  } catch { /* 忽略 */ }
  return nativeDotClass
}

/** 维护会话行前的待办/完成标记圆点；配置关闭时移除全部。幂等。 */
export function ensureSessionDoneDots() {
  // 配置开关：关闭时清理所有已注入的圆点。
  const injected = document.querySelectorAll('[data-nio-sdone]')
  if (!pluginConfig.sessionDoneMark) {
    for (const el of injected) el.remove()
    return
  }
  const marked = doneSessionIdSet()
  const rows = Array.from(document.querySelectorAll('[class*="sessionRow"]'))
  const idByRow = mapSessionRowsToIds(rows)
  const stateById = new Map(sessionSnapshotRows().map((s) => [s.id, s]))
  const nativeClass = findNativeDotClass()

  for (const row of rows) {
    const existing = row.querySelector('[data-nio-sdone]')
    const sessionId = idByRow.get(row)
    if (!sessionId) {
      // 无法解析 id：移除已注入的（避免悬空），下次 scan 再试。
      if (existing) existing.remove()
      continue
    }
    const s = stateById.get(sessionId)
    const userMarked = marked.has(sessionId)
    // 仅对「空闲」会话显示圆点（已标记→绿点常显；未标记→hover 浅灰点）；
    // 运行 / 等待 / 原生 completed 会话由原生状态点表达，不覆盖。
    const idle = s ? isIdleSession(s) : false
    if (!idle) {
      if (existing) existing.remove()
      continue
    }
    // 原生状态点 slot：会话行的第一个 slot 子元素（16×20 flex 居中）。
    // 空闲会话的原生 slot 是空的（showStatus=false），把圆点塞进 slot 内部，
    // 复用其固有 16px 占位 → 不产生额外空间、标题不偏移。
    let slot = null
    for (const child of row.children) {
      if (child.classList && child.className.toString().includes('slot')) { slot = child; break }
    }
    // 圆点归属位置（按「三行结构」）：
    //  - 单列表（flat）行且「单列表增强样式」开启：圆点必须属于第一行
    //    容器 nio-flat-line1（与工作区名称同组，属于第一行左侧）。容器由
    //    ensureFlatEnhance 创建（scan 中它在本函数之后执行），若本轮尚未
    //    创建则跳过注入，下一轮容器就绪后补入 —— 避免圆点平铺在行级。
    //  - 增强样式关闭 / 分组/搜索行：塞进原生 slot（复用占位），无 slot
    //    则插行首（原生风格）。
    const inFlat = !!row.closest('[class*="flatList"]') && !!pluginConfig.flatListStyle
    const line1 = row.querySelector('[data-nio-flat-line1]')
    const placeDot = (dotEl) => {
      if (inFlat) {
        if (!line1) return false
        if (dotEl.parentElement !== line1) line1.insertBefore(dotEl, line1.firstChild)
      } else if (slot) {
        if (dotEl.parentElement !== slot) slot.appendChild(dotEl)
      } else if (dotEl.parentElement !== row) {
        row.insertBefore(dotEl, row.firstChild)
      }
      return true
    }
    if (inFlat && !line1) {
      // flat 行容器尚未就绪：移除可能残留的行级圆点，等待下一轮补入。
      if (existing) existing.remove()
      continue
    }
    if (existing) {
      // 状态可能变化（标记 ↔ 未标记），刷新类名与提示。
      // 若行解析到的 id 与圆点上记录的 id 不一致，说明配对漂移：
      // 以圆点记录的 id 为准，避免误操作（点击处理用 dataset）。
      if (existing.dataset.nioSid && existing.dataset.nioSid !== sessionId) {
        existing.remove()
        continue
      }
      // 位置校正：flat 行圆点必须位于 line1 内（修复历史平铺残留）。
      placeDot(existing)
      // 幂等刷新（值相同不赋值）：textContent 即使设置相同值也会重写
      // 子节点、触发 childList mutation，进而再次触发 MutationObserver →
      // scan → 本函数，形成自激循环（运行中会话时观察到的频繁闪烁）。
      // setText/setAttr 值相同直接跳过，无 DOM 变化则循环断开。
      existing.classList.toggle('nio-sdone-marked', userMarked)
      setAttr(existing, 'aria-label', userMarked ? '已完成' : '设为待办')
      const tip = existing.querySelector('.nio-sdone-tip')
      if (tip) setText(tip, userMarked ? '已完成' : '设为待办')
      continue
    }
    // 若 slot 已含原生状态点（非空闲但判定有误的兜底），不覆盖。
    if (slot && slot.querySelector('[data-state]')) continue
    // 注入圆点：结构复刻原生 slot（16×20 flex 居中 + 10px 圆点 + 隐藏文本）。
    // 内层圆点直接挂原生状态点类名（如 _dot_10orb_3），原生规则（尺寸/阴影/
    // outline/transition）原样生效，仅用我们的类覆盖背景颜色。
    const dot = document.createElement('button')
    dot.type = 'button'
    dot.className = 'nio-sdone' + (userMarked ? ' nio-sdone-marked' : '')
    dot.setAttribute('data-nio-sdone', '1')
    dot.setAttribute('data-nio-sid', sessionId)
    dot.setAttribute('aria-label', userMarked ? '已完成' : '设为待办')
    const inner = document.createElement('span')
    inner.className = (nativeClass ? nativeClass + ' ' : '') + 'nio-sdone-dot'
    inner.style.width = '10px'
    inner.style.height = '10px'
    const vh = document.createElement('span')
    vh.className = 'nio-sdone-vh'
    vh.textContent = userMarked ? '已完成' : '设为待办'
    const tip = document.createElement('span')
    tip.className = 'nio-sdone-tip'
    tip.textContent = userMarked ? '已完成' : '设为待办'
    dot.appendChild(inner)
    dot.appendChild(vh)
    dot.appendChild(tip)
    dot.addEventListener('click', (e) => {
      e.stopPropagation()
      // 以圆点记录的 id 为准（不依赖重扫配对），点击即切换标记。
      const sid = dot.dataset.nioSid || sessionId
      const nowMarked = doneSessionIdSet().has(sid)
      setSessionDone(sid, !nowMarked)
    })
    // 按归属位置放置圆点（见 placeDot 注释）；flat 行且无 line1 已在上面 continue。
    placeDot(dot)
  }
}

/** 配置「会话待办标记」开关变化时重建圆点。 */
registerUIApply(() => { try { ensureSessionDoneDots() } catch { /* 会话区未就绪时忽略 */ } })
