/**
 * dsh-niao-quick-open — 浏览器端：工作区栏头部视图切换增强。
 *
 * 「工作区栏头部增强」开关（headerViewSwitches）开启后，对工作区/会话
 * 列表头部（搜索、分组方式、排序方式、新增项目所在行）做图标调整：
 *  - 隐藏原生「分组方式+排序方式」悬浮弹窗图标（ViewOptionsMenu 按钮）；
 *  - 新增两个切换图标：
 *      分组方式：默认「按工作区」，点击切换为「单列表」（再点切回）；
 *      排序方式：默认「最新更新」，点击切换为「手动排序」（再点切回）；
 *  - hover 悬浮提示与其他图标一致，文案「当前为xxx，点击后切换为xxx」。
 *
 * 状态切换复用原生路径：ViewOptionsMenu 的菜单项 onSelect 调 store 的
 * setGroupBy / setOrderBy（React 状态持久化到 localStorage
 * dsh.workspace.view.v5）。本模块打开菜单 → 在菜单绘制前隐藏
 * （nio-hide-menu，microtask 窗口）→ 点击目标菜单项 → 菜单在隐藏状态
 * 卸载、视图即时切换，无菜单闪现。当前模式从 localStorage view store
 * 读取（fallback DOM 推断）。
 *
 * @module dsh-niao-quick-open/client/header-view-switches
 */

import { pluginConfig } from './state.js'
import { registerUIApply } from './config.js'
import { setText } from './utils.js'

/** 视图 store 的 localStorage 键（与 dsh-client-ui-workspace 的 persist 一致）。 */
const VIEW_STORE_KEY = 'dsh.workspace.view.v5'

/** 当前界面是否中文（tooltip 文案随语言）。 */
function isZh() {
  try { return !(document.documentElement.lang || '').startsWith('en') } catch { return true }
}

/** 当前分组/排序模式：从 localStorage view store 读取，失败时 DOM 推断。 */
function viewState() {
  try {
    const raw = window.localStorage.getItem(VIEW_STORE_KEY)
    if (raw) {
      const s = JSON.parse(raw)
      return {
        groupBy: s && s.groupBy === 'flat' ? 'flat' : 'workspace',
        orderBy: s && s.orderBy === 'manual' ? 'manual' : 'updated',
      }
    }
  } catch { /* 存储不可用：走 DOM 推断 */ }
  return {
    groupBy: document.querySelector('[class*="flatList"]') ? 'flat' : 'workspace',
    orderBy: 'updated',
  }
}

/** 分组/排序的显示名（zh/en）。 */
function modeLabel(kind, mode) {
  const zh = isZh()
  if (kind === 'groupBy') return mode === 'flat' ? (zh ? '单列表' : 'In one list') : (zh ? '按工作区' : 'WorkSpace')
  return mode === 'manual' ? (zh ? '手动排序' : 'Manual') : (zh ? '最新更新' : 'Last updated')
}

/** 分组/排序的切换目标菜单项文本（zh/en，与原生菜单项一致）。 */
function targetItemText(kind, mode) {
  const zh = isZh()
  if (kind === 'groupBy') return mode === 'flat' ? (zh ? '按工作区' : 'WorkSpace') : (zh ? '单列表' : 'In one list')
  return mode === 'manual' ? (zh ? '最新更新' : 'Last updated') : (zh ? '手动排序' : 'Manual')
}

/** 找到原生「视图选项」（分组+排序悬浮弹窗）按钮。
 *  优先精确匹配 aria-label（视图选项 / View options）；
 *  fallback 用 wide 类（仅 viewOptions 按钮有 qDHVXG_wide），
 *  并排除「新增项目」按钮（aria-label 添加工作区/Add workspace）。 */
function findViewOptionsButton() {
  const btns = document.querySelectorAll('[class*="headerActions"] button')
  const want = isZh() ? '视图选项' : 'View options'
  const addLabels = isZh() ? ['添加工作区'] : ['Add workspace', 'Add workspace…']
  for (const b of btns) {
    const label = b.getAttribute('aria-label') || ''
    if (label === want) return b
  }
  for (const b of btns) {
    const label = b.getAttribute('aria-label') || ''
    if (addLabels.includes(label)) continue
    // wide 类（qDHVXG_wide）：viewOptions 按钮独有（新增项目按钮无）。
    if (b.className && b.className.toString().indexOf('wide') !== -1) return b
  }
  return null
}

/** 找到「工作区/会话列表头部」操作容器（headerActions）。 */
function findHeaderActions() {
  const vob = findViewOptionsButton()
  return vob ? vob.closest('[class*="headerActions"]') : document.querySelector('[class*="headerActions"]')
}

/** 在文档中找文本匹配的菜单项（menuitem）。 */
function findMenuItemByText(text) {
  const menus = document.querySelectorAll('[role="menu"]')
  for (const menu of menus) {
    const items = menu.querySelectorAll('[role="menuitem"]')
    for (const item of items) {
      if ((item.textContent || '').trim() === text) return item
    }
  }
  return null
}

/** 派发一次合成 click（React 合成监听可接收）。 */
function syntheticClick(el) {
  el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }))
}

/**
 * 打开原生视图选项菜单，在绘制前隐藏并点击目标菜单项（零闪现切换）。
 * @param targetKind - 'groupBy' 或 'orderBy'
 * @param targetText - 目标菜单项文本（zh/en）
 * 注意：菜单在打开瞬间（React commit 后）菜单项会因「初始 selected 状态
 * 重新渲染」而短暂重建，立即查找可能命中【旧选中项】。为避免点错，先
 * 等待一个稳定帧（requestAnimationFrame×2）再查找并点击。
 */
function pickMenuOption(targetKind, targetText) {
  const btn = findViewOptionsButton()
  if (!btn) return
  let done = false
  let observer = null
  const finish = (menu) => {
    if (done) return
    // 严格校验：目标菜单项必须真的存在且属于 kind 对应的菜单（防点错）。
    const item = findMenuItemByText(targetText)
    if (!item) return
    done = true
    if (observer) observer.disconnect()
    if (menu && menu.isConnected) menu.classList.add('nio-hide-menu')
    syntheticClick(item)
    window.setTimeout(() => { if (menu && menu.isConnected) menu.classList.remove('nio-hide-menu') }, 1000)
  }
  // 等待菜单稳定：两次 rAF 后再查找（避开菜单打开瞬间的选中态重渲染）。
  let settled = false
  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => { settled = true })
  })
  try {
    observer = new MutationObserver(() => {
      if (!settled) return
      const item = findMenuItemByText(targetText)
      if (item) finish(item.closest('[role="menu"]'))
    })
    observer.observe(document.body, { childList: true, subtree: true })
  } catch { observer = null }
  syntheticClick(btn) // 打开菜单（setOpen(true)）
  // 稳定后立即尝试一次。
  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => {
      const item = findMenuItemByText(targetText)
      if (item) finish(item.closest('[role="menu"]'))
    })
  })
  let tries = 0
  const timer = window.setInterval(() => {
    tries += 1
    if (done || tries > 40) { window.clearInterval(timer); if (observer) observer.disconnect(); return }
    if (!settled) return
    const item = findMenuItemByText(targetText)
    if (item) finish(item.closest('[role="menu"]'))
  }, 50)
}

/**
 * 维护头部视图切换图标：开关开启时隐藏原生悬浮弹窗按钮、注入两个切换
 * 图标（分组方式 / 排序方式）；关闭时恢复原生并移除注入。幂等。
 */
export function ensureHeaderViewSwitches() {
  const actions = findHeaderActions()
  const vob = findViewOptionsButton()
  if (!pluginConfig.headerViewSwitches) {
    // 恢复原生悬浮弹窗按钮，移除注入图标与容器放宽。
    if (vob) vob.style.display = ''
    const actions = findHeaderActions()
    if (actions) actions.classList.remove('nio-hv-actions')
    const injected = document.querySelectorAll('[data-nio-hvswitch]')
    for (const el of injected) el.remove()
    return
  }
  if (!actions || !vob) return
  // 隐藏原生「分组方式+排序方式」悬浮弹窗按钮。
  // 用 inline style（React 不管理此按钮的 style prop → 重渲染不会重置），
  // 比 classList 稳定：class 会被 React 重渲染时重置（原来图标闪消失的原因）。
  vob.style.display = 'none'
  // 放宽容器宽度：原生 headerActions max-width:60px + overflow:hidden
  // 只能容纳 2 个按钮（视图选项+新增项目）；注入 2 个新按钮后总宽超出
  // 会被 overflow 裁剪（原图标消失、新图标看不见的根因）。
  actions.classList.add('nio-hv-actions')
  // 注入两个切换图标（幂等：已存在则仅刷新提示文案）。
  if (!actions.querySelector('[data-nio-hvswitch]')) {
    const zh = isZh()
    const st = viewState()
    // 初始提示文案（当前为xxx，点击后切换为xxx）。
    const tipTextFor = (kind, mode) => zh
      ? `当前为${modeLabel(kind, mode)}，点击后切换为${modeLabel(kind, mode === (kind === 'groupBy' ? 'flat' : 'manual') ? (kind === 'groupBy' ? 'workspace' : 'updated') : (kind === 'groupBy' ? 'flat' : 'manual'))}`
      : `Now ${modeLabel(kind, mode)}, click to switch to ${modeLabel(kind, mode === (kind === 'groupBy' ? 'flat' : 'manual') ? (kind === 'groupBy' ? 'workspace' : 'updated') : (kind === 'groupBy' ? 'flat' : 'manual'))}`
    const mkBtn = (key, iconSvg, aria) => {
      const kind = key === 'groupBy' ? 'groupBy' : 'orderBy'
      const btn = document.createElement('button')
      btn.type = 'button'
      btn.className = 'nio-hvswitch'
      btn.setAttribute('data-nio-hvswitch', key)
      btn.setAttribute('aria-label', aria)
      const tip = document.createElement('span')
      tip.className = 'nio-hvswitch-tip'
      // 立即写入初始提示文本（不依赖后续 scan 的 setText，杜绝空提示）。
      tip.textContent = tipTextFor(kind, st[kind])
      // title 属性兜底：浏览器原生提示一定显示（即使 span 样式被干扰）。
      btn.title = tip.textContent
      btn.appendChild(iconSvg.cloneNode(true))
      btn.appendChild(tip)
      btn.addEventListener('click', (e) => {
        e.stopPropagation()
        const cur = viewState()
        pickMenuOption(kind, targetItemText(kind, cur[kind]))
      })
      return btn
    }
    const groupBtn = mkBtn('groupBy', groupBySvg, zh ? '切换分组方式' : 'Toggle grouping')
    const orderBtn = mkBtn('orderBy', orderBySvg, zh ? '切换排序方式' : 'Toggle sorting')
    // 插入位置：vob（视图选项按钮）在 Menu root span 内，span 才是
    // headerActions 的直接子元素。insertBefore 的 reference node 必须是
    // 父元素的直接子元素，直接传 vob 会抛 NotFoundError（按钮从未插入）。
    const refNode = vob.parentElement || vob
    if (actions.contains(refNode)) {
      actions.insertBefore(orderBtn, refNode)
      actions.insertBefore(groupBtn, refNode)
    } else {
      actions.appendChild(orderBtn)
      actions.appendChild(groupBtn)
    }
  }
  // 刷新提示文案（当前为xxx，点击后切换为xxx）。幂等写入：值相同不赋值，
  // 避免每次 scan 重写 textContent 触发 MutationObserver 自激循环。
  // 同时同步按钮 title（浏览器原生提示兜底）。
  const st = viewState()
  const zh = isZh()
  const groupTip = actions.querySelector('[data-nio-hvswitch="groupBy"] .nio-hvswitch-tip')
  const orderTip = actions.querySelector('[data-nio-hvswitch="orderBy"] .nio-hvswitch-tip')
  const groupBtn = actions.querySelector('[data-nio-hvswitch="groupBy"]')
  const orderBtn = actions.querySelector('[data-nio-hvswitch="orderBy"]')
  const groupText = zh
    ? `当前为${modeLabel('groupBy', st.groupBy)}，点击后切换为${modeLabel('groupBy', st.groupBy === 'flat' ? 'workspace' : 'flat')}`
    : `Now ${modeLabel('groupBy', st.groupBy)}, click to switch to ${modeLabel('groupBy', st.groupBy === 'flat' ? 'workspace' : 'flat')}`
  const orderText = zh
    ? `当前为${modeLabel('orderBy', st.orderBy)}，点击后切换为${modeLabel('orderBy', st.orderBy === 'manual' ? 'updated' : 'manual')}`
    : `Now ${modeLabel('orderBy', st.orderBy)}, click to switch to ${modeLabel('orderBy', st.orderBy === 'manual' ? 'updated' : 'manual')}`
  setText(groupTip, groupText)
  setText(orderTip, orderText)
  if (groupBtn && groupBtn.title !== groupText) groupBtn.title = groupText
  if (orderBtn && orderBtn.title !== orderText) orderBtn.title = orderText
}

/** 配置「工作区栏头部增强」开关变化时重建头部图标。 */
registerUIApply(() => { try { ensureHeaderViewSwitches() } catch { /* header 未就绪时静默跳过 */ } })

/* ------------------------------------------------------------------ */
/* 图标（16×16 stroke 风格，与 header 图标同一视觉）                     */
/* ------------------------------------------------------------------ */

/** 分组方式图标：分层列表（树）结构，表示分组/层级。 */
const groupBySvg = (() => {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svg.setAttribute('width', '16')
  svg.setAttribute('height', '16')
  svg.setAttribute('viewBox', '0 0 16 16')
  svg.setAttribute('fill', 'none')
  svg.setAttribute('stroke', 'currentColor')
  svg.setAttribute('stroke-width', '1.5')
  svg.setAttribute('stroke-linecap', 'round')
  svg.setAttribute('stroke-linejoin', 'round')
  const p = (d) => {
    const el = document.createElementNS('http://www.w3.org/2000/svg', 'path')
    el.setAttribute('d', d)
    svg.appendChild(el)
  }
  p('M2.5 3h11')   // 第一行横线
  p('M2.5 8h8')    // 第二行横线
  p('M2.5 13h5')   // 第三行横线
  p('M6.5 3v10')   // 左侧竖线（树）
  return svg
})()

/** 排序方式图标：上下箭头，表示排序。 */
const orderBySvg = (() => {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svg.setAttribute('width', '16')
  svg.setAttribute('height', '16')
  svg.setAttribute('viewBox', '0 0 16 16')
  svg.setAttribute('fill', 'none')
  svg.setAttribute('stroke', 'currentColor')
  svg.setAttribute('stroke-width', '1.5')
  svg.setAttribute('stroke-linecap', 'round')
  svg.setAttribute('stroke-linejoin', 'round')
  const p = (d) => {
    const el = document.createElementNS('http://www.w3.org/2000/svg', 'path')
    el.setAttribute('d', d)
    svg.appendChild(el)
  }
  p('M5 2v12')     // 中心竖线
  p('M5 2L2.5 5')  // 上箭头
  p('M5 2l2.5 3')
  p('M11 14V2')    // 右竖线
  p('M11 14l-2.5-3')
  p('M11 14l2.5-3')
  return svg
})()
