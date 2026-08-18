/**
 * dsh-niao-quick-open — 浏览器端：会话双击重命名。
 *
 * 双击侧边栏会话列表中的「会话名称」，或双击当前激活会话内容区顶部的
 * 会话名称，直接弹出原生「重命名会话」编辑弹窗（等价于点击会话悬浮菜单
 * 中的「重命名」）。
 *
 * 实现要点（两步合成点击，复用原生路径）：
 *  1. 「⋯ 按钮」（rowActions 内 iconButton）的 onClick 只是 setMenuOpen
 *     （打开菜单）；onRename(sessionId, currentTitle) 只在菜单项
 *     onSelect('rename') 时调用。因此单点 ⋯ 按钮只会打开菜单。
 *  2. 本模块分两步派发合成 click：先点 ⋯ 按钮打开菜单，等 React 渲染出
 *     portal 菜单后，找到「重命名」菜单项再点一次 —— 与用户手动
 *     「点 ⋯ → 点重命名」完全同一条路径，弹窗自然弹出（带出当前标题、
 *     Enter 确认、Escape 取消，校验/错误处理沿用原生）。
 *  3. 原生 dispatchEvent（isTrusted=false）仍会被 React 的合成监听接收
 *     （React 根监听在 window 捕获，非 trusted 事件同样可达）。
 *
 * 会话行双击仅在「单列表增强样式」开启且位于 flatList 内拦截；
 * header 面包屑双击仅对当前激活会话生效；其余场景保留原生行为。
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
 * 触发某会话行的「重命名」：先点 ⋯ 按钮打开菜单，再等菜单渲染后点
 * 「重命名」菜单项（两步与手动操作一致）。菜单项出现后点击即弹窗。
 */
function triggerRowRename(row) {
  if (!row || !row.isConnected) return
  const btn = row.querySelector('[class*="rowActions"] [class*="iconButton"]')
  if (!btn) return
  syntheticClick(btn) // 打开 ⋯ 菜单
  let tries = 0
  const timer = window.setInterval(() => {
    tries += 1
    if (tries > 40) { window.clearInterval(timer); return } // 2s 超时
    const item = findRenameMenuItem()
    if (!item) return
    window.clearInterval(timer)
    syntheticClick(item) // 点「重命名」→ onSelect('rename') → onRename → 弹窗
  }, 50)
}

/** 全局双击监听：命中会话名称（列表行 / header 面包屑）则触发重命名。 */
function onDblClick(e) {
  const target = e.target
  if (!target || typeof target.closest !== 'function') return

  // ① header 面包屑：当前激活会话内容区顶部的会话名称（crumbCurrent）。
  // 必须优先判断——crumbCurrent 类名不含 "title"，先查 title 会漏掉。
  const crumb = target.closest('[class*="crumbCurrent"]')
  if (crumb) {
    e.preventDefault()
    e.stopPropagation()
    // 当前会话行（flat 列表内激活行）的 ⋯ 按钮 → 重命名。
    const currentRow = document.querySelector('[class*="flatList"] [class*="sessionRow"][aria-selected="true"]')
    if (currentRow) triggerRowRename(currentRow)
    return
  }

  // ② 会话列表行：双击的元素必须在「会话名称」内（title 元素或其子节点）。
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
