/**
 * dsh-niao-quick-open — 浏览器端：单列表（flat）会话行三行布局增强。
 *
 * 「单列表」视图下（视图选项 → 分组方式 → 单列表），把原本单行的会话行
 * 加高改为三行布局：
 *  - 第一行：原生状态图标（有则显示，运行/等待/完成提醒）+ 工作区文件夹名
 *    chip + 行尾最后用户消息的相对时间；
 *  - 第二行：会话标题；
 *  - 第三行：浅色小字展示用户最后一条对话（压缩换行/空格、单行省略）。
 *
 * 预览数据来自宿主端 list-last-user-messages action，客户端 60s 缓存 +
 * 批量合并请求；hover 悬浮卡片在单列表下禁用（事件拦截 + CSS 兜底隐藏）。
 *
 * @module dsh-niao-quick-open/client/flat-list
 */

import { runtimeCtx } from './state.js'
import { rpc, setText, setAttr } from './utils.js'
import { sessionSnapshotRows, mapSessionRowsToIds } from './session-done.js'

/** 最后用户消息预览缓存：sessionId → { text, time, at }。 */
const lastMsgCache = new Map()
/** 预览缓存有效期（毫秒）：到期后重新向宿主端请求。 */
const LAST_MSG_TTL = 60000
/** 预览文本最大长度（字符）：超出截断，避免极端长文本撑破布局。 */
const PREVIEW_MAX_LEN = 300
/** 等待拉取的最后用户消息 sessionId 集合（合并并发 scan 的重复请求）。 */
const lastMsgPending = new Set()
/** 已在途请求中的 sessionId 集合（请求返回前不重复加入队列，防请求循环）。 */
const lastMsgInflight = new Set()
/** 是否已有一轮批量请求在途。 */
let lastMsgFetching = false

/** sessionId → 工作区标题 映射（单列表行第一行 chip 用）。 */
function workspaceTitleBySession() {
  const out = new Map()
  const workspaces = runtimeCtx ? runtimeCtx.get('workspaces') : undefined
  if (!workspaces) return out
  try {
    const items = workspaces.list.getSnapshot().items
    for (const w of items) {
      if (!w || !Array.isArray(w.sessionIds) || typeof w.title !== 'string' || !w.title) continue
      for (const sid of w.sessionIds) if (!out.has(sid)) out.set(sid, w.title)
    }
  } catch { /* 快照未就绪时返回空映射 */ }
  return out
}

/** 复刻原生行尾相对时间（刚刚 / 5分钟 / 3小时 / 2天 / 1个月 / 1年）。 */
function relativeTimeLabel(time, now) {
  const MIN = 60000
  const HOUR = 3600000
  const DAY = 86400000
  const diff = Math.max(0, now - time)
  if (diff < MIN) return '刚刚'
  if (diff < HOUR) return Math.floor(diff / MIN) + '分钟'
  if (diff < DAY) return Math.floor(diff / HOUR) + '小时'
  if (diff < 30 * DAY) return Math.floor(diff / DAY) + '天'
  if (diff < 365 * DAY) return Math.floor(diff / (30 * DAY)) + '个月'
  return Math.floor(diff / (365 * DAY)) + '年'
}

/** 预览文本：压缩全部空白（换行/多余空格 → 单个空格）并截断。 */
function normalizePreviewText(text) {
  const t = String(text || '').replace(/\s+/g, ' ').trim()
  return t.length > PREVIEW_MAX_LEN ? t.slice(0, PREVIEW_MAX_LEN) + '…' : t
}

/** 标记行内原生子元素（幂等）并返回 { slot, title, time, actions } 引用。 */
function markFlatRowChildren(row) {
  const kids = { slot: null, title: null, time: null, actions: null }
  for (const child of row.children) {
    const cls = child.className && typeof child.className === 'string' ? child.className : ''
    if (!kids.slot && cls.indexOf('slot') !== -1) { kids.slot = child; child.classList.add('nio-flat-slot'); continue }
    if (!kids.title && cls.indexOf('title') !== -1) { kids.title = child; child.classList.add('nio-flat-title'); continue }
    if (!kids.time && cls.indexOf('time') !== -1) { kids.time = child; child.classList.add('nio-flat-time'); continue }
    if (!kids.actions && cls.indexOf('rowActions') !== -1) { kids.actions = child; child.classList.add('nio-flat-actions'); continue }
  }
  return kids
}

/**
 * 阻断单列表（flat）会话行的 hover 悬浮卡片。
 *
 * 前几版无效的根因（React 18 事件系统）：
 *  - React 的 onPointerEnter 并非绑定原生 pointerenter——React 把
 *    pointerenter/pointerleave 归为「模拟事件」，实际在 root 容器上
 *    委托监听 pointerover/pointerout，用 relatedTarget 模拟 enter/leave；
 *  - pointerenter 是边界事件（传播路径只含目标元素），在任何祖先上
 *    监听 pointerenter 都收不到事件；监听 pointerover 又晚于 React 的
 *    root 捕获监听（root 在传播链上先于列表容器）。
 *
 * 正确做法：在 window 上注册【捕获阶段】pointerover 监听。捕获传播链
 * window → document → … → root(React 在此) → … → flat 行，window 最先
 * 执行；当目标是单列表内的会话行时 stopImmediatePropagation，React 的
 * root 监听器收不到 pointerover → onPointerEnter 不触发 → 卡片不打开。
 * 点击 / 拖拽 / CSS hover 不受影响（它们不依赖 pointerover 进入行）。
 */
let flatPointerGuardInstalled = false
export function installFlatPointerGuard() {
  if (flatPointerGuardInstalled) return
  flatPointerGuardInstalled = true
  window.addEventListener('pointerover', (e) => {
    const target = e.target
    if (!target || typeof target.closest !== 'function') return
    // 仅拦截「进入单列表会话行」的 pointerover：行在 flatList 内才拦，
    // 分组 / 搜索模式下的会话行（不在 flatList 内）保持原生 hover 卡片。
    if (!target.closest('[class*="sessionRow"]')) return
    if (!target.closest('[class*="flatList"]')) return
    e.stopImmediatePropagation()
  }, true)
}

/**
 * 兜底隐藏单列表模式下的会话 hover 悬浮卡片。
 *
 * 事件级拦截（installFlatPointerGuard）在不同 React 事件绑定方式下可能
 * 失效；此函数作为最终保障：React 通过 createPortal 把卡片渲染到 body
 * 后，检测到含 hoverContent 的卡片节点就加 nio-hide-card 类（display:none）。
 *
 * 关键安全点：只加类、绝不删除节点——删除 React 渲染的 portal 节点会让
 * React 卸载时找不到节点而异常，导致整个侧栏子树被卸载（此前列表消失
 * 的根因）。加 display:none 不影响 React 的卸载（节点仍在 DOM 中）。
 *
 * 只在 flatList 存在（单列表模式）时生效；卡片在 DOM 插入后、浏览器
 * 绘制前（MutationObserver microtask → rAF）被隐藏，用户看不到闪帧。
 */
export function hideFlatHoverCards() {
  if (!document.querySelector('[class*="flatList"]')) return
  const contents = document.querySelectorAll('[class*="hoverContent"]')
  for (const content of contents) {
    let el = content
    while (el && el !== document.body) {
      if (el.parentElement === document.body) {
        // 找到 portal 到 body 的卡片根（HoverCard 卡片 div 的直接挂载点）。
        if (!el.classList.contains('nio-hide-card')) el.classList.add('nio-hide-card')
        break
      }
      el = el.parentElement
    }
  }
}

/**
 * 修正单列表行「⋯」菜单的弹出位置。
 *
 * 位置不准确的原因：React Menu（portal 模式）的定位基于「⋯ 按钮」的
 * getBoundingClientRect（side=bottom, align=start → 按钮正下方左对齐）。
 * 三行布局把按钮固定在第二行（会话名称行）最右，按钮位于 82px 行的中部，
 * 菜单因此出现在行中部下方、遮挡第三行预览，视觉上悬空不贴边。
 *
 * 修复：菜单打开时，把 portal 菜单（body 下的 [role="menu"]）固定定位到
 * 会话行右侧垂直居中（贴近行右缘、不遮挡内容，仿 side="right"）。只改
 * style.left/top（不动 DOM 结构，React 卸载不受影响）。React 在 scroll/
 * resize 时用按钮 rect 重算位置，这里由 scan + 滚动监听持续覆盖保证稳定。
 */
let flatMenuScrollWired = false
export function fixFlatRowMenuPosition() {
  const list = document.querySelector('[class*="flatList"]')
  if (!list) return
  const openRows = list.querySelectorAll('[class*="sessionRow"][class*="menuOpen"]')
  if (openRows.length === 0) return
  // 可见的 portal 菜单（会话菜单 portal:true → body 直接子元素）。
  const menus = Array.from(document.querySelectorAll('body > [role="menu"]'))
    .filter((m) => m.offsetWidth > 0 || m.offsetHeight > 0)
  if (menus.length === 0) return
  // 首次调用时挂上滚动监听：滚动时 React 会重算位置，这里同步覆盖回行右侧。
  if (!flatMenuScrollWired) {
    flatMenuScrollWired = true
    window.addEventListener('scroll', () => {
      try { fixFlatRowMenuPosition() } catch { /* 忽略 */ }
    }, true)
  }
  const MARGIN = 8
  const vw = window.innerWidth
  const vh = window.innerHeight
  for (const row of openRows) {
    const rect = row.getBoundingClientRect()
    for (const menu of menus) {
      const lw = menu.offsetWidth || 160
      const lh = menu.offsetHeight || 120
      // 首选：行右侧垂直居中；右侧放不下 → 行左侧；仍放不下 → 视口内 clamp。
      let left = rect.right + MARGIN
      if (left + lw > vw - MARGIN) left = Math.max(MARGIN, rect.left - lw - MARGIN)
      let top = rect.top + (rect.height - lh) / 2
      top = Math.min(Math.max(top, MARGIN), vh - lh - MARGIN)
      if (menu.style.left !== left + 'px') menu.style.left = left + 'px'
      if (menu.style.top !== top + 'px') menu.style.top = top + 'px'
    }
  }
}

/**
 * 渲染（或更新）单个 flat 会话行为三行布局：
 * 第一行：原生状态图标（有则显示）+ 工作区 chip + 行尾最后用户消息时间；
 * 第二行会话标题（原生，grid 定位）；第三行最后用户消息预览（单行省略）。
 * info 为 null 时仅布局 + chip（预览/时间降级为原生内容）。
 * wsMap 为 sessionId → 工作区标题 映射（调用方构建一次，避免每行重复构建）。
 * 幂等：所有写入先比较再赋值，注入完成后不再产生 DOM 变化。
 */
function renderFlatRow(row, sessionId, info, wsMap) {
  row.setAttribute('data-nio-flat', '1')
  row.classList.add('nio-flat-row')
  const kids = markFlatRowChildren(row)

  // 第一行前置图标判定：
  //  - has-status：原生状态图标（运行/等待/完成提醒的状态点，slot 内有子元素）；
  //  - has-dot：会话待办圆点（空闲会话被标记时注入在行首）。
  // 有其一则图标占第一列、chip 后移一列；都没有则 chip 从第一列开始（不占位）。
  const hasStatus = !!(kids.slot && kids.slot.children.length > 0)
  const hasDot = !!row.querySelector('[data-nio-sdone]')
  row.classList.toggle('nio-flat-has-status', hasStatus)
  row.classList.toggle('nio-flat-has-dot', hasDot)

  // 第一行左侧：工作区名称（纯文本加粗，非 badge；选中态由 CSS 变亮色）
  let chip = row.querySelector('[data-nio-fchip]')
  if (!chip) {
    chip = document.createElement('span')
    chip.className = 'nio-fchip'
    chip.setAttribute('data-nio-fchip', '1')
    row.insertBefore(chip, kids.title || row.children[1] || null)
  }
  const wsTitle = (wsMap && wsMap.get(sessionId)) || ''
  setText(chip, wsTitle || '未分组')
  setAttr(chip, 'title', wsTitle)

  // 第三行：最后用户消息预览（单行省略）
  let preview = row.querySelector('[data-nio-fprev]')
  if (!preview) {
    preview = document.createElement('span')
    preview.className = 'nio-fprev'
    preview.setAttribute('data-nio-fprev', '1')
    row.appendChild(preview)
  }
  if (info) {
    setText(preview, normalizePreviewText(info.text))
    setAttr(preview, 'title', String(info.text || ''))
    // 第一行右侧：复用原生 time 元素显示最后用户消息的相对时间
    // （time 为 0 表示该会话无对话记录，保留原生 updatedAt 时间不覆盖）
    if (info.time > 0) {
      const timeEl = row.querySelector('[class*="time"]')
      if (timeEl) setText(timeEl, relativeTimeLabel(info.time, Date.now()))
    }
  } else {
    setText(preview, '')
    setAttr(preview, 'title', '')
  }
}

/** 批量拉取 pending 的最后用户消息：填充缓存后更新对应行。 */
async function fetchLastMessages() {
  if (lastMsgFetching) return
  lastMsgFetching = true
  const ids = [...lastMsgPending].slice(0, 100)
  lastMsgPending.clear()
  if (ids.length === 0) { lastMsgFetching = false; return }
  for (const id of ids) lastMsgInflight.add(id)
  try {
    const res = await rpc('list-last-user-messages', { sessionIds: ids })
    const now = Date.now()
    const items = res.ok && res.value && Array.isArray(res.value.items) ? res.value.items : []
    for (const item of items) {
      if (!item || typeof item.sessionId !== 'string') continue
      lastMsgCache.set(item.sessionId, {
        text: String(item.text || ''),
        time: typeof item.time === 'number' ? item.time : now,
        at: now,
      })
    }
    // 未返回的会话（无对话记录）：写入空缓存，避免反复请求。
    for (const id of ids) {
      if (!lastMsgCache.has(id)) lastMsgCache.set(id, { text: '', time: 0, at: now })
    }
    // 更新受影响的行（React 可能尚未重建，直接重扫一遍 flat 列表）。
    const list = document.querySelector('[class*="flatList"]')
    if (list) {
      const rows = Array.from(list.querySelectorAll('[class*="sessionRow"]'))
      const idByRow = mapSessionRowsToIds(rows)
      const wsMap = workspaceTitleBySession()
      for (const row of rows) {
        const sessionId = idByRow.get(row)
        if (!sessionId) continue
        const cached = lastMsgCache.get(sessionId)
        if (cached) renderFlatRow(row, sessionId, cached, wsMap)
      }
    }
  } catch {
    // 请求失败：写入空缓存（复用 TTL），避免失败后每帧重复请求。
    const now = Date.now()
    for (const id of ids) {
      if (!lastMsgCache.has(id)) lastMsgCache.set(id, { text: '', time: 0, at: now })
    }
  } finally {
    for (const id of ids) lastMsgInflight.delete(id)
    lastMsgFetching = false
    if (lastMsgPending.size > 0) fetchLastMessages()
  }
}

/**
 * 维护单列表（flat）模式下的会话行三行布局。
 * 仅当视图切到「单列表」（flatList 容器存在）时生效；分组/搜索模式下不注入。
 * 在途请求（lastMsgInflight）的会话不重复加入队列，避免请求返回后立即重发形成循环。
 */
export function ensureFlatEnhance() {
  const list = document.querySelector('[class*="flatList"]')
  if (!list) return
  const rows = Array.from(list.querySelectorAll('[class*="sessionRow"]'))
  if (rows.length === 0) return
  const idByRow = mapSessionRowsToIds(rows)
  const stateById = new Map(sessionSnapshotRows().map((s) => [s.id, s]))
  const wsMap = workspaceTitleBySession()
  const now = Date.now()
  for (const row of rows) {
    const sessionId = idByRow.get(row)
    if (!sessionId) continue
    // 新会话占位行（blank）没有对话内容，不改造。
    const s = stateById.get(sessionId)
    if (s && s.blank) continue
    const cached = lastMsgCache.get(sessionId)
    if (cached && now - cached.at <= LAST_MSG_TTL) {
      renderFlatRow(row, sessionId, cached, wsMap)
    } else if (!lastMsgInflight.has(sessionId)) {
      lastMsgPending.add(sessionId)
      renderFlatRow(row, sessionId, null, wsMap)
    } else {
      // 在途请求尚未返回：先按无缓存渲染布局，返回后再补内容。
      renderFlatRow(row, sessionId, null, wsMap)
    }
  }
  if (lastMsgPending.size > 0) fetchLastMessages()
}
