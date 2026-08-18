/**
 * dsh-niao-quick-open — 浏览器端：工作区「⋯」菜单快捷按钮行。
 *
 * 在左侧工作区「⋯」菜单（含「删除工作区」项）末尾注入一行三个图标按钮：
 * 复制路径 / 文件管理器显示 / 常用编辑器打开。行挂在菜单 list 末尾
 * （viewport 滚动容器之外），避免滚动条出现与 tooltip 被裁剪。受配置
 * 「工作区行菜单快捷按钮」开关控制。
 *
 * @module dsh-niao-quick-open/client/workspace-menu
 */

import { pluginConfig } from './state.js'
import { rpc, copyText, pickDict } from './utils.js'
import { folderSvg, codeSvg, copySvg } from './icons.js'
import { getEditor, registerUIApply } from './config.js'
import { workspacePathMap } from './header.js'

/** 工作区菜单的标志性菜单项文案（zh / en）。 */
const WORKSPACE_MENU_MARK = new Set(['删除工作区', 'Delete workspace'])

/** 判断一个 [role="menu"] 是否为工作区「⋯」菜单（含「删除工作区」项）。 */
function isWorkspaceMenu(el) {
  if (!el || el.nodeType !== 1 || el.getAttribute('role') !== 'menu') return false
  const items = el.querySelectorAll('[role="menuitem"]')
  for (const item of items) {
    if (WORKSPACE_MENU_MARK.has((item.textContent || '').trim())) return true
  }
  return false
}

/** 从菜单内文案判断界面语言：含「删除工作区」为 zh，否则 en。 */
function workspaceMenuLocale(menu) {
  const items = menu.querySelectorAll('[role="menuitem"]')
  for (const item of items) {
    if ((item.textContent || '').trim() === '删除工作区') return 'zh'
  }
  return 'en'
}

/** 找到当前处于打开状态（menuOpen 类）的工作区行，解析其显示名称。 */
function openWorkspaceRowTitle() {
  const rows = document.querySelectorAll('[role="treeitem"][class*="menuOpen"]')
  for (const row of rows) {
    // 工作区行（projectRow）才注入；会话行（sessionRow）跳过。
    if (!row.className || !row.className.toString().includes('projectRow')) continue
    const project = row.querySelector('[class*="projectText"]')
    let text = ''
    if (project) {
      const title = project.querySelector('[class*="title"]')
      text = ((title ? title.textContent : project.textContent) || '').trim()
    }
    if (!text) text = (row.textContent || '').trim()
    if (text) return text
  }
  return ''
}

/** 维护工作区「⋯」菜单内的快捷按钮行；配置关闭时不注入并移除已有行。幂等。 */
export function ensureWorkspaceMenuActions() {
  // 配置开关：关闭时清理所有已注入的按钮行。
  const injected = document.querySelectorAll('[data-nio-mqa]')
  if (!pluginConfig.menuQuickActions) {
    for (const el of injected) el.remove()
    return
  }
  // 每个打开的菜单注入一次（菜单关闭后由 React 卸载，重新打开重建）。
  const menus = document.querySelectorAll('[role="menu"]')
  for (const menu of menus) {
    if (!isWorkspaceMenu(menu) || menu.querySelector('[data-nio-mqa]')) continue
    const dict = pickDict(workspaceMenuLocale(menu) === 'zh')
    // 工作区名：从打开的 menuOpen 工作区行（projectRow）解析（菜单项本身无名称）。
    const title = openWorkspaceRowTitle()
    if (!title) continue
    const path = workspacePathMap().get(title) || ''
    if (!path) continue
    // 标记菜单，供 CSS 解除 overflow 裁剪（tooltip 才能显示）。
    menu.setAttribute('data-nio-mqa-menu', '1')
    // 行挂在 list 末尾（viewport 滚动容器之外）：既不让滚动条出现，
    // 也不让悬浮提示被 viewport 的 overflow 裁剪。
    const row = document.createElement('div')
    row.className = 'nio-mqa'
    row.setAttribute('data-nio-mqa', '1')
    const mkBtn = (tip, icon, onClick) => {
      const btn = document.createElement('button')
      btn.type = 'button'
      btn.className = 'nio-mqa-btn'
      btn.setAttribute('aria-label', tip)
      const tipEl = document.createElement('span')
      tipEl.className = 'nio-mqa-tip'
      tipEl.textContent = tip
      btn.appendChild(icon.cloneNode(true))
      btn.appendChild(tipEl)
      btn.addEventListener('click', (e) => {
        e.stopPropagation()
        onClick()
      })
      return btn
    }
    const mkFeedback = () => {
      const chip = document.createElement('span')
      chip.className = 'nio-mqa-feedback'
      chip.setAttribute('data-nio-mqa-feedback', '1')
      row.appendChild(chip)
      return chip
    }
    row.appendChild(mkBtn(dict.copyTip, copySvg, async () => {
      const ok = await copyText(path)
      const chip = mkFeedback()
      chip.textContent = ok ? dict.copied : dict.openFailed + dict.unknown
      window.setTimeout(() => { if (chip.isConnected) chip.remove() }, 1800)
    }))
    row.appendChild(mkBtn(dict.finder, folderSvg, async () => {
      const res = await rpc('open-in-finder', { cwd: path })
      const chip = mkFeedback()
      if (!res.ok) chip.textContent = dict.openFailed + res.error
      else if (res.value && res.value.ok === false) chip.textContent = dict.openFailed + dict.unknown
      chip.classList.toggle('err', !(res.ok && res.value && res.value.ok !== false))
      window.setTimeout(() => { if (chip.isConnected) chip.remove() }, 1800)
    }))
    row.appendChild(mkBtn(dict.openEditor, codeSvg, async () => {
      const id = getEditor()
      const chip = mkFeedback()
      if (!id) { chip.textContent = dict.pleaseSet; chip.classList.add('err') }
      else {
        const res = await rpc('open-with-editor', { cwd: path, editorId: id })
        if (!res.ok) chip.textContent = dict.openFailed + res.error
        else if (res.value && (res.value.opened === false || res.value.ok === false)) chip.textContent = dict.openFailed + (res.value.reason || dict.unknown)
      }
      window.setTimeout(() => { if (chip.isConnected) chip.remove() }, 1800)
    }))
    menu.appendChild(row)
  }
}

/** 配置「工作区行菜单快捷按钮」开关变化时重建菜单按钮行。 */
registerUIApply(() => { try { ensureWorkspaceMenuActions() } catch { /* 菜单尚未就绪时静默跳过 */ } })
