/**
 * dsh-niao-quick-open — 浏览器端：会话双击重命名。
 *
 * 双击侧边栏会话列表中的「会话名称」，或双击当前激活会话内容区顶部的
 * 会话名称，直接弹出原生「重命名会话」编辑弹窗（等价于点击会话悬浮菜单
 * 中的「重命名」）。
 *
 * 实现：原生 WorkspaceBrowser 的 sessionRenameTarget 状态驱动弹窗；本模块
 * 在双击处派发一次「点击行尾 ⋯ 按钮」的合成 click —— React 18 中由
 * React 派发（dispatchEvent 的 isTrusted=false）会被过滤，因此用原生
 * dispatchEvent 仍可触发 React 的合成监听（React 根监听在 window 捕获，
 * 非 trusted 事件同样可达）。⋯ 按钮的 onClick 调 onRename(sessionId,
 * currentTitle)，即与悬浮菜单「重命名」完全同一条路径。
 *
 * 仅当「单列表增强样式」开启且位于 flatList 内时对会话行生效；
 * 分组/搜索模式的会话行双击不拦截（保留原生行为）。
 *
 * @module dsh-niao-quick-open/client/dblclick-rename
 */

import { pluginConfig } from './state.js'

/** 是否已安装双击监听（全局一次性）。 */
let dblclickRenameInstalled = false

/** 从双击事件的会话行解析 sessionId（点击时配对，行重建后仍准确）。 */
function sessionIdFromRow(row) {
  const sdone = row.querySelector('[data-nio-sdone][data-nio-sid]')
  if (sdone && sdone.dataset.nioSid) return sdone.dataset.nioSid
  return null
}

/** 在行内找到「⋯ 按钮」（原生 rowActions 中的 iconButton），派发一次合成 click。 */
function clickRowMenuButton(row) {
  const btn = row.querySelector('[class*="rowActions"] [class*="iconButton"]')
  if (!btn) return
  // 原生 dispatchEvent（isTrusted=false）仍会被 React 的合成监听接收。
  btn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }))
}

/** 全局双击监听：命中会话名称则触发重命名。 */
function onDblClick(e) {
  const target = e.target
  if (!target || typeof target.closest !== 'function') return
  // 双击的元素必须在「会话名称」内（title 元素或其子节点）。
  const title = target.closest('[class*="title"]')
  if (!title) return
  const row = title.closest('[class*="sessionRow"]')
  if (!row) return
  // 会话行：单列表增强样式开启且位于 flatList 内才拦截（flat 行内的
  // 标题是原生元素，双击不冲突）；分组/搜索行保留原生行为。
  if (row.closest('[class*="flatList"]') && pluginConfig.flatListStyle) {
    e.preventDefault()
    e.stopPropagation()
    clickRowMenuButton(row)
    return
  }
  // 会话内容区顶部的会话名称（当前激活会话 header 的面包屑名称）：
  // 不在会话行内，标题元素位于 header（crumbCurrent）。双击直接触发
  // 当前会话的 ⋯ 菜单重命名（当前会话行必有 rowActions）。
  const crumb = target.closest('[class*="crumbCurrent"]')
  if (!crumb) return
  e.preventDefault()
  e.stopPropagation()
  // 当前会话的行（flat 列表内激活行），点击其 ⋯ 按钮。
  const currentRow = document.querySelector('[class*="flatList"] [class*="sessionRow"][aria-selected="true"]')
  if (currentRow) clickRowMenuButton(currentRow)
}

/** 安装全局双击监听（apply 时调用一次）。 */
export function installDblclickRename() {
  if (dblclickRenameInstalled) return
  dblclickRenameInstalled = true
  document.addEventListener('dblclick', onDblClick, true)
}
