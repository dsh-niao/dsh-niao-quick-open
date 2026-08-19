/**
 * dsh-niao-quick-open — 浏览器端：会话右侧「用户消息导航条」（Rail 实现）。
 *
 * 复刻 DeepSeek 网页版交互：当本会话用户消息 ≥ 2 条且内容超过一屏时，
 * 在对话区域右侧（紧贴滚动条左侧）悬浮一条竖直胶囊面板，每条用户消息
 * 对应一个按内容比例定位的标记竖条：
 *  - 悬停标记：弹出摘要卡片（「第 N 条提问」标题 + 消息正文截断摘要）；
 *  - 点击标记：对话区平滑滚动到该消息附近；
 *  - 面板底部显示用户消息总数徽标；
 *  - 面板平时淡出隐藏，指针移到面板附近热区时淡入，移开约 0.45s 后淡出；
 *    滚动 / 流式输出时只重定位标记，不主动显示面板。
 *
 * 数据来源：读取 DSH 已渲染的会话行 [data-chat-anchor-key]，按
 * data-chat-flow-kind="user" 过滤（与 delete-message.js 同一套稳定 data
 * 属性，不依赖 hash 类名）；纯浏览器端，零宿主端改动。
 *
 * @module dsh-niao-quick-open/client/nav-rail
 */

/** 对话滚动容器选择器（DSH 应用 active conversation column 的滚动容器）。 */
export const SCROLLPORT_SELECTOR = '[data-conversation-scroll]'
/** 会话行选择器（每条对话记录行的稳定锚点）。 */
const ROW_SELECTOR = '[data-chat-anchor-key]'
/** 只标记用户消息。 */
const MARK_KIND = 'user'
/** 面板出现所需的最少用户消息数（复刻 DeepSeek 网页版：≥2 条才显示）。 */
const MIN_USER_MESSAGES = 2

/* 面板外观与交互参数（默认值，保持与 DeepSeek 网页版观感一致） */
const PANEL_WIDTH = 26
const PANEL_HEIGHT_RATIO = 0.5
const MIN_PANEL_HEIGHT = 140
const MAX_PANEL_HEIGHT = 520
const MARKER_SIZE = 6
const RIGHT_MARGIN = 10
const HOVER_ZONE_X = 28
const HOVER_ZONE_Y = 24
const IDLE_HIDE_MS = 450
const FADE_IN_MS = 200
const FADE_OUT_MS = 400
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

/** 行顶在内容中的纵向比例，夹取到 [0, 1]。 */
function contentRatio(contentTop, scrollHeight) {
  if (scrollHeight <= 0) return 0
  return Math.min(1, Math.max(0, contentTop / scrollHeight))
}

/** 标记在面板内的 top 偏移（按内容比例压缩进面板高度）。 */
function markerTop(ratio, railHeight, markerSize) {
  if (railHeight <= 0) return 0
  const max = Math.max(0, railHeight - markerSize)
  return Math.min(max, Math.max(0, ratio * railHeight))
}

/** 面板高度：视口高度的一个比例，夹取到 [min, max]。 */
function panelHeightFor(viewportHeight, ratio, min, max) {
  if (viewportHeight <= 0) return 0
  return Math.min(max, Math.max(min, viewportHeight * ratio))
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

/** 行目标：{ element, key }（key 为行稳定锚点，用于重建后的 hover 匹配）。 */
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
    this.panelShown = false
    this.idleTimer = undefined
    this.pointerX = -1
    this.pointerY = -1

    // 面板：body 下 fixed（不被滚动容器裁剪），初始隐藏。
    this.overlay = document.createElement('div')
    this.overlay.className = 'nio-nav'
    this.overlay.style.width = PANEL_WIDTH + 'px'
    this.overlay.style.opacity = '0'
    this.overlay.style.visibility = 'hidden'
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
    this.onMouseMove = (event) => {
      this.pointerX = event.clientX
      this.pointerY = event.clientY
      if (this.pointerInZone()) this.showPanel()
      else this.schedulePanelHide()
    }
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
    document.addEventListener('mousemove', this.onMouseMove)
    document.addEventListener('mousedown', this.onMouseDown)
    document.addEventListener('focusin', this.onFocusIn)
    document.addEventListener('focusout', this.onFocusOut)
    this.observer = new ResizeObserver(this.onResize)
    this.observer.observe(this.scrollport)
    this.mutation = new MutationObserver(this.onScroll)
    this.mutation.observe(this.scrollport, { childList: true, subtree: true })
    this.schedule()
  }

  /** 指针是否位于面板周围热区（面板隐藏时 rect 依然存在，可判定）。 */
  pointerInZone() {
    const rect = this.overlay.getBoundingClientRect()
    if (rect.width === 0 || rect.height === 0) return false
    return this.pointerX >= rect.left - HOVER_ZONE_X && this.pointerX <= rect.right + HOVER_ZONE_X
      && this.pointerY >= rect.top - HOVER_ZONE_Y && this.pointerY <= rect.bottom + HOVER_ZONE_Y
  }

  /** 立即显示面板（取消待执行的淡出）。 */
  showPanel() {
    if (this.idleTimer !== undefined) {
      clearTimeout(this.idleTimer)
      this.idleTimer = undefined
    }
    if (this.panelShown) return
    this.panelShown = true
    this.overlay.style.transitionDuration = FADE_IN_MS + 'ms'
    this.overlay.style.visibility = 'visible'
    this.overlay.style.opacity = '1'
  }

  /** 启动（或重置）淡出倒计时：指针离开热区一段时间后隐藏面板。 */
  schedulePanelHide() {
    if (this.idleTimer !== undefined) clearTimeout(this.idleTimer)
    this.idleTimer = setTimeout(() => {
      this.idleTimer = undefined
      if (!this.pointerInZone()) this.hidePanel()
    }, IDLE_HIDE_MS)
  }

  /** 淡出面板并停止接收事件。 */
  hidePanel() {
    if (!this.panelShown) return
    this.panelShown = false
    this.hideSummary()
    this.overlay.style.transitionDuration = FADE_OUT_MS + 'ms'
    this.overlay.style.visibility = 'hidden'
    this.overlay.style.opacity = '0'
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

  /** 读取当前渲染的用户消息行集合（隐藏行跳过）。 */
  readRows() {
    const rows = []
    for (const element of Array.from(this.scrollport.querySelectorAll(ROW_SELECTOR))) {
      if (element.getClientRects().length === 0) continue
      const kind = element.dataset.chatFlowKind || 'unknown'
      if (kind !== MARK_KIND) continue
      rows.push({ element, key: element.dataset.chatAnchorKey || '' })
    }
    return rows
  }

  /** 合并高频变化（滚动/流式/resize），下一帧统一刷新。 */
  schedule() {
    if (this.frame !== 0) return
    this.frame = requestAnimationFrame(this.onFrame)
  }

  /** 重读行集合并重定位面板/标记。 */
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
    const panelHeight = panelHeightFor(rect.height, PANEL_HEIGHT_RATIO, MIN_PANEL_HEIGHT, MAX_PANEL_HEIGHT)
    const visible = this.rows.length >= MIN_USER_MESSAGES
      && hasOverflow(scrollport.scrollHeight, scrollport.clientHeight)

    if (!visible) {
      this.panelShown = false
      if (this.idleTimer !== undefined) {
        clearTimeout(this.idleTimer)
        this.idleTimer = undefined
      }
      this.overlay.style.display = 'none'
      this.hideSummary()
      return
    }
    this.overlay.style.display = 'block'
    this.overlay.style.height = panelHeight + 'px'
    // 面板固定在滚动容器右侧、滚动条左侧，垂直居中。
    this.overlay.style.left = (rect.right - scrollbarWidth - RIGHT_MARGIN - PANEL_WIDTH) + 'px'
    this.overlay.style.top = (rect.top + (rect.height - panelHeight) / 2) + 'px'
    this.overlay.replaceChildren(...this.buildMarkers(panelHeight))
  }

  /** 构建全部标记 + 底部总数徽标。 */
  buildMarkers(panelHeight) {
    const nodes = this.rows.map((row, index) => this.buildMarker(row, index, panelHeight))
    const count = document.createElement('span')
    count.className = 'nio-nav-count'
    count.textContent = String(this.rows.length)
    nodes.push(count)
    return nodes
  }

  /** 构建单个标记：按内容比例定位，点击平滑跳转到该消息。 */
  buildMarker(row, index, panelHeight) {
    const scrollport = this.scrollport
    // 行顶在内容坐标系中的位置（不受视口滚动影响）。
    const rowTop = row.element.getBoundingClientRect().top - scrollport.getBoundingClientRect().top + scrollport.scrollTop
    const ratio = contentRatio(rowTop, scrollport.scrollHeight)
    const marker = document.createElement('button')
    marker.type = 'button'
    marker.className = 'nio-nav-marker'
    marker.dataset.key = row.key
    marker.setAttribute('aria-label', this.language === 'zh' ? ('第 ' + (index + 1) + ' 条提问') : ('Message ' + (index + 1)))
    marker.style.top = markerTop(ratio, panelHeight, MARKER_SIZE) + 'px'
    marker.style.height = MARKER_SIZE + 'px'
    marker.addEventListener('click', () => {
      const target = scrollTarget(rowTop, SCROLL_PADDING)
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
    if (this.idleTimer !== undefined) clearTimeout(this.idleTimer)
    this.idleTimer = undefined
    this.scrollport.removeEventListener('scroll', this.onScroll)
    window.removeEventListener('resize', this.onResize)
    document.removeEventListener('mouseover', this.onMouseOver)
    document.removeEventListener('mousemove', this.onMouseMove)
    document.removeEventListener('mousedown', this.onMouseDown)
    document.removeEventListener('focusin', this.onFocusIn)
    document.removeEventListener('focusout', this.onFocusOut)
    this.observer.disconnect()
    this.mutation.disconnect()
    this.overlay.remove()
    this.tip.remove()
  }
}
