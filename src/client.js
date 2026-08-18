/**
 * dsh-niao-quick-open — 浏览器端（静态 bundle 入口）。
 *
 * 功能一：会话区域顶部（header）左上角改为两行。
 *   - 第一行：当前工作区文件夹名称（小字高亮标签）+ 四个图标按钮
 *     （复制绝对路径 / 在文件管理器中显示 / 用常用编辑器打开 / 设置常用编辑器），
 *     悬停提示显示在图标下方；受设置「界面功能 → 工作区快捷按钮」开关控制。
 *   - 第二行：当前会话名称（放大字号）。
 *
 * 功能二：在 DSH 设置面板左侧边注册「界面功能」设置页（settings.section）：
 *   - 「工作区快捷按钮」显示开关；
 *   - 「常用编辑器」选择（即时保存，无确认按钮）。
 *   配置通过同源 JSON 路由 /api/dsh-niao-quick-open 读写（宿主端持久化到
 *   ~/.dsh/dsh-niao-quick-open.config.json）。
 *
 * header 由 React 管理，本插件以 MutationObserver + 幂等注入的方式叠加一行，
 * React 重渲染后自动补回。设置面板用纯 React（React.createElement，无 JSX）。
 * 宿主能力（编辑器扫描 / 打开命令 / 配置读写）全部走同源路由。
 *
 * @module dsh-niao-quick-open/client
 */

import React from 'react'

/** 宿主路由（与 lib/index.js 的 ROUTE_PATH 对应）。 */
const ROUTE = '/api/dsh-niao-quick-open'
/** 旧版常用编辑器选择的 localStorage 键（用于迁移到宿主端配置）。 */
const EDITOR_KEY = 'dsh.niao.quickOpen.editor'

/* ------------------------------------------------------------------ */
/* 插件配置状态（与宿主端 config.json 同步）                              */
/* ------------------------------------------------------------------ */

/** 运行时配置缓存：{ enabled, editor, showRestart, menuQuickActions, sessionDoneMark }。 */
let pluginConfig = { enabled: true, editor: '', showRestart: true, menuQuickActions: false, sessionDoneMark: false }

/**
 * 「需要重启才能生效」的配置基线：页面加载（apply 首次拉取配置）时宿主端
 * 的配置快照。此后 set-config 修改的配置与其比对，差异即视为待重启生效；
 * 重启后页面重载会重新取基线，横幅随之消失。模块级变量使其在设置面板
 * 关闭/重开之间保持（需求：关闭设置再打开横幅仍展示）。
 */
let configBaseline = null

/** apply 时保存的 client 根 ctx（仅保存引用，供 sessions / slots 可选读取）。 */
let runtimeCtx = null

/** 从宿主端拉取最新配置并更新缓存；首次成功时记录配置基线。 */
async function refreshConfig() {
  const res = await rpc('get-config')
  if (res.ok && res.value && res.value.config) {
    if (configBaseline === null) configBaseline = { ...res.value.config }
    applyConfigPatch(res.value.config)
    return true
  }
  return false
}

/** 当前配置与基线是否有差异（即存在需要重启才能生效的修改）。 */
function configDirty() {
  if (!configBaseline) return false
  return pluginConfig.enabled !== configBaseline.enabled ||
    pluginConfig.editor !== configBaseline.editor ||
    pluginConfig.showRestart !== configBaseline.showRestart ||
    pluginConfig.menuQuickActions !== configBaseline.menuQuickActions ||
    pluginConfig.sessionDoneMark !== configBaseline.sessionDoneMark
}

/** 应用一份配置补丁：更新缓存，并在任一「显示开关」变化时立即重建对应 UI。 */
function applyConfigPatch(next) {
  const changed = next && (typeof next.enabled === 'boolean' || typeof next.editor === 'string' || typeof next.showRestart === 'boolean' || typeof next.menuQuickActions === 'boolean' || typeof next.sessionDoneMark === 'boolean')
  if (next && typeof next.enabled === 'boolean') pluginConfig.enabled = next.enabled
  if (next && typeof next.editor === 'string') pluginConfig.editor = next.editor
  if (next && typeof next.showRestart === 'boolean') pluginConfig.showRestart = next.showRestart
  if (next && typeof next.menuQuickActions === 'boolean') pluginConfig.menuQuickActions = next.menuQuickActions
  if (next && typeof next.sessionDoneMark === 'boolean') pluginConfig.sessionDoneMark = next.sessionDoneMark
  if (changed) {
    try { ensureHeaderRow() } catch { /* header 未就绪时忽略 */ }
    try { ensureRestartButton() } catch { /* 设置区未就绪时忽略 */ }
    try { ensureSessionDoneDots() } catch { /* 会话区未就绪时忽略 */ }
  }
}

/** 读取已设置的常用编辑器 id；未设置返回空串。 */
function getEditor() {
  return pluginConfig.editor || ''
}

/** 保存常用编辑器 id（空串 = 清除），持久化到宿主端 config.json。 */
async function setEditor(id) {
  const editor = id || ''
  pluginConfig.editor = editor
  await rpc('set-config', { config: { editor } })
}

/** 迁移旧版 localStorage 里的编辑器选择到宿主端配置（一次性）。 */
async function migrateLegacyEditor() {
  if (pluginConfig.editor) return
  let legacy = ''
  try { legacy = window.localStorage.getItem(EDITOR_KEY) || '' } catch { /* 存储不可用 */ }
  if (!legacy) return
  await setEditor(legacy)
  try { window.localStorage.removeItem(EDITOR_KEY) } catch { /* 忽略 */ }
}

/* ------------------------------------------------------------------ */
/* 基础工具                                                             */
/* ------------------------------------------------------------------ */

/** 同源 JSON POST 到宿主路由；统一返回 { ok, value } 或 { ok:false, error }。 */
async function rpc(action, payload) {
  try {
    const res = await fetch(ROUTE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, ...payload }),
    })
    const data = await res.json()
    if (data && data.ok) return { ok: true, value: data.value }
    return { ok: false, error: (data && data.error && data.error.message) || `HTTP ${res.status}` }
  } catch (error) {
    return { ok: false, error: String(error && error.message ? error.message : error) }
  }
}

/** 写入剪贴板：优先 Clipboard API，回退 execCommand。 */
async function copyText(text) {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch { /* 继续尝试回退 */ }
  try {
    const el = document.createElement('textarea')
    el.value = text
    el.setAttribute('readonly', '')
    el.style.position = 'fixed'
    el.style.left = '-9999px'
    document.body.appendChild(el)
    el.select()
    const ok = document.execCommand('copy')
    el.remove()
    return ok
  } catch { return false }
}

const isMac = /Mac|iPhone|iPad|iPod/i.test(navigator.userAgent || '')
const isWin = /Windows|Win32|Win64/i.test(navigator.userAgent || '')

/** 文件管理器按钮文案，随操作系统自适应。 */
function finderLabel() {
  return isWin ? '在资源管理器中打开' : isMac ? '在访达中打开' : '在文件管理器中打开'
}

/** 根据当前界面语言（由 header 内文案判定）选择文案字典。 */
function pickDict(zh) {
  return zh ? {
    finder: finderLabel(),
    openEditor: '常用编辑器中打开',
    openFailed: '打开失败: ',
    unknown: '未知原因',
    pleaseSet: '请先在设置-界面功能-工作区快捷按钮中进行常用编辑器的配置',
    copyTip: '复制绝对路径',
    copied: '已复制绝对路径',
  } : {
    finder: finderLabel(),
    openEditor: 'Open in Default Editor',
    openFailed: 'Failed to open: ',
    unknown: 'unknown reason',
    pleaseSet: 'Please configure a default editor under Settings → UI Features → Workspace quick buttons first',
    copyTip: 'Copy absolute path',
    copied: 'Absolute path copied',
  }
}

/* ------------------------------------------------------------------ */
/* 图标（16×16 线性路径，与宿主品牌图标同一套视觉语言）                    */
/* ------------------------------------------------------------------ */

const FOLDER_PATH = 'M5.19629 1.57104C5.81144 1.5711 6.38623 1.8786 6.72754 2.39038L7.19922 3.09839C7.28454 3.22635 7.42824 3.30344 7.58203 3.30347H12.1699C13.5039 3.30348 14.5859 4.38548 14.5859 5.71948V6.62671C15.2694 7.02689 15.6605 7.85012 15.4385 8.68726L14.3848 12.658C14.1037 13.7164 13.1449 14.4527 12.0498 14.4529H2.91699C1.51651 14.4529 0.451662 13.2814 0.501954 11.9519V3.98706C0.501954 2.65305 1.58396 1.57104 2.91797 1.57104H5.19629ZM3.7793 7.75562C3.30994 7.75562 2.89883 8.07153 2.77832 8.52515L1.91602 11.7722C1.74167 12.4291 2.23734 13.073 2.91699 13.073H12.0498C12.5191 13.0728 12.9304 12.757 13.0508 12.3035L14.1045 8.33374C14.1819 8.04202 13.9619 7.756 13.6602 7.75562H3.7793ZM2.91797 2.9519C2.34625 2.9519 1.88281 3.41534 1.88281 3.98706V7.2937C2.33068 6.7269 3.02249 6.37476 3.7793 6.37476H13.2051V5.71948C13.2051 5.14777 12.7416 4.68434 12.1699 4.68433H7.58203C6.96675 4.6843 6.39209 4.37595 6.05078 3.86401L5.5791 3.15601C5.49379 3.02821 5.34995 2.95196 5.19629 2.9519H2.91797Z'
const CODE_PATH = 'M12.3368 1.53569L11.931 4.43172H14.8086V5.79673H11.7404L11.1962 9.67859H14.2839V11.0436H11.0056L10.4994 14.6529L9.14873 14.4643L9.62731 11.0436H5.75876L5.25252 14.6529L3.90186 14.4643L4.38043 11.0436H1.69141V9.67859H4.57104L5.11417 5.79673H2.21609V4.43172H5.30581L5.73724 1.34713L7.08995 1.53569L6.68414 4.43172H10.5527L10.9841 1.34713L12.3368 1.53569ZM5.94937 9.67859H9.81791L10.361 5.79673H6.49353L5.94937 9.67859Z'
const COPY_PATH = 'M6.14929 4.02032C7.11197 4.02032 7.87983 4.02016 8.49597 4.07598C9.12128 4.13269 9.65792 4.25188 10.1415 4.53106C10.7202 4.8653 11.2008 5.3459 11.535 5.92462C11.8142 6.40818 11.9334 6.94481 11.9901 7.57012C12.0459 8.18625 12.0458 8.95419 12.0458 9.9168C12.0458 10.8795 12.0459 11.6473 11.9901 12.2635C11.9334 12.8888 11.8142 13.4254 11.535 13.909C11.2008 14.4877 10.7202 14.9683 10.1415 15.3025C9.65792 15.5817 9.12128 15.7009 8.49597 15.7576C7.87984 15.8134 7.11196 15.8133 6.14929 15.8133C5.18667 15.8133 4.41874 15.8134 3.80261 15.7576C3.1773 15.7009 2.64067 15.5817 2.1571 15.3025C1.5784 14.9683 1.09778 14.4877 0.76355 13.909C0.484366 13.4254 0.365184 12.8888 0.308472 12.2635C0.252649 11.6473 0.252808 10.8795 0.252808 9.9168C0.252808 8.95418 0.252664 8.18625 0.308472 7.57012C0.365184 6.94481 0.484366 6.40818 0.76355 5.92462C1.09777 5.34589 1.57839 4.86529 2.1571 4.53106C2.64067 4.25188 3.1773 4.13269 3.80261 4.07598C4.41874 4.02017 5.18666 4.02032 6.14929 4.02032ZM6.14929 5.37774C5.16181 5.37774 4.46634 5.37761 3.92566 5.42657C3.39434 5.47472 3.07859 5.56574 2.83582 5.70587C2.4632 5.92106 2.15354 6.2307 1.93835 6.60333C1.79823 6.8461 1.70721 7.16185 1.65906 7.69317C1.6101 8.23385 1.61023 8.92933 1.61023 9.9168C1.61023 10.9043 1.61009 11.5998 1.65906 12.1404C1.70721 12.6717 1.79823 12.9875 1.93835 13.2303C2.15356 13.6029 2.46321 13.9126 2.83582 14.1277C3.07859 14.2679 3.39434 14.3589 3.92566 14.407C4.46634 14.456 5.16182 14.4559 6.14929 14.4559C7.13682 14.4559 7.83224 14.456 8.37292 14.407C8.90425 14.3589 9.21999 14.2679 9.46277 14.1277C9.83535 13.9126 10.145 13.6029 10.3602 13.2303C10.5004 12.9875 10.5914 12.6717 10.6395 12.1404C10.6885 11.5998 10.6884 10.9043 10.6884 9.9168C10.6884 8.92934 10.6885 8.23384 10.6395 7.69317C10.5914 7.16185 10.5004 6.8461 10.3602 6.60333C10.1451 6.23071 9.83536 5.92107 9.46277 5.70587C9.21999 5.56574 8.90424 5.47472 8.37292 5.42657C7.83224 5.3776 7.13682 5.37774 6.14929 5.37774ZM9.80164 0.367975C10.7638 0.367975 11.5314 0.367958 12.1476 0.423777C12.7729 0.480489 13.3095 0.599671 13.7931 0.878855C14.3718 1.21309 14.8524 1.6937 15.1866 2.27241C15.4658 2.75597 15.585 3.29261 15.6417 3.91791C15.6975 4.53405 15.6974 5.30198 15.6974 6.2646C15.6974 7.22721 15.6975 7.99514 15.6417 8.61128C15.585 9.23659 15.4658 9.77322 15.1866 10.2568C14.8524 10.8355 14.3718 11.3161 13.7931 11.6503C13.3095 11.9295 12.7729 12.0487 12.1476 12.1054C11.5314 12.1612 10.7638 12.1611 9.80164 12.1611C8.83902 12.1611 8.0711 12.1612 7.45497 12.1054C6.82966 12.0487 6.29303 11.9295 5.80946 11.6503C5.23075 11.3161 4.75015 10.8355 4.41592 10.2568C4.13674 9.77322 4.01756 9.23659 3.96084 8.61128C3.90502 7.99515 3.90518 7.22722 3.90518 6.2646C3.90518 5.30198 3.90502 4.53404 3.96084 3.91791C4.01756 3.29261 4.13674 2.75597 4.41592 2.27241C4.75015 1.6937 5.23077 1.21309 5.80946 0.878855C6.29303 0.599671 6.82966 0.480489 7.45497 0.423777C8.0711 0.367957 8.83903 0.367975 9.80164 0.367975ZM9.80164 1.72539C8.81416 1.72539 8.1187 1.72526 7.57802 1.77422C7.0467 1.82237 6.73095 1.91339 6.48818 2.05352C6.11555 2.26871 5.8059 2.57835 5.59071 2.95098C5.45059 3.19375 5.35957 3.5095 5.31142 4.04082C5.26246 4.5815 5.26259 5.27698 5.26259 6.2646C5.26259 7.25208 5.26245 7.94755 5.31142 8.48807C5.35957 9.01939 5.45059 9.33514 5.59071 9.57791C5.8059 9.95053 6.11555 10.2602 6.48818 10.4754C6.73095 10.6155 7.0467 10.7065 7.57802 10.7547C8.1187 10.8036 8.81417 10.8035 9.80164 10.8035C10.7891 10.8035 11.4846 10.8037 12.0253 10.7547C12.5566 10.7065 12.8723 10.6155 13.1151 10.4754C13.4877 10.2602 13.7974 9.95053 14.0126 9.57791C14.1527 9.33514 14.2437 9.01939 14.2919 8.48807C14.3409 7.94755 14.3407 7.25207 14.3407 6.2646C14.3407 5.27712 14.3409 4.58164 14.2919 4.04082C14.2437 3.5095 14.1527 3.19375 14.0126 2.95098C13.7974 2.57836 13.4877 2.26871 13.1151 2.05352C12.8723 1.91339 12.5566 1.82237 12.0253 1.77422C11.4846 1.72526 10.7891 1.72539 9.80164 1.72539Z'

/**
 * 生成 SVG 元素。fill 风格：元素为 path 字符串，自动 fill=currentColor；
 * stroke 风格（Lucide 类，stroke=true）：元素为 { d } 或 { circle } 形状，
 * svg 级设置 stroke=currentColor + 圆头端点，不填充。
 */
function makeSvg(shapes, viewBox = '0 0 16 16', stroke = false) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svg.setAttribute('width', '16')
  svg.setAttribute('height', '16')
  svg.setAttribute('viewBox', viewBox)
  svg.setAttribute('fill', 'none')
  if (stroke) {
    svg.setAttribute('stroke', 'currentColor')
    svg.setAttribute('stroke-width', '2')
    svg.setAttribute('stroke-linecap', 'round')
    svg.setAttribute('stroke-linejoin', 'round')
  }
  for (const shape of shapes) {
    if (typeof shape === 'string') {
      // fill 风格 path
      const p = document.createElementNS('http://www.w3.org/2000/svg', 'path')
      p.setAttribute('d', shape)
      p.setAttribute('fill', 'currentColor')
      svg.appendChild(p)
    } else if (shape.circle) {
      // stroke 风格 circle
      const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
      c.setAttribute('cx', String(shape.circle.cx))
      c.setAttribute('cy', String(shape.circle.cy))
      c.setAttribute('r', String(shape.circle.r))
      svg.appendChild(c)
    } else {
      // stroke 风格 path
      const p = document.createElementNS('http://www.w3.org/2000/svg', 'path')
      p.setAttribute('d', shape.d)
      svg.appendChild(p)
    }
  }
  return svg
}

const folderSvg = makeSvg([FOLDER_PATH])
const codeSvg = makeSvg([CODE_PATH])
const copySvg = makeSvg([COPY_PATH])
/** 重启图标（Lucide circle-power：圆圈 + 电源竖线 + 缺口弧），24 视口 stroke 风格。 */
const restartSvg = makeSvg([
  { circle: { cx: 12, cy: 12, r: 10 } },
  { d: 'M12 7v4' },
  { d: 'M7.998 9.003a5 5 0 1 0 8-.005' },
], '0 0 24 24', true)

/* ------------------------------------------------------------------ */
/* 会话 header：工作区行 + 会话名放大                                    */
/* ------------------------------------------------------------------ */

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
function folderName(cwd) {
  if (!cwd) return ''
  return cwd.replace(/[\\/]+$/, '').split(/[\\/]/).pop() || cwd
}

/** 找到会话 header（含会话名面包屑的 <header>，隐藏中的 hero 头除外）。 */
function findSessionHeader() {
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

/** 构建会话 header 的第一行：工作区标签 + 四个图标按钮。 */
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
function ensureHeaderRow() {
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

/** 从 workspaces service 构建 title → path 映射（菜单注入用）。 */
function workspacePathMap() {
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

/* ------------------------------------------------------------------ */
/* 工作区「⋯」菜单：快捷按钮行                                          */
/* ------------------------------------------------------------------ */

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
function ensureWorkspaceMenuActions() {
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

/* ------------------------------------------------------------------ */
/* 会话待办标记：空闲会话前的可点击状态圆点                              */
/* ------------------------------------------------------------------ */

/**
 * 会话状态圆点：
 * - 原生 UI 的「已完成」绿点来自客户端 manager 派生的 completed 字段
 *   （running→idle 边缘且未打开时置 true，打开即清除，无写接口、不持久化），
 *   因此本功能用浏览器缓存（localStorage）持久化用户标记，注入圆点覆盖显示。
 * - 空闲会话：默认不显示圆点，hover 时显示浅灰点 + 提示「设为待办」，
 *   点击后标记为已完成 → 圆点变绿（与原生 completed 样式一致）。
 */

/** 会话待办标记的浏览器缓存键（localStorage，仅存标记，不占配置）。 */
const DONE_IDS_KEY = 'dsh.niao.quickOpen.doneSessionIds'

/** 读取浏览器缓存中的已完成会话 id 列表（损坏/缺失返回空数组）。 */
function readDoneIds() {
  try {
    const raw = window.localStorage.getItem(DONE_IDS_KEY)
    const arr = raw ? JSON.parse(raw) : []
    return Array.isArray(arr) ? arr.filter((id) => typeof id === 'string') : []
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
function setSessionDone(id, done) {
  const ids = readDoneIds()
  const set = new Set(ids)
  if (done) set.add(id)
  else set.delete(id)
  writeDoneIds([...set])
  try { ensureSessionDoneDots() } catch { /* 会话区未就绪时忽略 */ }
}

/** 会话快照（会话行注入的数据来源）：返回会话数组，含 id/displayTitle/running/pendingInteraction/completed/blank。 */
function sessionSnapshotRows() {
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
function sessionRowTitle(row) {
  const titleEl = row.querySelector('[class*="title"]')
  return ((titleEl ? titleEl.textContent : row.textContent) || '').trim()
}

/** 会话行 → sessionId 映射：行数与会话数一致时按序配对，否则按标题配对（同标题按出现序）。 */
function mapSessionRowsToIds(rows) {
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
function isIdleSession(s) {
  return !s.running && !s.pending && !s.completed && !s.blank
}

/** 最近一次已执行「打开自动取消待办」的会话 id（防止同一 current 重复清理）。 */
let lastClearedSessionId = null

/** 会话切换为当前时，自动取消其待办标记（语义：正在看的会话不再是待办）。 */
function clearDoneOnOpen() {
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
function ensureSessionDoneDots() {
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
    if (existing) {
      // 状态可能变化（标记 ↔ 未标记），刷新类名与提示。
      // 若行解析到的 id 与圆点上记录的 id 不一致，说明配对漂移：
      // 以圆点记录的 id 为准，避免误操作（点击处理用 dataset）。
      if (existing.dataset.nioSid && existing.dataset.nioSid !== sessionId) {
        existing.remove()
        continue
      }
      existing.classList.toggle('nio-sdone-marked', userMarked)
      existing.setAttribute('aria-label', userMarked ? '已完成' : '设为待办')
      const tip = existing.querySelector('.nio-sdone-tip')
      if (tip) tip.textContent = userMarked ? '已完成' : '设为待办'
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
    // 有原生 slot 则塞进 slot（复用占位，零额外空间）；否则插行首（复刻 slot 尺寸）。
    if (slot) slot.appendChild(dot)
    else row.insertBefore(dot, row.firstChild)
  }
}

/* ------------------------------------------------------------------ */
/* 设置面板：界面功能（settings.section）                                */
/* ------------------------------------------------------------------ */

/** 配置面板：即时保存，无确认按钮。 */
function ConfigPanel() {
  const [state, setState] = React.useState(null)
  const [editors, setEditors] = React.useState([])
  const [loadError, setLoadError] = React.useState('')
  // 需要重启才能生效的配置修改存在与否；由模块级基线 + 当前配置实时判定，
  // 初始值立即计算（关闭设置再打开时基线/配置仍在内存，横幅保持展示）。
  const [dirty, setDirty] = React.useState(configDirty())

  React.useEffect(() => {
    let alive = true
    Promise.all([rpc('get-config'), rpc('list-editors')]).then(([configRes, editorsRes]) => {
      if (!alive) return
      if (configRes.ok && configRes.value && configRes.value.config) {
        // 首次取得宿主端配置时（apply 的 refreshConfig 尚未完成的兜底）记录基线。
        if (configBaseline === null) configBaseline = { ...configRes.value.config }
        setState(configRes.value.config)
        applyConfigPatch(configRes.value.config)
        setDirty(configDirty())
      } else {
        setLoadError(configRes.error || '配置读取失败')
      }
      if (editorsRes.ok && Array.isArray(editorsRes.value)) setEditors(editorsRes.value)
    })
    return () => { alive = false }
  }, [])

  const save = (patch) => {
    rpc('set-config', { config: patch }).then((res) => {
      if (res.ok && res.value && res.value.config) {
        setState(res.value.config)
        applyConfigPatch(res.value.config)
        // 保存后重新判定：改动 → 出现横幅；改回基线 → 横幅消失。
        setDirty(configDirty())
      }
    })
  }

  if (loadError) {
    return React.createElement('div', { className: 'nio-settings-error' }, loadError)
  }
  if (!state) {
    return React.createElement('div', { className: 'nio-settings-note' }, '加载中…')
  }

  return React.createElement('div', { className: 'nio-settings' },
    // 顶部横幅：有需要重启才能生效的配置修改时出现。
    dirty && React.createElement('div', { className: 'nio-settings-banner' },
      React.createElement('span', { className: 'nio-settings-banner-text' }, '有配置修改需要重启才能生效'),
      React.createElement('button', {
        type: 'button',
        className: 'nio-settings-banner-btn',
        onClick: () => showRestartConfirm({
          title: '重启以生效',
          desc: '即将硬性重启 DeepSeek Harness 服务，以使本次修改生效。所有正在运行的会话会暂时中断，服务关闭后以相同方式重新启动，页面会自动恢复。',
          okText: '重启',
        }),
      }, '重启以生效'),
    ),
    // 「工作区快捷按钮」组：开关 + 其子项「常用编辑器」（缩进）。
    React.createElement('div', { className: 'nio-settings-group' },
      React.createElement('div', { className: 'nio-settings-row' },
        React.createElement('div', { className: 'nio-settings-text' },
          React.createElement('div', { className: 'nio-settings-title' }, '工作区快捷按钮'),
          React.createElement('div', { className: 'nio-settings-desc' }, '在会话区域顶部显示工作区文件夹名与快捷操作按钮（复制路径 / 访达显示 / 编辑器打开）'),
        ),
        React.createElement('label', { className: 'nio-settings-toggle' },
          React.createElement('input', {
            type: 'checkbox',
            checked: !!state.enabled,
            onChange: (e) => save({ enabled: e.target.checked }),
          }),
          React.createElement('span', { className: 'nio-settings-toggle-track' }, null),
        ),
      ),
      // 子项：常用编辑器（随主开关禁用）
      React.createElement('div', { className: 'nio-settings-sub' },
        React.createElement('div', { className: 'nio-settings-text' },
          React.createElement('div', { className: 'nio-settings-title' }, '常用编辑器'),
          React.createElement('div', { className: 'nio-settings-desc' }, '「常用编辑器中打开」使用的编辑器，选择后立即生效'),
        ),
        React.createElement('select', {
          className: 'nio-settings-select',
          value: state.editor || '',
          disabled: !state.enabled,
          onChange: (e) => save({ editor: e.target.value }),
        },
        React.createElement('option', { value: '', key: '' }, '未设置'),
        editors.map((ed) => React.createElement('option', { value: ed.id, key: ed.id }, ed.name || ed.id)),
        ),
      ),
      // 子项：工作区行菜单快捷按钮（随主开关禁用）
      React.createElement('div', { className: 'nio-settings-sub' },
        React.createElement('div', { className: 'nio-settings-text' },
          React.createElement('div', { className: 'nio-settings-title' }, '工作区行菜单快捷按钮'),
          React.createElement('div', { className: 'nio-settings-desc' }, '在工作区「⋯」菜单中展示一行快捷按钮（复制路径 / 访达显示 / 编辑器打开）'),
        ),
        React.createElement('label', { className: 'nio-settings-toggle' },
          React.createElement('input', {
            type: 'checkbox',
            checked: !!state.menuQuickActions,
            disabled: !state.enabled,
            onChange: (e) => save({ menuQuickActions: e.target.checked }),
          }),
          React.createElement('span', { className: 'nio-settings-toggle-track' }, null),
        ),
      ),
    ),
    // 「会话待办标记」组（与「工作区快捷按钮」同级）：空闲会话前的标记圆点开关。
    React.createElement('div', { className: 'nio-settings-group' },
      React.createElement('div', { className: 'nio-settings-row' },
        React.createElement('div', { className: 'nio-settings-text' },
          React.createElement('div', { className: 'nio-settings-title' }, '会话待办标记'),
          React.createElement('div', { className: 'nio-settings-desc' }, '在空闲会话前显示可点击的标记圆点，将其标记为已完成'),
        ),
        React.createElement('label', { className: 'nio-settings-toggle' },
          React.createElement('input', {
            type: 'checkbox',
            checked: !!state.sessionDoneMark,
            onChange: (e) => save({ sessionDoneMark: e.target.checked }),
          }),
          React.createElement('span', { className: 'nio-settings-toggle-track' }, null),
        ),
      ),
    ),
    // 「重启按钮」组（与「工作区快捷按钮」同级）：开关控制左下角按钮是否显示。
    React.createElement('div', { className: 'nio-settings-group' },
      React.createElement('div', { className: 'nio-settings-row' },
        React.createElement('div', { className: 'nio-settings-text' },
          React.createElement('div', { className: 'nio-settings-title' }, '重启按钮'),
          React.createElement('div', { className: 'nio-settings-desc' }, '在界面左下角设置按钮右侧显示「硬性重启」按钮'),
        ),
        React.createElement('label', { className: 'nio-settings-toggle' },
          React.createElement('input', {
            type: 'checkbox',
            checked: !!state.showRestart,
            onChange: (e) => save({ showRestart: e.target.checked }),
          }),
          React.createElement('span', { className: 'nio-settings-toggle-track' }, null),
        ),
      ),
    ),
  )
}

/* ------------------------------------------------------------------ */
/* 左下角重启按钮 + 二次确认 + 重启等待                                  */
/* ------------------------------------------------------------------ */

/** 定位左下角设置区容器（重启按钮的注入锚点）。多级回退，不依赖单一类名。 */
function findSettingsArea() {
  // 1) slot 系统为 renderSlot("sidebar.settings") 输出加的 data-slot 容器（最稳，无 hash 类名依赖）。
  const bySlot = document.querySelector('[data-slot="sidebar.settings"]')
  if (bySlot) return bySlot
  // 2) ui-sidebar 的 settingsArea hash 类名。
  const byClass = document.querySelector('[class*="settingsArea"]')
  if (byClass) return byClass
  // 3) 兜底：设置触发器按钮（aria-haspopup="dialog"）的父容器。
  const trigger = document.querySelector('button[aria-haspopup="dialog"]')
  return trigger && trigger.parentElement ? trigger.parentElement : null
}

/** 在设置按钮（sidebar 左下角 settingsArea）右侧注入「重启」图标按钮。幂等。 */
function ensureRestartButton() {
  // 配置开关：关闭时移除已注入的按钮（若存在），不再注入。
  const existing = document.querySelector('[data-nio-rst]')
  if (!pluginConfig.showRestart) {
    if (existing) existing.remove()
    return
  }
  if (existing) return
  const area = findSettingsArea()
  if (!area) {
    if (window.console) console.warn('[dsh-niao-quick-open] 未找到设置区锚点（sidebar.settings slot）')
    return
  }
  // 折叠（rail）模式侧栏太窄放不下第二个图标，跳过注入（展开后由 scan 补回）。
  if (area.closest('[class*="collapsed"]')) return
  // 定位上下文：真正的布局盒 settingsArea（data-slot 容器是 display:contents）。
  const layout = area.closest('[class*="settingsArea"]') || area
  layout.classList.add('nio-rst-area')

  const btn = document.createElement('button')
  btn.type = 'button'
  btn.className = 'nio-rst'
  btn.setAttribute('data-nio-rst', '1')
  btn.setAttribute('aria-label', '硬性重启')
  const tip = document.createElement('span')
  tip.className = 'nio-rst-tip'
  tip.textContent = '硬性重启'
  btn.appendChild(restartSvg.cloneNode(true))
  btn.appendChild(tip)
  btn.addEventListener('click', (e) => {
    e.stopPropagation()
    showRestartConfirm()
  })
  // 按钮留在 data-slot 容器（与设置触发器同层），视觉上 absolute 定位到设置行右侧。
  area.appendChild(btn)
  if (window.console) console.log('[dsh-niao-quick-open] 重启按钮已注入', area.tagName, (area.className || '').toString().slice(0, 80))
}

/** 当前打开的重启确认层 / 重启等待层元素。 */
let restartOverlay = null

/** 关闭当前重启确认层或等待层并解除监听。 */
function closeRestartOverlay() {
  if (!restartOverlay) return
  if (typeof restartOverlay._nioCleanup === 'function') restartOverlay._nioCleanup()
  restartOverlay.remove()
  restartOverlay = null
}

/**
 * 弹出「重启 DeepSeek Harness？」二次确认框。
 * @param opts - 可定制文案：{ title, desc, okText }；不传用默认（左下角按钮触发）。
 */
function showRestartConfirm(opts) {
  if (restartOverlay) closeRestartOverlay()
  const text = opts || {}
  const overlay = document.createElement('div')
  overlay.className = 'nio-confirm'
  overlay.setAttribute('data-nio-confirm', '1')
  const dialog = document.createElement('div')
  dialog.className = 'nio-confirm-dialog'
  dialog.setAttribute('role', 'dialog')
  dialog.setAttribute('aria-modal', 'true')
  dialog.setAttribute('aria-labelledby', 'nio-confirm-title')
  const title = document.createElement('div')
  title.className = 'nio-confirm-title'
  title.id = 'nio-confirm-title'
  title.textContent = text.title || '重启 DeepSeek Harness？'
  const desc = document.createElement('div')
  desc.className = 'nio-confirm-desc'
  desc.textContent = text.desc || '将硬性重启 DeepSeek Harness 服务：所有正在运行的会话会暂时中断，服务关闭后以相同方式重新启动，页面会自动恢复。'
  const actions = document.createElement('div')
  actions.className = 'nio-confirm-actions'
  const cancel = document.createElement('button')
  cancel.type = 'button'
  cancel.className = 'nio-confirm-btn'
  cancel.textContent = '取消'
  const ok = document.createElement('button')
  ok.type = 'button'
  ok.className = 'nio-confirm-btn nio-confirm-danger'
  ok.textContent = text.okText || '确认重启'
  actions.appendChild(cancel)
  actions.appendChild(ok)
  dialog.appendChild(title)
  dialog.appendChild(desc)
  dialog.appendChild(actions)
  overlay.appendChild(dialog)

  const onKey = (e) => { if (e.key === 'Escape') closeRestartOverlay() }
  const onDown = (e) => { if (e.target === overlay) closeRestartOverlay() }
  cancel.addEventListener('click', () => closeRestartOverlay())
  ok.addEventListener('click', () => {
    closeRestartOverlay()
    doRestart()
  })
  document.addEventListener('keydown', onKey)
  overlay.addEventListener('pointerdown', onDown)
  overlay._nioCleanup = () => {
    document.removeEventListener('keydown', onKey)
    overlay.removeEventListener('pointerdown', onDown)
  }
  document.body.appendChild(overlay)
  restartOverlay = overlay
  ok.focus()
}

/** 通知宿主端硬性重启，随后轮询探测服务恢复并自动刷新页面。 */
async function doRestart() {
  showRebootWait(false)
  // 宿主端在响应 flush 后约 300ms 退出进程；响应可能被截断，
  // 因此无论本次请求结果如何都进入轮询，直到服务恢复或超时。
  try { await rpc('restart') } catch { /* 进程可能已退出，忽略 */ }
  const started = Date.now()
  const timer = window.setInterval(async () => {
    let alive = false
    try {
      const res = await rpc('ping')
      alive = res.ok
    } catch { /* 服务尚未恢复 */ }
    if (alive) {
      window.clearInterval(timer)
      window.location.reload()
      return
    }
    if (Date.now() - started > 30000) {
      window.clearInterval(timer)
      showRebootWait(true)
    }
  }, 700)
}

/** 显示「正在重启 DeepSeek Harness…」全屏等待层；failed=true 时提示超时。 */
function showRebootWait(failed) {
  if (restartOverlay) closeRestartOverlay()
  const overlay = document.createElement('div')
  overlay.className = 'nio-reboot'
  overlay.setAttribute('data-nio-reboot', '1')
  if (!failed) {
    const spinner = document.createElement('div')
    spinner.className = 'nio-reboot-spinner'
    const text = document.createElement('div')
    text.className = 'nio-reboot-text'
    text.textContent = '正在重启 DeepSeek Harness…'
    overlay.appendChild(spinner)
    overlay.appendChild(text)
  } else {
    const text = document.createElement('div')
    text.className = 'nio-reboot-text'
    text.textContent = '重启似乎未完成，请手动刷新页面。'
    const retry = document.createElement('button')
    retry.type = 'button'
    retry.className = 'nio-confirm-btn nio-confirm-primary'
    retry.textContent = '刷新页面'
    retry.addEventListener('click', () => window.location.reload())
    overlay.appendChild(text)
    overlay.appendChild(retry)
  }
  document.body.appendChild(overlay)
  restartOverlay = overlay
}

/* ------------------------------------------------------------------ */
/* DOM 观察与扫描                                                       */
/* ------------------------------------------------------------------ */

/** 维护会话 header 工作区行、左下角重启按钮、工作区「⋯」菜单快捷按钮行与会话待办标记圆点（DOM 由 React 管理，每次变化后补回）。 */
function scan() {
  try { ensureHeaderRow() } catch { /* header 尚未就绪时静默跳过 */ }
  try { ensureRestartButton() } catch { /* 设置区尚未就绪时静默跳过 */ }
  try { ensureWorkspaceMenuActions() } catch { /* 菜单尚未就绪时静默跳过 */ }
  try { clearDoneOnOpen() } catch { /* 会话区尚未就绪时静默跳过 */ }
  try { ensureSessionDoneDots() } catch { /* 会话区尚未就绪时静默跳过 */ }
}

let scanScheduled = false
/** 用 requestAnimationFrame 合并高频 DOM 变化，下一帧统一扫描一次。 */
function scheduleScan() {
  if (scanScheduled) return
  scanScheduled = true
  window.requestAnimationFrame(() => {
    scanScheduled = false
    scan()
  })
}

/* ------------------------------------------------------------------ */
/* 样式                                                                */
/* ------------------------------------------------------------------ */

const CSS = `
/* 全部使用 DSH 主题语义变量（--dsw-alias-*），随亮/暗主题自动切换 */
/* 会话 header（wSkVaW_header 为原生类名）：收紧顶部留白 */
.wSkVaW_header{padding-top:5px !important}
/* 会话 header 工作区行（第一行） */
.nio-hrow{box-sizing:border-box;display:flex;align-items:center;gap:6px;min-height:20px;margin:0 0 2px;padding:2px 10px 2px 2px;background:var(--dsw-alias-interactive-bg-hover);border-radius:12px;width:fit-content;max-width:100%}
.nio-hchip{box-sizing:border-box;flex:none;max-width:260px;padding:1px 8px;border:1px solid color-mix(in srgb,var(--dsw-alias-state-business-primary) 30%,transparent);border-radius:999px;background:color-mix(in srgb,var(--dsw-alias-state-business-primary) 14%,transparent);color:var(--dsw-alias-state-business-primary);font-size:11px;line-height:15px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.nio-hbtn{position:relative;cursor:pointer;width:18px;height:18px;border:none;background:transparent;color:var(--dsw-alias-label-tertiary);border-radius:4px;padding:0;display:inline-flex;align-items:center;justify-content:center}
.nio-hbtn:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}
.nio-hbtn svg{display:block;width:14px;height:14px}
.nio-htip{position:absolute;top:calc(100% + 6px);left:50%;transform:translateX(-50%);white-space:nowrap;background:var(--dsw-alias-tooltip-bg);color:#f2f2f2;border:1px solid rgba(255,255,255,0.12);border-radius:6px;padding:4px 8px;font-size:11px;line-height:15px;pointer-events:none;opacity:0;transition:opacity .12s ease;z-index:2147483001;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif}
.nio-hbtn:hover .nio-htip{opacity:1}
.nio-hfeed{font-size:11px;line-height:16px;color:var(--dsw-alias-state-success-primary);padding:0 2px;white-space:nowrap}
.nio-hfeed.err{color:var(--dsw-alias-state-error-primary)}
/* 会话名（第二行）放大 */
[class*="crumbCurrent"]{font-size:19px !important;line-height:27px !important;max-width:none !important;font-weight:600 !important}
/* 工作区「⋯」菜单：快捷按钮行（挂在 list 末尾、viewport 滚动容器外） */
[data-nio-mqa-menu]{overflow:visible !important}
[data-nio-mqa-menu] > [role="presentation"]{max-height:none !important;overflow:visible !important}
.nio-mqa{box-sizing:border-box;display:flex;align-items:center;gap:4px;padding:6px 12px;border-top:1px solid var(--dsw-alias-border-l2);margin-top:2px}
.nio-mqa-btn{position:relative;width:22px;height:22px;color:var(--dsw-alias-label-secondary);background:transparent;border:none;border-radius:5px;padding:0;display:inline-flex;align-items:center;justify-content:center;cursor:pointer}
.nio-mqa-btn:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}
.nio-mqa-btn svg{display:block;width:14px;height:14px}
.nio-mqa-tip{position:absolute;top:calc(100% + 6px);left:50%;transform:translateX(-50%);white-space:nowrap;background:var(--dsw-alias-tooltip-bg);color:#f2f2f2;border:1px solid rgba(255,255,255,0.12);border-radius:6px;padding:4px 8px;font-size:11px;line-height:15px;pointer-events:none;opacity:0;transition:opacity .12s ease;z-index:2147483001;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif}
.nio-mqa-btn:hover .nio-mqa-tip{opacity:1}
.nio-mqa-feedback{font-size:11px;line-height:16px;color:var(--dsw-alias-state-success-primary);margin-left:2px;white-space:nowrap}
.nio-mqa-feedback.err{color:var(--dsw-alias-state-error-primary)}
/* 会话待办标记圆点：完整复刻原生 _dot_10orb_3（span 透明 + :before 晕圈 + :after 内芯，currentColor 着色） */
.nio-sdone{position:relative;box-sizing:border-box;flex:none;width:16px;height:20px;border:none;background:transparent;padding:0;margin:0;display:inline-flex;align-items:center;justify-content:center;cursor:pointer;color:var(--dsw-alias-label-tertiary)}
/* 内层圆点：与原生规则一致（position:relative + :before/:after 双层圆），仅颜色不同 */
.nio-sdone-dot{position:relative;display:inline-block;flex:none;width:10px;height:10px;box-sizing:border-box;opacity:0 !important;transition:opacity .12s ease,color .15s ease !important;color:var(--dsw-alias-label-tertiary) !important}
.nio-sdone-dot:before{content:"";position:absolute;top:0;right:0;bottom:0;left:0;border-radius:50%;background:currentColor;opacity:.1}
.nio-sdone-dot:after{content:"";position:absolute;top:20%;right:20%;bottom:20%;left:20%;border-radius:50%;background:currentColor}
[class*="sessionRow"]:hover .nio-sdone .nio-sdone-dot{opacity:.8 !important}
.nio-sdone:hover .nio-sdone-dot{opacity:1 !important}
.nio-sdone-marked .nio-sdone-dot{opacity:1 !important;color:var(--dsw-alias-state-success-primary) !important}
.nio-sdone-vh{clip:rect(0 0 0 0);white-space:nowrap;width:1px;height:1px;position:absolute;overflow:hidden}
.nio-sdone-tip{position:absolute;bottom:calc(100% + 6px);left:0;white-space:nowrap;background:var(--dsw-alias-tooltip-bg);color:#f2f2f2;border:1px solid rgba(255,255,255,0.12);border-radius:6px;padding:4px 8px;font-size:11px;line-height:15px;pointer-events:none;opacity:0;transition:opacity .12s ease;z-index:2147483001;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif}
.nio-sdone:hover .nio-sdone-tip{opacity:1}
/* 设置面板「界面功能」页 */
.nio-settings{display:flex;flex-direction:column;max-width:640px}
/* 顶部「重启以生效」横幅 */
.nio-settings-banner{box-sizing:border-box;align-items:center;gap:12px;margin:12px 0 4px;padding:10px 14px;border:1px solid color-mix(in srgb,var(--dsw-alias-state-business-primary) 35%,transparent);border-radius:10px;background:color-mix(in srgb,var(--dsw-alias-state-business-primary) 10%,transparent);display:flex}
.nio-settings-banner-text{flex:1;min-width:0;color:var(--dsw-alias-label-primary);font-size:13px;line-height:20px}
.nio-settings-banner-btn{box-sizing:border-box;flex:none;height:30px;padding:0 14px;border:none;border-radius:8px;background:var(--dsw-alias-state-business-primary);color:#fff;font-size:13px;line-height:30px;font-family:inherit;cursor:pointer}
.nio-settings-banner-btn:hover{opacity:.9}
.nio-settings-group{display:flex;flex-direction:column}
.nio-settings-row{box-sizing:border-box;border-bottom:1px solid var(--dsw-alias-border-l2);align-items:center;gap:16px;padding:16px 0;display:flex}
.nio-settings-group > .nio-settings-row{border-bottom:none}
.nio-settings-sub{box-sizing:border-box;align-items:center;gap:16px;padding:4px 0 16px 28px;display:flex}
.nio-settings-sub .nio-settings-title{font-weight:400;color:var(--dsw-alias-label-secondary)}
.nio-settings-sub::before{content:"";flex:none;width:2px;align-self:stretch;background:var(--dsw-alias-border-l2);border-radius:1px;margin-right:12px}
.nio-settings-text{flex:1;min-width:0}
.nio-settings-title{color:var(--dsw-alias-label-primary);font-size:14px;font-weight:500;line-height:22px}
.nio-settings-desc{color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:18px;margin-top:2px}
.nio-settings-toggle{position:relative;cursor:pointer;width:36px;height:20px;flex:none}
.nio-settings-toggle input{position:absolute;opacity:0;width:100%;height:100%;margin:0;cursor:pointer}
.nio-settings-toggle-track{box-sizing:border-box;display:block;width:36px;height:20px;border-radius:999px;background:var(--dsw-alias-border-l3);transition:background .15s ease;position:relative}
.nio-settings-toggle-track:after{content:"";position:absolute;top:2px;left:2px;width:16px;height:16px;border-radius:50%;background:var(--dsw-alias-label-primary-inverted);transition:transform .15s ease}
.nio-settings-toggle input:checked + .nio-settings-toggle-track{background:var(--dsw-alias-state-business-primary)}
.nio-settings-toggle input:checked + .nio-settings-toggle-track:after{transform:translateX(16px)}
.nio-settings-select{box-sizing:border-box;flex:none;min-width:200px;max-width:260px;height:32px;color:var(--dsw-alias-label-primary);background:var(--dsw-alias-bg-base);border:1px solid var(--dsw-alias-border-l2);border-radius:8px;padding:0 10px;font-size:13px;line-height:20px;font-family:inherit;cursor:pointer}
.nio-settings-select:focus{outline:none;border-color:var(--dsw-alias-state-business-primary)}
.nio-settings-select:disabled{opacity:.5;cursor:default}
.nio-settings-note{color:var(--dsw-alias-label-tertiary);font-size:13px;line-height:20px;padding:16px 0}
.nio-settings-error{color:var(--dsw-alias-state-error-primary);font-size:13px;line-height:20px;padding:16px 0}
/* 左下角重启按钮：absolute 定位在设置行右侧（定位上下文 = settingsArea） */
[class*="settingsArea"].nio-rst-area{position:relative}
/* 默认：灰色半透明；hover：变为红色（硬性重启警示色） */
.nio-rst{position:absolute;right:8px;top:50%;transform:translateY(-50%);width:28px;height:28px;color:color-mix(in srgb,var(--dsw-alias-label-secondary) 55%,transparent);background:transparent;border:none;border-radius:50%;padding:0;display:inline-flex;align-items:center;justify-content:center;cursor:pointer;transition:color .15s ease,background .15s ease}
.nio-rst:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-state-error-primary)}
.nio-rst svg{display:block;width:15px;height:15px}
.nio-rst-tip{position:absolute;bottom:calc(100% + 8px);left:50%;transform:translateX(-50%);white-space:nowrap;background:var(--dsw-alias-tooltip-bg);color:#f2f2f2;border:1px solid rgba(255,255,255,0.12);border-radius:6px;padding:4px 8px;font-size:11px;line-height:15px;pointer-events:none;opacity:0;transition:opacity .12s ease;z-index:2147483001;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif}
.nio-rst:hover .nio-rst-tip{opacity:1}
/* 重启二次确认框 */
.nio-confirm{position:fixed;inset:0;z-index:2147483003;display:flex;align-items:center;justify-content:center;background:var(--dsw-alias-bg-mask-1);backdrop-filter:blur(2px)}
.nio-confirm-dialog{box-sizing:border-box;width:min(420px,calc(100vw - 48px));background:var(--dsw-alias-bg-overlay);border:1px solid var(--dsw-alias-border-l2);border-radius:16px;box-shadow:var(--dsw-shadow-lv3,0 10px 32px rgba(0,0,0,.35));padding:20px;display:flex;flex-direction:column;gap:10px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif}
.nio-confirm-title{color:var(--dsw-alias-label-primary);font-size:16px;font-weight:600;line-height:24px}
.nio-confirm-desc{color:var(--dsw-alias-label-secondary);font-size:13px;line-height:20px}
.nio-confirm-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:6px}
.nio-confirm-btn{box-sizing:border-box;height:32px;padding:0 16px;border:1px solid var(--dsw-alias-border-l2);border-radius:8px;background:transparent;color:var(--dsw-alias-label-primary);font-size:13px;line-height:30px;font-family:inherit;cursor:pointer}
.nio-confirm-btn:hover{background:var(--dsw-alias-interactive-bg-hover)}
.nio-confirm-danger{background:var(--dsw-alias-state-error-primary);border-color:transparent;color:#fff}
.nio-confirm-danger:hover{background:var(--dsw-alias-state-error-primary);opacity:.9}
.nio-confirm-primary{background:var(--dsw-alias-state-business-primary);border-color:transparent;color:#fff}
.nio-confirm-primary:hover{background:var(--dsw-alias-state-business-primary);opacity:.9}
/* 重启等待层 */
.nio-reboot{position:fixed;inset:0;z-index:2147483003;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;background:var(--dsw-alias-bg-mask-1);backdrop-filter:blur(2px);font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif}
.nio-reboot-spinner{width:26px;height:26px;border:2px solid var(--dsw-alias-border-l2);border-top-color:var(--dsw-alias-state-business-primary);border-radius:50%;animation:nio-reboot-spin .8s linear infinite}
@keyframes nio-reboot-spin{to{transform:rotate(360deg)}}
.nio-reboot-text{color:var(--dsw-alias-label-primary);font-size:14px;line-height:22px}
`

/* ------------------------------------------------------------------ */
/* 插件入口                                                             */
/* ------------------------------------------------------------------ */

/**
 * 声明本客户端插件依赖的注入服务名：无。
 * `sessions` / `workspaces` / `slots` 均为可选读取（ctx.get），不声明硬依赖：
 * header 注入在数据就绪前静默跳过，MutationObserver 就绪后自动补回；
 * 工作区菜单注入通过 workspaces service 解析 title→path；
 * 设置面板通过 slots.inject 等待 settings.section 声明出现后注册。
 */
export const inject = []

/** 浏览器插件入口：注入样式、挂起 DOM 观察器、注册设置页并预热配置。 */
export function apply(ctx) {
  runtimeCtx = ctx

  ctx.effect(() => {
    const tag = document.createElement('style')
    tag.setAttribute('data-plugin', 'dsh-niao-quick-open')
    tag.setAttribute('data-plugin-css', 'dsh-niao-quick-open')
    tag.textContent = CSS
    document.head.append(tag)
    return () => tag.remove()
  }, 'dsh-niao-quick-open: styles')

  ctx.effect(() => {
    const observer = new MutationObserver(scheduleScan)
    observer.observe(document.body, { childList: true, subtree: true })
    scan()
    // 兜底轮询：设置区可能晚于首帧渲染，且 MutationObserver 在个别
    // 时序下可能漏触发；注入成功前每 1s 重试，最多 20s。
    let tries = 0
    const timer = window.setInterval(() => {
      tries += 1
      if (tries > 20) { window.clearInterval(timer); return }
      if (document.querySelector('[data-nio-rst]')) { window.clearInterval(timer); return }
      scan()
    }, 1000)
    return () => { observer.disconnect(); window.clearInterval(timer) }
  }, 'dsh-niao-quick-open: observer')

  ctx.effect(() => {
    refreshConfig().then(migrateLegacyEditor)
    return () => {}
  }, 'dsh-niao-quick-open: config')

  // 注册设置弹窗左侧边的「界面功能」设置页（slots 可选，未就绪时跳过）。
  const slots = ctx.get('slots')
  if (!slots) return
  slots.inject('settings.section', () => slots.register(
    {
      name: 'settings.section',
      id: 'dsh-niao-quick-open',
      order: 35,
      label: () => (document.documentElement.lang && document.documentElement.lang.startsWith('en') ? 'UI Features' : '界面功能'),
    },
    () => React.createElement(ConfigPanel, null),
  ))
}
