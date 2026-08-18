/**
 * dsh-niao-quick-open — 浏览器端：会话双击重命名。
 *
 * 双击侧边栏会话列表中的「会话名称」，直接弹出原生「重命名会话」编辑
 * 弹窗（等价于点击会话悬浮菜单中的「重命名」），且不经过「先弹出悬浮
 * 菜单」的中间步骤。
 *
 * 为什么不能直接调用弹窗方法：onRename（setSessionRenameTarget）是
 * WorkspaceBrowser 组件内的闭包，外部拿不到引用；它只在 ⋯ 菜单项的
 * onSelect('rename') 时被调用。因此必须通过 React 事件链触发。
 *
 * 如何省去菜单闪现：点 ⋯ 按钮（setMenuOpen(true)）后，用一个
 * MutationObserver 在【菜单节点插入 body 的 microtask】中同步执行：
 *  1. 给菜单加 nio-hide-menu（display:none）——DOM 已插入但浏览器尚未
 *     绘制，菜单不可见；
 *  2. 点击「重命名 / Rename」菜单项 → onSelect('rename') → onRename →
 *     setMenuOpen(false) + setSessionRenameTarget 同批 commit：菜单在
 *     隐藏状态下被卸载、重命名弹窗直接出现。
 * 视觉结果：双击标题 → 直接弹出重命名弹窗，无菜单闪现。
 *
 * 仅当「单列表增强样式」开启且位于 flatList 内拦截会话行；
 * 分组/搜索模式的会话行双击不拦截（保留原生行为）。
 *
 * @module dsh-niao-quick-open/client/dblclick-rename
 */

import { pluginConfig } from './state.js'

/** 是否已安装双击监听（全局一次性）。 */
let dblclickRenameInstalled = false

/** 在文档中找「重命名 / Rename」菜单项（会话悬浮菜单项）。 */
function findRenameMenuItem() {
  const menus = document.querySelectorAll('[role="menu"]')
  for (const menu of menus) {
    const items = menu.querySelectorAll('[role="menuitem"]')
    for (const item of items) {
      const text = (item.textContent || '').trim()
      if (text === '重命名' || text === 'Rename') return item
    }
  }
  return null
}

/** 派发一次合成 click（React 合成监听可接收）。 */
function syntheticClick(el) {
  el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }))
}

/**
 * 触发某会话行的「重命名」，菜单在可见前被隐藏：
 * 点 ⋯ 按钮打开菜单 → MutationObserver 在菜单插入的 microtask 中
 * 隐藏菜单并点击「重命名」项 → 弹窗直接弹出（无菜单闪现）。
 */
function triggerRowRename(row) {
  if (!row || !row.isConnected) return
  const btn = row.querySelector('[class*="rowActions"] [class*="iconButton"]')
  if (!btn) return
  let done = false
  const finish = (menu) => {
    if (done) return
    const item = findRenameMenuItem()
    if (!item) return
    done = true
    if (observer) observer.disconnect()
    if (menu && menu.isConnected) menu.classList.add('nio-hide-menu') // 隐藏（绘制前）
    syntheticClick(item) // 点「重命名」→ onSelect('rename') → onRename → 弹窗
    // 兜底：若菜单未被 React 卸载，延迟移除隐藏类（避免永久隐藏残留）。
    window.setTimeout(() => { if (menu && menu.isConnected) menu.classList.remove('nio-hide-menu') }, 1000)
  }
  let observer = null
  try {
    observer = new MutationObserver(() => {
      const item = findRenameMenuItem()
      if (item) finish(item.closest('[role="menu"]'))
    })
    observer.observe(document.body, { childList: true, subtree: true })
  } catch { observer = null }
  syntheticClick(btn) // 打开 ⋯ 菜单（setMenuOpen(true)）
  // 菜单可能已在 DOM（复用/未卸载）：立即尝试一次。
  const existingItem = findRenameMenuItem()
  if (existingItem) finish(existingItem.closest('[role="menu"]'))
  // 兜底轮询：2s 超时，避免 observer 漏触发时永久等待。
  let tries = 0
  const timer = window.setInterval(() => {
    tries += 1
    if (done || tries > 40) { window.clearInterval(timer); if (observer) observer.disconnect(); return }
    const item = findRenameMenuItem()
    if (item) finish(item.closest('[role="menu"]'))
  }, 50)
}

/** 全局双击监听：命中会话列表行内的会话名称则触发重命名。 */
function onDblClick(e) {
  const target = e.target
  if (!target || typeof target.closest !== 'function') return
  // 双击的元素必须在「会话名称」内（title 元素或其子节点）。
  const title = target.closest('[class*="title"]')
  if (!title) return
  const row = title.closest('[class*="sessionRow"]')
  if (!row) return
  // 仅单列表增强样式开启且位于 flatList 内拦截；分组/搜索行保留原生行为。
  if (!row.closest('[class*="flatList"]') || !pluginConfig.flatListStyle) return
  e.preventDefault()
  e.stopPropagation()
  triggerRowRename(row)
}

/** 安装全局双击监听（apply 时调用一次）。 */
export function installDblclickRename() {
  if (dblclickRenameInstalled) return
  dblclickRenameInstalled = true
  document.addEventListener('dblclick', onDblClick, true)
}
