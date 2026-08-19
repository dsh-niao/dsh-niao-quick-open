/**
 * dsh-niao-quick-open — 浏览器端：会话右侧「用户消息导航条」（Rail 实现）。
 *
 * 复刻 DeepSeek 网页版交互：当本会话用户消息 ≥ 2 条且内容超过一屏时，
 * 在对话区域右侧（紧贴滚动条左侧）**常驻**悬浮一条竖直胶囊面板，每条
 * 用户消息对应一个标记圆点（flex 自然罗列，面板高度由节点撑开）：
 *  - 悬停标记：弹出摘要卡片（「第 N 条提问」标题 + 消息正文截断摘要）；
 *  - 点击标记：对话区平滑滚动到该消息附近；
 *  - 当前视口内的消息标记高亮为品牌色（定位当前阅读位置）；
 *  - 面板底部显示用户消息总数徽标；
 *  - 面板常驻显示（不随鼠标靠近/离开显隐），滚动 / 流式输出时只重定位
 *    标记与高亮，不闪烁。
 *
 * 数据来源：读取 DSH 已渲染的会话行 [data-chat-anchor-key]，按
 * data-chat-flow-kind 为 'user'（正常提问）或 'steering'（插话，同为
 * 用户输入）过滤（与 delete-message.js 同一套稳定 data 属性，不依赖
 * hash 类名）；纯浏览器端，零宿主端改动。
 *
 * @module dsh-niao-quick-open/client/nav-rail
 */

/** 对话滚动容器选择器（DSH 应用 active conversation column 的滚动容器）。 */
export const SCROLLPORT_SELECTOR = '[data-conversation-scroll]'
/** 会话行选择器（每条对话记录行的稳定锚点）。 */
const ROW_SELECTOR = '[data-chat-anchor-key]'
/** 只标记用户消息：'user'（正常提问）或 'steering'（插话，同样算用户输入）。 */
const MARK_KINDS = new Set(['user', 'steering'])
/** 面板出现所需的最少用户消息数（复刻 DeepSeek 网页版：≥2 条才显示）。 */
const MIN_USER_MESSAGES = 2

/* 面板外观与交互参数 */
const PANEL_WIDTH = 24
const MARKER_SIZE = 7
const RIGHT_MARGIN = 10
const SUMMARY_MAX_CHARS = 200
const SCROLL_PADDING = 12

/* ------------------------------------------------------------------ */
/* 几何 / 文本工具（纯函数）                                             */
/* ------------------------------------------------------------------ */

/** 读取应用发布的滚动条宽度 CSS 变量；未发布时按 0 处理（overlay 滚动条）。 */
function scrollbarWidthOf(scrollport) {
  const raw = getComputedStyle(scrollport).getPropertyValue('--dsh-scrollbar-width')
  const parsed = Number.parseFloat(raw)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0
}

/** 滚动容器内容是否超过一屏（值得标记）。 */
function hasOverflow(scrollHeight, clientHeight) {
  return scrollHeight > clientHeight + 1
}

/** 跳转目标：把行顶滚到视口上方预留 padding 处。 */
function scrollTarget(contentTop, padding) {
  return Math.max(0, contentTop - padding)
}

/** 界面语言检测：zh 前缀视为中文，其余英文。 */
function detectLanguage() {
  const lang = String((document.documentElement && document.documentElement.lang) || navigator.language || '')
  return /^zh\b/i.test(lang) ? 'zh' : 'en'
}

/** 摘要提取时剔除的 UI 元素（按钮/图标/表单等）。 */
const CHROME_SELECTOR = [
  'button', 'input', 'textarea', 'select', 'option',
  '[role="button"]', '[role="toolbar"]', '[role="menu"]', '[role="menuitem"]', '[role="tab"]',
  '[aria-hidden="true"]', 'svg', 'style', 'script', 'template', 'noscript',
].join(',')

/** 压缩全部空白为单个空格并去除首尾空白。 */
function normalizeText(text) {
  return text.replace(/\s+/g, ' ').trim()
}

/** 截断到最多 maxChars 字符，以省略号结尾。 */
function truncate(text, maxChars) {
  if (text.length <= maxChars) return text
  const cut = text.slice(0, Math.max(0, maxChars - 1)).trimEnd()
  return cut + '…'
}

/**
 * 提取消息行的可读摘要：克隆行、剔除 UI 元素后取纯文本并截断。
 * 返回 '' 表示无可用文本。
 */
function extractSummary(row, maxChars) {
  const clone = row.cloneNode(true)
  for (const el of Array.from(clone.querySelectorAll(CHROME_SELECTOR))) el.remove()
  const text = normalizeText(clone.textContent || '')
  if (text.length === 0) return ''
  return truncate(text, maxChars)
}

/* ------------------------------------------------------------------ */
/* Rail：一个滚动容器对应一条导航条面板                                    */
/* ------------------------------------------------------------------ */

/** 行目标：{ element, key, top }（top 为行顶在内容坐标系的位置，供定位与高亮）。 */
export class Rail {
  /**
   * @param {HTMLElement} scrollport 对话滚动容器（[data-conversation-scroll]）。
   */
  constructor(scrollport) {
    this.scrollport = scrollport
    this.language = detectLanguage()
    this.frame = 0
    this.rows = []
    this.hoveredKey = null

    // 面板：body 下 fixed（不被滚动容器裁剪），常驻显示。
    this.overlay = document.createElement('div')
    this.overlay.className = 'nio-nav'
    this.overlay.style.width = PANEL_WIDTH + 'px'
    document.body.appendChild(this.overlay)

    // 摘要提示卡：body 下 fixed，pointer-events none 不挡交互。
    this.tip = document.createElement('div')
    this.tip.className = 'nio-nav-tip'
    this.tipTitle = document.createElement('span')
    this.tipTitle.className = 'nio-nav-tip-title'
    this.tipBody = document.createElement('span')
    this.tipBody.className = 'nio-nav-tip-body'
    this.tip.append(this.tipTitle, this.tipBody)
    document.body.appendChild(this.tip)

    // 事件回调（绑定 this，便于 dispose 移除）。
    this.onScroll = () => this.schedule()
    this.onResize = () => this.schedule()
    this.onFrame = () => this.refresh()
    this.onMouseOver = (event) => this.handlePointerEnter(event.target)
    this.onMouseDown = (event) => {
      if (!this.isMarker(event.target)) this.hideSummary()
    }
    this.onFocusIn = (event) => this.handlePointerEnter(event.target)
    this.onFocusOut = () => this.hideSummary()

    this.scrollport.addEventListener('scroll', this.onScroll, { passive: true })
    window.addEventListener('resize', this.onResize)
    // Document 级指针跟踪：标记在每次刷新时重建（滚动/流式），重建后的
    // 标记不会触发 mouseleave，改为在每次 mouseover 时重新判定悬停。
    document.addEventListener('mouseover', this.onMouseOver)
    document.addEventListener('mousedown', this.onMouseDown)
    document.addEventListener('focusin', this.onFocusIn)
    document.addEventListener('focusout', this.onFocusOut)
    this.observer = new ResizeObserver(this.onResize)
    this.observer.observe(this.scrollport)
    this.mutation = new MutationObserver(this.onScroll)
    this.mutation.observe(this.scrollport, { childList: true, subtree: true })
    this.schedule()
  }

  /** 事件目标是否为本面板的标记。 */
  isMarker(target) {
    if (!(target instanceof Element)) return false
    const marker = target.closest('.nio-nav-marker')
    return marker !== null && this.overlay.contains(marker)
  }

  /** 指针进入标记 → 显示摘要；离开标记（进入面板空白/外部）→ 隐藏。 */
  handlePointerEnter(target) {
    if (!(target instanceof Element)) {
      this.hideSummary()
      return
    }
    const marker = target.closest('.nio-nav-marker')
    if (marker !== null && this.overlay.contains(marker)) {
      const row = this.rows.find((candidate) => candidate.key === marker.dataset.key)
      if (row !== undefined) this.showSummary(marker, row)
    } else {
      this.hideSummary()
    }
  }

  /** 读取当前渲染的用户消息行集合（隐藏行跳过），并计算行顶内容坐标。 */
  readRows() {
    const rows = []
    const scrollport = this.scrollport
    const spRect = scrollport.getBoundingClientRect()
    for (const element of Array.from(scrollport.querySelectorAll(ROW_SELECTOR))) {
      if (element.getClientRects().length === 0) continue
      const kind = element.dataset.chatFlowKind || 'unknown'
      if (!MARK_KINDS.has(kind)) continue
      // 行顶在内容坐标系中的位置（不受视口滚动影响）。
      const top = element.getBoundingClientRect().top - spRect.top + scrollport.scrollTop
      rows.push({ element, key: element.dataset.chatAnchorKey || '', top })
    }
    return rows
  }

  /** 合并高频变化（滚动/流式/resize），下一帧统一刷新。 */
  schedule() {
    if (this.frame !== 0) return
    this.frame = requestAnimationFrame(this.onFrame)
  }

  /** 重读行集合并重定位面板/标记/高亮。 */
  refresh() {
    this.frame = 0
    this.rows = this.readRows()
    // 悬停的行若已不再渲染（会话切换/消息删除），让摘要淡出。
    if (this.hoveredKey !== null && !this.rows.some((row) => row.key === this.hoveredKey)) {
      this.hoveredKey = null
      this.hideSummary()
    }
    const scrollport = this.scrollport
    const rect = scrollport.getBoundingClientRect()
    const scrollbarWidth = scrollbarWidthOf(scrollport)
    const visible = this.rows.length >= MIN_USER_MESSAGES
      && hasOverflow(scrollport.scrollHeight, scrollport.clientHeight)

    if (!visible) {
      this.overlay.style.display = 'none'
      this.hideSummary()
      return
    }
    this.overlay.style.display = 'flex'
    this.overlay.style.left = (rect.right - scrollbarWidth - RIGHT_MARGIN - PANEL_WIDTH) + 'px'
    this.overlay.replaceChildren(...this.buildMarkers())
    // 高度由内部节点撑开：先渲染再测量，实现垂直居中。
    const panelHeight = this.overlay.offsetHeight
    this.overlay.style.top = (rect.top + Math.max(0, (rect.height - panelHeight) / 2)) + 'px'
  }

  /** 构建全部标记（自然罗列 + 当前视口高亮）+ 底部总数徽标。 */
  buildMarkers() {
    const scrollport = this.scrollport
    const viewTop = scrollport.scrollTop
    const viewBottom = viewTop + scrollport.clientHeight
    const total = this.rows.length
    const nodes = this.rows.map((row) => {
      const marker = this.buildMarker(row)
      // 当前视口内可见的用户消息 → 标记高亮（品牌色），定位阅读位置。
      if (row.top >= viewTop - 4 && row.top <= viewBottom + 4) marker.classList.add('nio-nav-marker-active')
      return marker
    })
    const count = document.createElement('span')
    count.className = 'nio-nav-count'
    count.textContent = String(total)
    nodes.push(count)
    return nodes
  }

  /** 构建单个标记：flex 流内自然罗列（间距由 CSS gap 控制），点击平滑跳转。 */
  buildMarker(row) {
    const scrollport = this.scrollport
    const marker = document.createElement('button')
    marker.type = 'button'
    marker.className = 'nio-nav-marker'
    marker.dataset.key = row.key
    marker.setAttribute('aria-label', this.language === 'zh' ? '跳转到该提问' : 'Jump to this message')
    marker.style.width = MARKER_SIZE + 'px'
    marker.style.height = MARKER_SIZE + 'px'
    marker.addEventListener('click', () => {
      const target = scrollTarget(row.top, SCROLL_PADDING)
      scrollport.scrollTo({ top: target, behavior: 'smooth' })
    })
    return marker
  }

  /** 显示标记的摘要卡：面板左侧、与标记垂直对齐，夹取进视口。 */
  showSummary(marker, row) {
    this.hoveredKey = row.key
    const panelRect = this.overlay.getBoundingClientRect()
    const markerRect = marker.getBoundingClientRect()
    const anchorTop = markerRect.height > 0
      ? markerRect.top + markerRect.height / 2
      : panelRect.top + panelRect.height / 2
    const index = this.rows.findIndex((candidate) => candidate.key === row.key)
    const seq = Math.max(0, index) + 1
    this.tipTitle.textContent = this.language === 'zh' ? ('第 ' + seq + ' 条提问') : ('Message ' + seq)
    const body = extractSummary(row.element, SUMMARY_MAX_CHARS)
    this.tipBody.textContent = body
    this.tipBody.style.display = body.length === 0 ? 'none' : 'block'
    this.tip.style.display = 'block'
    // 强制布局后再淡入（display 切换后需要一次重排才能过渡）。
    void this.tip.offsetWidth
    requestAnimationFrame(() => {
      if (this.hoveredKey === row.key) this.tip.style.opacity = '1'
    })
    const width = this.tip.offsetWidth
    const height = this.tip.offsetHeight
    const gap = 10
    const margin = 8
    const left = Math.max(margin, panelRect.left - gap - width)
    const top = Math.min(
      Math.max(margin, anchorTop - height / 2),
      Math.max(margin, window.innerHeight - height - margin),
    )
    this.tip.style.left = left + 'px'
    this.tip.style.top = top + 'px'
  }

  /** 淡出摘要卡。 */
  hideSummary() {
    this.hoveredKey = null
    this.tip.style.opacity = '0'
  }

  /** 移除面板/摘要与全部监听（插件卸载或滚动容器销毁时调用）。 */
  dispose() {
    if (this.frame !== 0) cancelAnimationFrame(this.frame)
    this.frame = 0
    this.scrollport.removeEventListener('scroll', this.onScroll)
    window.removeEventListener('resize', this.onResize)
    document.removeEventListener('mouseover', this.onMouseOver)
    document.removeEventListener('mousedown', this.onMouseDown)
    document.removeEventListener('focusin', this.onFocusIn)
    document.removeEventListener('focusout', this.onFocusOut)
    this.observer.disconnect()
    this.mutation.disconnect()
    this.overlay.remove()
    this.tip.remove()
  }
}
