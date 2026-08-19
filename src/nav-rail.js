/**
 * dsh-niao-quick-open — 浏览器端：会话右侧「用户消息导航条」（Rail 实现）。
 *
 * 复刻 DeepSeek 网页版交互：当本会话用户消息 ≥ 2 条且内容超过一屏时，
 * 在对话区域右侧（紧贴滚动条左侧）**常驻**悬浮一条竖直胶囊面板，每条
 * 用户消息对应一个标记圆点：圆点位于一个盒子中，盒子纵向紧密排列
 * （无间距，hover 盒子任意位置即视为 hover 该消息），面板高度由盒子撑开：
 *  - 悬停标记：弹出摘要卡片（「第 N 条提问」标题 + 消息正文截断摘要）；
 *  - 点击标记：对话区平滑滚动到该消息附近；
 *  - 当前阅读位置对应的用户消息标记高亮为品牌色：滚动到两条提问之间时
 *    上一条提问仍保持高亮（直到下一条提问出现），随时定位阅读位置；
 *  - 面板底部显示用户消息总数徽标；
 *  - 面板常驻显示（不随鼠标靠近/离开显隐），滚动 / 流式输出时只重定位
 *    标记与高亮，不闪烁。
 *
 * 数据来源：读取 DSH 已渲染的会话行 [data-chat-anchor-key]，按
 * data-chat-flow-kind 为 'user'（正常提问）或 'steering'（插话，同为
 * 用户输入）过滤（稳定 data 属性，不依赖 hash 类名）；纯浏览器端，
 * 零宿主端改动。
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
/** 圆点所在盒子（hover 热区）的最大 / 最小高度。 */
const BOX_MAX_HEIGHT = 20
const BOX_MIN_HEIGHT = 5
/** 面板最大高度：视口高度的比例上限与绝对上限（消息极多时压缩盒子并封顶）。 */
const MAX_PANEL_RATIO = 0.55
const MAX_PANEL_HEIGHT = 520
const RIGHT_MARGIN = 10
const SUMMARY_MAX_CHARS = 200
const SCROLL_PADDING = 12
/** 悬浮摘要卡固定宽度（px）：右缘稳定对齐纵向条左侧，内容不撑宽。 */
const TIP_WIDTH = 280

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

/**
 * 自定义快速平滑滚动（比浏览器原生 smooth 更快）：ease-out 插值。
 * 时长随距离自适应（160–320ms）；动画期间用户主动滚动（滚轮/触摸）立即取消。
 * @param {HTMLElement} scrollport 滚动容器。
 * @param {number} target 目标 scrollTop。
 */
function animateScrollTo(scrollport, target) {
  const start = scrollport.scrollTop
  const delta = target - start
  if (Math.abs(delta) < 1) return
  // 短距离快速完成，长距离适当延长但封顶 320ms（原生 smooth 通常更慢）。
  const duration = Math.min(320, Math.max(160, Math.abs(delta) * 0.5))
  const startTime = performance.now()
  let raf = 0
  let cancelled = false
  const cancel = () => {
    cancelled = true
    scrollport.removeEventListener('wheel', cancel)
    scrollport.removeEventListener('touchstart', cancel)
    if (raf !== 0) cancelAnimationFrame(raf)
  }
  const step = (now) => {
    const t = Math.min(1, (now - startTime) / duration)
    // ease-out cubic：开头快、结尾缓。
    const eased = 1 - Math.pow(1 - t, 3)
    scrollport.scrollTop = start + delta * eased
    if (t < 1 && !cancelled) {
      raf = requestAnimationFrame(step)
    } else {
      scrollport.removeEventListener('wheel', cancel)
      scrollport.removeEventListener('touchstart', cancel)
    }
  }
  // 用户滚动打断：wheel / touchstart 触发即停止本动画，避免抢滚轮。
  scrollport.addEventListener('wheel', cancel, { passive: true })
  scrollport.addEventListener('touchstart', cancel, { passive: true })
  raf = requestAnimationFrame(step)
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
    // 盒子高度：优先固定 BOX_MAX_HEIGHT（面板由盒子撑开）；消息过多时压缩
    // 盒子高度并封顶面板，避免面板超高。通过 CSS 变量交给每个盒子使用。
    const total = this.rows.length
    const maxPanel = Math.min(MAX_PANEL_HEIGHT, Math.max(0, rect.height) * MAX_PANEL_RATIO)
    const boxHeight = Math.min(BOX_MAX_HEIGHT, Math.max(BOX_MIN_HEIGHT, (maxPanel - 24) / total))
    this.overlay.style.setProperty('--nio-box-h', boxHeight + 'px')
    this.overlay.replaceChildren(...this.buildMarkers())
    // 高度由内部节点（盒子 + 徽标）撑开：先渲染再测量，实现垂直居中。
    const panelHeight = this.overlay.offsetHeight
    this.overlay.style.top = (rect.top + Math.max(0, (rect.height - panelHeight) / 2)) + 'px'
  }

  /** 构建全部标记（自然罗列 + 当前阅读位置高亮）+ 底部总数徽标。 */
  buildMarkers() {
    const scrollport = this.scrollport
    const viewBottom = scrollport.scrollTop + scrollport.clientHeight
    const total = this.rows.length
    // 高亮目标：最后一条「顶部已进入视口」的用户消息（含刚滚出视口顶部
    // 的）——滚动到 A、B 两条提问之间时，A 已滚出但 B 尚未出现，此时仍
    // 高亮 A（正在读 A 之后的回答），直到 B 顶部进入视口才切换为 B。
    // rows 按 DOM 顺序收集（top 升序），一旦行顶超过视口底部即可停止。
    let activeRow = null
    for (const row of this.rows) {
      if (row.top <= viewBottom + 4) activeRow = row
      else break
    }
    // 视口内/上方没有任何用户消息（内容极短等极端情况）时兜底第一条。
    if (activeRow === null) activeRow = this.rows[0]
    const nodes = this.rows.map((row) => {
      const marker = this.buildMarker(row)
      if (row === activeRow) marker.classList.add('nio-nav-marker-active')
      return marker
    })
    const count = document.createElement('span')
    count.className = 'nio-nav-count'
    count.textContent = String(total)
    nodes.push(count)
    return nodes
  }

  /** 构建单个标记盒子：纵向紧密排列（无间距），整块可 hover / 点击跳转。 */
  buildMarker(row) {
    const scrollport = this.scrollport
    const marker = document.createElement('button')
    marker.type = 'button'
    marker.className = 'nio-nav-marker'
    marker.dataset.key = row.key
    marker.setAttribute('aria-label', this.language === 'zh' ? '跳转到该提问' : 'Jump to this message')
    // 盒子宽高由 CSS 控制：width 100% 撑满面板、height 使用 --nio-box-h。
    marker.addEventListener('click', () => {
      const target = scrollTarget(row.top, SCROLL_PADDING)
      // 自定义快速滚动动画（原生 smooth 太慢）。
      animateScrollTo(scrollport, target)
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
    // 固定宽度（右缘对齐纵向条），内容不撑宽；右缘稳定贴在纵向条左侧。
    this.tip.style.width = TIP_WIDTH + 'px'
    // 强制布局后再淡入（display 切换后需要一次重排才能过渡）。
    void this.tip.offsetWidth
    requestAnimationFrame(() => {
      if (this.hoveredKey === row.key) this.tip.style.opacity = '1'
    })
    const height = this.tip.offsetHeight
    const gap = 10
    const margin = 8
    // 右缘 = 纵向条左缘 - gap（固定，不随内容宽度变化）；视口放不下时夹回。
    const right = Math.min(panelRect.left - gap, window.innerWidth - margin)
    const left = Math.max(margin, right - TIP_WIDTH)
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
