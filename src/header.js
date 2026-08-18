/**
 * dsh-niao-quick-open — 浏览器端：会话 header 工作区行。
 *
 * 在会话区域顶部（header）注入第一行：工作区文件夹名标签（nio-hchip）+
 * 三个图标按钮（复制绝对路径 / 文件管理器显示 / 常用编辑器打开），
 * 会话名留在原 titleRow（第二行，放大样式）。受配置「工作区快捷按钮」
 * 开关控制；header 由 React 管理，本模块以 MutationObserver + 幂等注入
 * 的方式叠加，React 重渲染后由 scan 自动补回。
 *
 * @module dsh-niao-quick-open/client/header
 */

import { pluginConfig, runtimeCtx } from './state.js'
import { rpc, copyText, pickDict } from './utils.js'
import { folderSvg, codeSvg, copySvg } from './icons.js'
import { getEditor, registerUIApply } from './config.js'

/** 读 client runtime 的 sessions service（当前会话 cwd/displayTitle 来源，可选）。 */
function sessionsService() {
  return runtimeCtx ? runtimeCtx.get('sessions') : undefined
}

/** 当前会话快照：{ cwd, displayTitle } 或 null（无当前会话 / 数据未就绪）。 */
function currentSession() {
  const sessions = sessionsService()
  if (!sessions) return null
  try {
    const list = sessions.list.getSnapshot()
    const id = list.current
    if (!id || !list.byId) return null
    const s = list.byId[id]
    if (!s) return null
    return {
      cwd: typeof s.cwd === 'string' ? s.cwd : '',
      displayTitle: typeof s.displayTitle === 'string' ? s.displayTitle : '',
    }
  } catch { return null }
}

/** 目录路径的文件夹名（去尾部分隔符后取最后一段）。 */
export function folderName(cwd) {
  if (!cwd) return ''
  return cwd.replace(/[\\/]+$/, '').split(/[\\/]/).pop() || cwd
}

/** 找到会话 header（含会话名面包屑的 <header>，隐藏中的 hero 头除外）。 */
export function findSessionHeader() {
  const crumbs = document.querySelector('nav[class*="crumbs"]')
  if (!crumbs) return null
  const header = crumbs.closest('header')
  if (!header || header.hasAttribute('aria-hidden')) return null
  return header
}

/** 从 header 内本地化文案判断界面语言：含 CJK 视为中文。 */
function headerLocale(header) {
  const crumbs = header.querySelector('[class*="crumbs"]')
  const label = crumbs ? crumbs.getAttribute('aria-label') || '' : ''
  return /[\u4e00-\u9fff]/.test(label) ? 'zh' : 'en'
}

/** 在 header 工作区行内显示一条短暂反馈文字。 */
function headerFeedback(row, text, cls) {
  const old = row.querySelector('[data-nio-hfeed]')
  if (old) old.remove()
  const chip = document.createElement('span')
  chip.className = 'nio-hfeed ' + (cls || '')
  chip.setAttribute('data-nio-hfeed', '1')
  chip.textContent = text
  row.appendChild(chip)
  window.setTimeout(() => { if (chip.isConnected) chip.remove() }, 2500)
}

/** 复制工作区绝对路径。 */
async function copyWorkspacePath(row, path, dict) {
  if (!path) return
  const ok = await copyText(path)
  if (ok) headerFeedback(row, dict.copied, '')
}

/** 在文件管理器中显示工作区文件夹。 */
async function revealInFinder(row, path, dict) {
  if (!path) return
  const res = await rpc('open-in-finder', { cwd: path })
  if (!res.ok) headerFeedback(row, dict.openFailed + res.error, 'err')
  else if (res.value && res.value.ok === false) headerFeedback(row, dict.openFailed + dict.unknown, 'err')
}

/** 用常用编辑器打开工作区文件夹；未设置时提示去设置面板配置。 */
async function openCwdWithEditor(row, path, dict, pickerBtn) {
  if (!path) return
  const id = getEditor()
  if (!id) {
    headerFeedback(row, dict.pleaseSet, '')
    return
  }
  const res = await rpc('open-with-editor', { cwd: path, editorId: id })
  if (!res.ok) headerFeedback(row, dict.openFailed + res.error, 'err')
  else if (res.value && (res.value.opened === false || res.value.ok === false)) headerFeedback(row, dict.openFailed + (res.value.reason || dict.unknown), 'err')
}

/** 构建会话 header 的第一行：工作区标签 + 三个图标按钮。 */
function buildHeaderRow(folder, path, dict) {
  const row = document.createElement('div')
  row.className = 'nio-hrow'
  row.setAttribute('data-nio-hrow', '1')

  const chip = document.createElement('span')
  chip.className = 'nio-hchip'
  chip.textContent = folder
  chip.title = path
  row.appendChild(chip)

  const mkBtn = (tip, icon, onClick) => {
    const btn = document.createElement('button')
    btn.type = 'button'
    btn.className = 'nio-hbtn'
    btn.setAttribute('aria-label', tip)
    const tipEl = document.createElement('span')
    tipEl.className = 'nio-htip'
    tipEl.textContent = tip
    btn.appendChild(icon.cloneNode(true))
    btn.appendChild(tipEl)
    btn.addEventListener('click', (e) => {
      e.stopPropagation()
      onClick()
    })
    return btn
  }

  row.appendChild(mkBtn(dict.copyTip, copySvg, () => copyWorkspacePath(row, path, dict)))
  row.appendChild(mkBtn(dict.finder, folderSvg, () => revealInFinder(row, path, dict)))
  const codeBtn = mkBtn(dict.openEditor, codeSvg, () => openCwdWithEditor(row, path, dict, codeBtn))
  row.appendChild(codeBtn)

  return row
}

/**
 * 在会话 header 顶部维护工作区行（第一行），会话名留在 titleRow（第二行）。
 * 受配置「界面功能 → 工作区快捷按钮」开关控制：关闭时不注入并移除已有行。
 * 幂等：仅当工作区变化时重建；header 被 React 重渲染后自动补回。
 */
export function ensureHeaderRow() {
  if (!pluginConfig.enabled) {
    const header = findSessionHeader()
    const row = header ? header.querySelector('[data-nio-hrow]') : null
    if (row) row.remove()
    return
  }
  const header = findSessionHeader()
  const session = currentSession()
  const row = header ? header.querySelector('[data-nio-hrow]') : null
  if (!header || !session || !session.cwd) {
    if (row) row.remove()
    return
  }
  const folder = folderName(session.cwd)
  const key = folder + '\u0000' + session.cwd
  if (row && row.dataset.nioKey === key) return
  if (row) row.remove()
  const dict = pickDict(headerLocale(header) === 'zh')
  const fresh = buildHeaderRow(folder, session.cwd, dict)
  fresh.dataset.nioKey = key
  const titleRow = header.querySelector('[class*="titleRow"]')
  header.insertBefore(fresh, titleRow || header.firstChild)
}

/** 从 workspaces service 构建 title → path 映射（工作区菜单注入用）。 */
export function workspacePathMap() {
  const workspaces = runtimeCtx ? runtimeCtx.get('workspaces') : undefined
  const map = new Map()
  if (!workspaces) return map
  try {
    const items = workspaces.list.getSnapshot().items
    for (const w of items) {
      if (w && typeof w.title === 'string' && typeof w.path === 'string' && w.title && !map.has(w.title)) {
        map.set(w.title, w.path)
      }
    }
  } catch { /* 快照未就绪时返回空映射 */ }
  return map
}

/** 配置「工作区快捷按钮」开关变化时重建 header 行。 */
registerUIApply(() => { try { ensureHeaderRow() } catch { /* header 未就绪时忽略 */ } })
