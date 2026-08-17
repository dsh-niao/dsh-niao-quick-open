/**
 * dsh-niao-quick-open — 浏览器端（静态 bundle 入口）。
 *
 * 在左侧工作区列表的「悬浮卡片」上注入快捷操作：
 *   1. 工作区名称行 / 绝对路径行 各带一个复制按钮——点名称/路径本身或复制按钮均复制对应内容；
 *   2. 路径下方三个图标按钮：在文件管理器中打开 / 在常用编辑器中打开 / 设置常用编辑器（悬停显示提示文字）；
 *   3. 编辑器列表由宿主侧扫描生成（已知品牌 + 关键词动态扫描），选择后持久化到 localStorage。
 *
 * 原生悬浮卡片不是 Slot，无法用插槽注入，因此本插件直接观察 document.body 的 DOM
 * 变化：卡片出现时增强它；React 重渲染清掉注入节点时（childList 变化）自动补回。
 * 所有宿主能力（编辑器扫描 / 执行打开命令）通过同源 JSON 路由 /api/dsh-niao-quick-open 完成。
 *
 * 纯 DOM 实现：不依赖 React，不访问任何 ctx 服务（inject 为空数组）。
 *
 * @module dsh-niao-quick-open/client
 */

/** 宿主路由（与 lib/index.js 的 ROUTE_PATH 对应）。 */
const ROUTE = '/api/dsh-niao-quick-open'
/** 常用编辑器选择的 localStorage 键。 */
const EDITOR_KEY = 'dsh.niao.quickOpen.editor'

/** 读取已设置的常用编辑器 id；未设置返回 null。 */
function getEditor() {
  try { return window.localStorage.getItem(EDITOR_KEY) } catch { return null }
}

/** 保存常用编辑器 id；传 null 表示清除。 */
function setEditor(id) {
  try {
    if (id) window.localStorage.setItem(EDITOR_KEY, id)
    else window.localStorage.removeItem(EDITOR_KEY)
  } catch { /* 存储不可用时静默忽略 */ }
}

const isMac = /Mac|iPhone|iPad|iPod/i.test(navigator.userAgent || '')
const isWin = /Windows|Win32|Win64/i.test(navigator.userAgent || '')
/** 文件管理器按钮文案，随操作系统自适应。 */
const finderLabel = isWin ? '在资源管理器中打开' : isMac ? '在访达中打开' : '在文件管理器中打开'

/* ------------------------------------------------------------------ */
/* 图标（16×16 线性路径，与宿主品牌图标同一套视觉语言）                    */
/* ------------------------------------------------------------------ */

const COPY_PATH = 'M6.14929 4.02032C7.11197 4.02032 7.87983 4.02016 8.49597 4.07598C9.12128 4.13269 9.65792 4.25188 10.1415 4.53106C10.7202 4.8653 11.2008 5.3459 11.535 5.92462C11.8142 6.40818 11.9334 6.94481 11.9901 7.57012C12.0459 8.18625 12.0458 8.95419 12.0458 9.9168C12.0458 10.8795 12.0459 11.6473 11.9901 12.2635C11.9334 12.8888 11.8142 13.4254 11.535 13.909C11.2008 14.4877 10.7202 14.9683 10.1415 15.3025C9.65792 15.5817 9.12128 15.7009 8.49597 15.7576C7.87984 15.8134 7.11196 15.8133 6.14929 15.8133C5.18667 15.8133 4.41874 15.8134 3.80261 15.7576C3.1773 15.7009 2.64067 15.5817 2.1571 15.3025C1.5784 14.9683 1.09778 14.4877 0.76355 13.909C0.484366 13.4254 0.365184 12.8888 0.308472 12.2635C0.252649 11.6473 0.252808 10.8795 0.252808 9.9168C0.252808 8.95418 0.252664 8.18625 0.308472 7.57012C0.365184 6.94481 0.484366 6.40818 0.76355 5.92462C1.09777 5.34589 1.57839 4.86529 2.1571 4.53106C2.64067 4.25188 3.1773 4.13269 3.80261 4.07598C4.41874 4.02017 5.18666 4.02032 6.14929 4.02032ZM6.14929 5.37774C5.16181 5.37774 4.46634 5.37761 3.92566 5.42657C3.39434 5.47472 3.07859 5.56574 2.83582 5.70587C2.4632 5.92106 2.15354 6.2307 1.93835 6.60333C1.79823 6.8461 1.70721 7.16185 1.65906 7.69317C1.6101 8.23385 1.61023 8.92933 1.61023 9.9168C1.61023 10.9043 1.61009 11.5998 1.65906 12.1404C1.70721 12.6717 1.79823 12.9875 1.93835 13.2303C2.15356 13.6029 2.46321 13.9126 2.83582 14.1277C3.07859 14.2679 3.39434 14.3589 3.92566 14.407C4.46634 14.456 5.16182 14.4559 6.14929 14.4559C7.13682 14.4559 7.83224 14.456 8.37292 14.407C8.90425 14.3589 9.21999 14.2679 9.46277 14.1277C9.83535 13.9126 10.145 13.6029 10.3602 13.2303C10.5004 12.9875 10.5914 12.6717 10.6395 12.1404C10.6885 11.5998 10.6884 10.9043 10.6884 9.9168C10.6884 8.92934 10.6885 8.23384 10.6395 7.69317C10.5914 7.16185 10.5004 6.8461 10.3602 6.60333C10.1451 6.23071 9.83536 5.92107 9.46277 5.70587C9.21999 5.56574 8.90424 5.47472 8.37292 5.42657C7.83224 5.3776 7.13682 5.37774 6.14929 5.37774ZM9.80164 0.367975C10.7638 0.367975 11.5314 0.36788 12.1473 0.423639C12.7726 0.480307 13.3093 0.598759 13.7928 0.877741C14.3717 1.21192 14.8521 1.69355 15.1864 2.27227C15.4655 2.75574 15.5857 3.29164 15.6425 3.9168C15.6983 4.53301 15.6971 5.3016 15.6971 6.26446V7.82989C15.6971 8.29264 15.6989 8.58993 15.6649 8.84844C15.4668 10.3525 14.401 11.5738 12.9833 11.9988V10.5467C13.6973 10.1903 14.2105 9.49662 14.3192 8.67169C14.3387 8.52347 14.3407 8.3358 14.3407 7.82989V6.26446C14.3407 5.27706 14.3398 4.58149 14.2909 4.04083C14.2428 3.50968 14.1526 3.19372 14.0126 2.95098C13.7974 2.57849 13.4876 2.26869 13.1151 2.05352C12.8724 1.91347 12.5564 1.82237 12.0253 1.77423C11.4847 1.72528 10.7888 1.7254 9.80164 1.7254H7.71472C6.7562 1.72558 5.92665 2.27697 5.52332 3.07891H4.07019C4.54221 1.51132 5.9932 0.368186 7.71472 0.367975H9.80164Z'
const FOLDER_PATH = 'M5.19629 1.57104C5.81144 1.5711 6.38623 1.8786 6.72754 2.39038L7.19922 3.09839C7.28454 3.22635 7.42824 3.30344 7.58203 3.30347H12.1699C13.5039 3.30348 14.5859 4.38548 14.5859 5.71948V6.62671C15.2694 7.02689 15.6605 7.85012 15.4385 8.68726L14.3848 12.658C14.1037 13.7164 13.1449 14.4527 12.0498 14.4529H2.91699C1.51651 14.4529 0.451662 13.2814 0.501954 11.9519V3.98706C0.501954 2.65305 1.58396 1.57104 2.91797 1.57104H5.19629ZM3.7793 7.75562C3.30994 7.75562 2.89883 8.07153 2.77832 8.52515L1.91602 11.7722C1.74167 12.4291 2.23734 13.073 2.91699 13.073H12.0498C12.5191 13.0728 12.9304 12.757 13.0508 12.3035L14.1045 8.33374C14.1819 8.04202 13.9619 7.756 13.6602 7.75562H3.7793ZM2.91797 2.9519C2.34625 2.9519 1.88281 3.41534 1.88281 3.98706V7.2937C2.33068 6.7269 3.02249 6.37476 3.7793 6.37476H13.2051V5.71948C13.2051 5.14777 12.7416 4.68434 12.1699 4.68433H7.58203C6.96675 4.6843 6.39209 4.37595 6.05078 3.86401L5.5791 3.15601C5.49379 3.02821 5.34995 2.95196 5.19629 2.9519H2.91797Z'
const CODE_PATH = 'M12.3368 1.53569L11.931 4.43172H14.8086V5.79673H11.7404L11.1962 9.67859H14.2839V11.0436H11.0056L10.4994 14.6529L9.14873 14.4643L9.62731 11.0436H5.75876L5.25252 14.6529L3.90186 14.4643L4.38043 11.0436H1.69141V9.67859H4.57104L5.11417 5.79673H2.21609V4.43172H5.30581L5.73724 1.34713L7.08995 1.53569L6.68414 4.43172H10.5527L10.9841 1.34713L12.3368 1.53569ZM5.94937 9.67859H9.81791L10.361 5.79673H6.49353L5.94937 9.67859Z'
const GEAR_PATH = 'M14.0861 5.51366C13.8717 5.0575 13.588 4.58542 13.2889 4.18108C13.208 4.07172 13.1596 4.04373 13.0243 4.03054C12.4277 3.97255 11.8245 4.05527 11.2269 3.9972C10.7224 3.94816 10.3133 3.71661 10.0115 3.30919C9.66986 2.84777 9.43973 2.31343 9.09824 1.85234C9.01771 1.74365 8.96805 1.71589 8.83354 1.70282C8.29432 1.65044 7.70402 1.65061 7.16656 1.70282C7.03205 1.71589 6.98239 1.74365 6.90186 1.85234C6.56067 2.31303 6.33025 2.84774 5.98855 3.30919C5.68681 3.71661 5.27774 3.94816 4.77317 3.9972C4.17564 4.05527 3.57239 3.97255 2.97585 4.03054C2.84046 4.04373 2.79208 4.07172 2.71115 4.18108C2.41212 4.58542 2.12835 5.0575 1.91403 5.51366C1.85299 5.64359 1.85286 5.7018 1.91403 5.8319C2.14865 6.33077 2.49748 6.76892 2.73237 7.26854C2.9594 7.7515 2.96041 8.24717 2.73338 8.73044C2.49837 9.23061 2.14891 9.66837 1.91403 10.1681C1.85291 10.2982 1.85299 10.3564 1.91403 10.4863C2.12856 10.9429 2.41185 11.4142 2.71115 11.8189C2.79208 11.9283 2.84046 11.9563 2.97585 11.9694C3.57239 12.0274 4.17564 11.9447 4.77317 12.0028C5.27774 12.0518 5.68681 12.2834 5.98855 12.6908C6.33024 13.1522 6.56037 13.6866 6.90186 14.1476C6.98239 14.2563 7.03205 14.2841 7.16656 14.2972C7.70402 14.3494 8.29432 14.3495 8.83354 14.2972C8.96805 14.2841 9.01771 14.2563 9.09824 14.1476C9.43944 13.687 9.66985 13.1522 10.0115 12.6908C10.3133 12.2834 10.7224 12.0518 11.2269 12.0028C11.8244 11.9447 12.4271 12.0275 13.0243 11.9694C13.1596 11.9563 13.208 11.9283 13.2889 11.8189C13.5891 11.4131 13.872 10.942 14.0861 10.4863C14.1471 10.3564 14.1472 10.2982 14.0861 10.1681C13.8513 9.66861 13.5017 9.23061 13.2667 8.73044C13.0397 8.24717 13.0407 7.7515 13.2677 7.26854C13.5026 6.7689 13.8513 6.33106 14.0861 5.8319C14.1472 5.7018 14.1471 5.64359 14.0861 5.51366ZM15.3035 6.40373C15.0685 6.90359 14.7188 7.34119 14.4841 7.84037C14.4231 7.97025 14.423 8.02855 14.4841 8.15861C14.7189 8.65833 15.0685 9.09611 15.3035 9.59626C15.5308 10.0801 15.5308 10.5744 15.3035 11.0582C15.052 11.5933 14.7225 12.1426 14.37 12.6191C14.0685 13.0265 13.6581 13.259 13.1536 13.3081C12.5566 13.366 11.9541 13.2835 11.3573 13.3414C11.2228 13.3545 11.1731 13.3823 11.0926 13.491C10.7511 13.9521 10.521 14.4864 10.1793 14.9478C9.87828 15.3542 9.46719 15.5869 8.96387 15.6358C8.34008 15.6964 7.66194 15.6966 7.03623 15.6358C6.53291 15.5869 6.12182 15.3542 5.82084 14.9478C5.47911 14.4863 5.24878 13.9517 4.90753 13.491C4.82701 13.3823 4.77734 13.3545 4.64284 13.3414C4.04647 13.2835 3.44373 13.366 2.84653 13.3081C2.34201 13.259 1.93164 13.0265 1.63013 12.6191C1.27867 12.144 0.948453 11.5941 0.696621 11.0582C0.469315 10.5744 0.469279 10.0801 0.696621 9.59626C0.931628 9.09613 1.2813 8.65807 1.51597 8.15861C1.57708 8.02855 1.57702 7.97025 1.51597 7.84037C1.28117 7.34095 0.931635 6.9036 0.696621 6.40373C0.469213 5.91992 0.469367 5.42562 0.696621 4.94183C0.948441 4.40587 1.27868 3.85598 1.63013 3.38092C1.93164 2.97349 2.34201 2.74095 2.84653 2.6919C3.44353 2.63397 4.04599 2.71649 4.64284 2.65856C4.77734 2.64549 4.82701 2.61774 4.90753 2.50904C5.24905 2.04792 5.47913 1.51362 5.82084 1.05219C6.12182 0.645806 6.53291 0.413119 7.03623 0.364178C7.66002 0.303556 8.33816 0.303369 8.96387 0.364178C9.46719 0.413119 9.87828 0.645806 10.1793 1.05219C10.521 1.51365 10.7513 2.04828 11.0926 2.50904C11.1731 2.61774 11.2228 2.64549 11.3573 2.65856C11.9541 2.71649 12.5566 2.63397 13.1536 2.6919C13.6581 2.74095 14.0685 2.97349 14.37 3.38092C14.7214 3.85598 15.0517 4.40587 15.3035 4.94183C15.5307 5.42562 15.5309 5.91992 15.3035 6.40373Z'
const GEAR_INNER = 'M9.13764 7.99999C9.13764 7.3715 8.62855 6.8624 8.00005 6.8624C7.37155 6.8624 6.86246 7.3715 6.86246 7.99999C6.86246 8.62849 7.37155 9.13759 8.00005 9.13759C8.62855 9.13759 9.13764 8.62849 9.13764 7.99999ZM10.4834 7.99999C10.4834 9.37126 9.37132 10.4833 8.00005 10.4833C6.62878 10.4833 5.51674 9.37126 5.51674 7.99999C5.51674 6.62873 6.62878 5.51669 8.00005 5.51669C9.37132 5.51669 10.4834 6.62873 10.4834 7.99999Z'

/** 用一组 path 数据生成 16×16 SVG 元素。 */
function makeSvg(ds) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svg.setAttribute('width', '14')
  svg.setAttribute('height', '14')
  svg.setAttribute('viewBox', '0 0 16 16')
  svg.setAttribute('fill', 'none')
  for (const d of ds) {
    const p = document.createElementNS('http://www.w3.org/2000/svg', 'path')
    p.setAttribute('d', d)
    p.setAttribute('fill', 'currentColor')
    svg.appendChild(p)
  }
  return svg
}

const copySvg = makeSvg([COPY_PATH])
const folderSvg = makeSvg([FOLDER_PATH])
const codeSvg = makeSvg([CODE_PATH])
const gearSvg = makeSvg([GEAR_PATH, GEAR_INNER])

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

/** 在卡片内按类名子串查找第一个后代元素。 */
function findDescendant(card, token) {
  const all = card.querySelectorAll(`[class*="${token}"]`)
  return all.length ? all[0] : null
}

/** 判断元素是否为原生工作区悬浮卡片（body 直接子节点 + 定位样式 + 含路径行）。 */
function isWorkspaceCard(el) {
  if (!el || el.nodeType !== 1) return false
  if (el.parentNode !== document.body) return false
  const st = el.style
  if (!st || !st.left || !st.top) return false
  return !!findDescendant(el, 'hoverPath')
}

/** 鼠标是否在给定节点上选中了文本（有选区时不触发复制，与原生行为一致）。 */
function hasSelectionOver(node) {
  try {
    const sel = window.getSelection()
    if (!sel || sel.isCollapsed) return false
    for (let i = 0; i < sel.rangeCount; i++) {
      if (sel.getRangeAt(i).intersectsNode(node)) return true
    }
  } catch { /* 选区 API 不可用时忽略 */ }
  return false
}

/* ------------------------------------------------------------------ */
/* 卡片增强                                                             */
/* ------------------------------------------------------------------ */

/** 在卡片底部显示一条反馈文字，3 秒后自动消失。 */
function feedback(card, text, cls) {
  const old = card.querySelector('[data-nio-feedback]')
  if (old) old.remove()
  const chip = document.createElement('div')
  chip.className = 'nio-feedback ' + (cls || '')
  chip.setAttribute('data-nio-feedback', '1')
  chip.textContent = text
  card.appendChild(chip)
  window.setTimeout(() => { if (chip.isConnected) chip.remove() }, 3000)
}

/** 复制名称或路径，成功后给出对应反馈。 */
function flashCopy(card, kind) {
  const el = findDescendant(card, kind === 'copy-name' ? 'hoverTitle' : 'hoverPath')
  const text = el ? (el.textContent || '').trim() : ''
  if (!text) return
  copyText(text).then((ok) => {
    if (!ok || !card.isConnected) return
    feedback(card, kind === 'copy-name' ? '已复制工作区名称' : '已复制工作区绝对路径', '')
  })
}

/**
 * 把原生文本行包装成「文本 + 复制按钮」行。
 * 点复制按钮或整行（无选区时）都会复制对应内容。
 */
function makeRow(card, nativeEl, kind) {
  const row = document.createElement('div')
  row.className = 'nio-row'
  row.setAttribute('data-nio-row', kind)
  const label = document.createElement('div')
  label.className = 'nio-row-label'
  nativeEl.parentNode.insertBefore(row, nativeEl)
  label.appendChild(nativeEl)
  row.appendChild(label)
  const btn = document.createElement('button')
  btn.type = 'button'
  btn.className = 'nio-copy-btn'
  btn.setAttribute('data-nio-copy', kind)
  const tip = kind === 'copy-name' ? '复制工作区名称' : '复制工作区绝对路径'
  btn.title = tip
  btn.setAttribute('aria-label', tip)
  btn.appendChild(copySvg.cloneNode(true))
  btn.addEventListener('click', (e) => { e.stopPropagation(); flashCopy(card, kind) })
  row.appendChild(btn)
  row.addEventListener('click', (e) => {
    e.stopPropagation()
    if (hasSelectionOver(row)) return
    flashCopy(card, kind)
  })
  return row
}

/** 弹出「设置常用编辑器」菜单（下拉框 + 取消/保存）。 */
function showMenu(card) {
  const old = card.querySelector('[data-nio-menu]')
  if (old) old.remove()
  const menu = document.createElement('div')
  menu.className = 'nio-menu'
  menu.setAttribute('data-nio-menu', '1')
  const head = document.createElement('div')
  head.className = 'nio-menu-head'
  head.textContent = '设置常用编辑器'
  const field = document.createElement('div')
  field.className = 'nio-menu-field'
  const label = document.createElement('div')
  label.className = 'nio-menu-label'
  label.textContent = '编辑器'
  const select = document.createElement('select')
  select.className = 'nio-select'
  const note = document.createElement('div')
  note.className = 'nio-menu-note'
  note.textContent = '正在检索已安装的编辑器…'
  field.appendChild(label)
  field.appendChild(select)
  field.appendChild(note)
  const foot = document.createElement('div')
  foot.className = 'nio-menu-foot'
  const cancel = document.createElement('button')
  cancel.type = 'button'
  cancel.className = 'nio-menu-btn'
  cancel.textContent = '取消'
  cancel.addEventListener('click', (e) => { e.stopPropagation(); menu.remove() })
  const save = document.createElement('button')
  save.type = 'button'
  save.className = 'nio-menu-btn primary'
  save.textContent = '保存'
  save.addEventListener('click', (e) => {
    e.stopPropagation()
    setEditor(select.value || null)
    menu.remove()
  })
  foot.appendChild(cancel)
  foot.appendChild(save)
  menu.appendChild(head)
  menu.appendChild(field)
  menu.appendChild(foot)
  card.appendChild(menu)
  select.value = getEditor() || ''
  rpc('list-editors', {}).then((res) => {
    if (!select.isConnected) return
    while (select.firstChild) select.removeChild(select.firstChild)
    const opt0 = document.createElement('option')
    opt0.value = ''
    opt0.textContent = '未设置'
    select.appendChild(opt0)
    if (!res.ok) {
      note.textContent = '编辑器列表加载失败: ' + res.error
      note.classList.add('err')
      return
    }
    const list = Array.isArray(res.value) ? res.value : []
    if (list.length === 0) {
      note.textContent = '未检测到支持的编辑器'
      return
    }
    note.textContent = ''
    for (const ed of list) {
      const o = document.createElement('option')
      o.value = ed.id
      o.textContent = ed.name
      select.appendChild(o)
    }
    select.value = getEditor() || ''
  })
}

/** 切换「设置常用编辑器」菜单的显示状态。 */
function toggleMenu(card) {
  const m = card.querySelector('[data-nio-menu]')
  if (m) m.remove()
  else showMenu(card)
}

/** 读取卡片上的工作区绝对路径（hoverPath 行文本）。 */
function cardPath(card) {
  const pathEl = findDescendant(card, 'hoverPath')
  return pathEl ? (pathEl.textContent || '').trim() : ''
}

/** 用已设置的常用编辑器打开工作区；未设置时先弹出设置菜单。 */
async function openWithEditor(card) {
  const path = cardPath(card)
  if (!path) return
  const id = getEditor()
  if (!id) { showMenu(card); return }
  const res = await rpc('open-with-editor', { cwd: path, editorId: id })
  if (!res.ok) feedback(card, '打开失败: ' + res.error, 'err')
  else if (res.value && res.value.opened === false) feedback(card, '打开失败: ' + (res.value.reason || '未知原因'), 'err')
}

/** 在文件管理器中打开工作区。 */
async function openInFinder(card) {
  const path = cardPath(card)
  if (!path) return
  const res = await rpc('open-in-finder', { cwd: path })
  if (!res.ok) feedback(card, '打开失败: ' + res.error, 'err')
  else if (res.value && res.value.ok === false) feedback(card, '打开失败: 命令执行失败', 'err')
}

/** 生成三个图标操作按钮（悬停显示提示文字）。 */
function makeActions(card) {
  const wrap = document.createElement('div')
  wrap.className = 'nio-actions'
  wrap.setAttribute('data-nio-actions', '1')
  const mk = (tip, icon, onClick) => {
    const btn = document.createElement('button')
    btn.type = 'button'
    btn.className = 'nio-action-btn'
    btn.setAttribute('aria-label', tip)
    const tipEl = document.createElement('span')
    tipEl.className = 'nio-tip'
    tipEl.textContent = tip
    btn.appendChild(icon.cloneNode(true))
    btn.appendChild(tipEl)
    btn.addEventListener('click', (e) => { e.stopPropagation(); onClick() })
    return btn
  }
  wrap.appendChild(mk(finderLabel, folderSvg, () => openInFinder(card)))
  wrap.appendChild(mk('在常用编辑器中打开', codeSvg, () => openWithEditor(card)))
  wrap.appendChild(mk('设置常用编辑器', gearSvg, () => toggleMenu(card)))
  return wrap
}

/**
 * 增强一张工作区悬浮卡片：
 *  - 首次绑定时拦截默认「点击复制路径」行为（click / keydown 全部 stopPropagation，
 *    并去掉 role/tabindex/aria-label）；
 *  - 注入名称/路径复制行与三个操作按钮。
 * 幂等：已注入过的部分不会重复插入。
 */
function enhance(card) {
  if (!card.dataset.nioBound) {
    card.dataset.nioBound = '1'
    card.addEventListener('click', (e) => { e.stopPropagation() }, false)
    card.addEventListener('keydown', (e) => { e.stopPropagation(); e.preventDefault() }, false)
    card.removeAttribute('role')
    card.removeAttribute('tabindex')
    card.removeAttribute('aria-label')
  }
  const titleEl = findDescendant(card, 'hoverTitle')
  const pathEl = findDescendant(card, 'hoverPath')
  if (!titleEl || !pathEl) return
  const content = titleEl.parentNode
  if (!content) return
  if (!card.querySelector('[data-nio-row="copy-name"]')) makeRow(card, titleEl, 'copy-name')
  if (!card.querySelector('[data-nio-row="copy-path"]')) makeRow(card, pathEl, 'copy-path')
  if (!card.querySelector('[data-nio-actions]')) content.appendChild(makeActions(card))
}

/* ------------------------------------------------------------------ */
/* DOM 观察与扫描                                                       */
/* ------------------------------------------------------------------ */

/** 扫描当前所有工作区卡片并增强。 */
function scan() {
  const kids = document.body.children
  for (let i = 0; i < kids.length; i++) {
    const el = kids[i]
    if (isWorkspaceCard(el)) {
      try { enhance(el) } catch { /* 单卡失败不影响其余卡片 */ }
    }
  }
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
.nio-row{display:flex;align-items:center;gap:6px;cursor:pointer;border-radius:4px}
.nio-row:hover{background:rgba(255,255,255,0.08)}
.nio-row-label{flex:1;min-width:0}
.nio-copy-btn{flex:none;cursor:pointer;width:16px;height:16px;border:none;background:transparent;color:rgba(255,255,255,0.55);border-radius:4px;padding:0;display:inline-flex;align-items:center;justify-content:center}
.nio-copy-btn:hover{color:#fff;background:rgba(255,255,255,0.15)}
.nio-copy-btn svg{display:block}
.nio-actions{display:flex;align-items:center;gap:4px;margin-top:4px}
.nio-action-btn{position:relative;cursor:pointer;width:26px;height:26px;border:none;background:rgba(255,255,255,0.07);border-radius:6px;color:rgba(255,255,255,0.75);padding:0;display:inline-flex;align-items:center;justify-content:center}
.nio-action-btn:hover{background:rgba(255,255,255,0.16);color:#fff}
.nio-action-btn svg{display:block}
.nio-tip{position:absolute;top:calc(100% + 6px);left:50%;transform:translateX(-50%);white-space:nowrap;background:rgba(20,20,24,0.96);color:#f2f2f2;border:1px solid rgba(255,255,255,0.12);border-radius:6px;padding:4px 8px;font-size:11px;line-height:15px;pointer-events:none;opacity:0;transition:opacity .12s ease;z-index:2147483001;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif}
.nio-action-btn:hover .nio-tip{opacity:1}
.nio-menu{display:flex;flex-direction:column;gap:8px;border-top:1px solid rgba(255,255,255,0.12);padding-top:8px;margin-top:4px}
.nio-menu-head{font-size:12px;font-weight:600;color:#fff}
.nio-menu-field{display:flex;flex-direction:column;gap:5px}
.nio-menu-label{font-size:11px;color:rgba(255,255,255,0.65)}
.nio-select{box-sizing:border-box;width:100%;height:28px;color:#fff;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.18);border-radius:6px;padding:0 6px;font-size:12px;font-family:inherit;outline:none}
.nio-select:focus{border-color:rgba(88,130,255,0.6)}
.nio-menu-note{font-size:11px;color:rgba(255,255,255,0.6)}
.nio-menu-note.err{color:#ff8f8f}
.nio-menu-foot{display:flex;justify-content:flex-end;gap:8px}
.nio-menu-btn{cursor:pointer;border:1px solid rgba(255,255,255,0.14);background:rgba(255,255,255,0.08);color:#e6e8eb;border-radius:6px;padding:3px 10px;font-size:11px;line-height:16px;font-family:inherit}
.nio-menu-btn:hover{background:rgba(255,255,255,0.16)}
.nio-menu-btn.primary{border-color:rgba(88,130,255,0.55);color:#c9d6ff;background:rgba(88,130,255,0.16)}
.nio-menu-btn.primary:hover{background:rgba(88,130,255,0.26)}
.nio-feedback{font-size:11px;line-height:16px;color:#b8f0c4;text-align:center;padding:2px 0}
.nio-feedback.err{color:#ff8f8f}
`

/* ------------------------------------------------------------------ */
/* 插件入口                                                             */
/* ------------------------------------------------------------------ */

/**
 * 声明本客户端插件依赖的注入服务名。
 * 本插件不访问任何 ctx 服务（纯 DOM + fetch），保持空数组即可。
 */
export const inject = []

/** 浏览器插件入口：注入样式并挂起 DOM 观察器。 */
export function apply(ctx) {
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
    return () => observer.disconnect()
  }, 'dsh-niao-quick-open: observer')
}
