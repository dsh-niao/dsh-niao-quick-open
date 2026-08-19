/**
 * dsh-niao-quick-open — DeepSeek Harness profile bundle（宿主端）。
 *
 * 提供浏览器端快捷操作所需的宿主能力：
 *   - 扫描本机已安装的编辑器（已知品牌清单 + 按关键词动态扫描应用目录 / CLI）；
 *   - 执行「在文件管理器中打开」与「用指定编辑器打开」的系统命令。
 * 浏览器端通过同源 JSON 路由 /api/dsh-niao-quick-open 调用本模块。
 *
 * @module dsh-niao-quick-open
 */

import { Buffer } from 'node:buffer'
import { randomUUID } from 'node:crypto'
import { spawn } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync, renameSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

export const name = 'dsh-niao-quick-open'

export const inject = ['webServer', 'fs', 'shell', 'subprocess']

/** 同源路由路径（exact 匹配）。 */
const ROUTE_PATH = '/api/dsh-niao-quick-open'
/** 编辑器扫描结果缓存时长（毫秒）。 */
const EDITOR_CACHE_TTL = 30000

/* ------------------------------------------------------------------ */
/* 插件配置（设置面板「界面功能」持久化）                                  */
/* ------------------------------------------------------------------ */

/** 默认配置。用户可在 profile patch 行覆盖，也可在设置面板「界面功能」中修改。 */
const DEFAULTS = {
  /** 「工作区快捷按钮」显示开关：false 时不在会话 header 注入操作行。 */
  enabled: true,
  /** 常用编辑器 id；空串 = 未设置。 */
  editor: '',
  /** 左下角「硬性重启」按钮显示开关：false 时不在设置按钮右侧注入。 */
  showRestart: true,
  /** 工作区行菜单快捷按钮开关：false 时不在工作区「⋯」菜单中注入按钮行。 */
  menuQuickActions: false,
  /** 「会话待办标记」开关：false 时不在空闲会话前注入可点击的标记圆点。 */
  sessionDoneMark: false,
  /** 「单列表增强样式」开关：false 时单列表视图使用系统原生样式（不注入三行布局）。 */
  flatListStyle: true,
  /** 「工作区栏头部增强」开关：false 时工作区/会话列表头部使用系统原生悬浮弹窗（分组+排序）。 */
  headerViewSwitches: false,
  /** 「消息删除」开关：false 时不在每条对话消息下方注入「删除」按钮。 */
  messageDelete: true,
  /** 「用户消息导航条」开关：false 时不在会话右侧显示用户消息导航条。 */
  conversationNav: true,
  /** 设置面板持久化配置文件路径。 */
  configFile: join(homedir(), '.dsh', 'dsh-niao-quick-open.config.json'),
}

/** 面板可持久化的键。 */
const PERSIST_KEYS = ['enabled', 'editor', 'showRestart', 'menuQuickActions', 'sessionDoneMark', 'flatListStyle', 'headerViewSwitches', 'messageDelete', 'conversationNav']

/** 读取配置文件；缺失或损坏时返回 null。 */
function readConfigFile(file) {
  try {
    const data = JSON.parse(readFileSync(file, 'utf8'))
    return data && typeof data === 'object' ? data : null
  } catch { return null }
}

/** 合并配置：DEFAULTS ← patch config ← 配置文件（最高优先级）。 */
function resolveConfig(config) {
  const cfg = { ...DEFAULTS, ...(config && typeof config === 'object' ? config : {}) }
  const file = readConfigFile(cfg.configFile)
  if (file) {
    if (typeof file.enabled === 'boolean') cfg.enabled = file.enabled
    if (typeof file.editor === 'string') cfg.editor = file.editor
    if (typeof file.showRestart === 'boolean') cfg.showRestart = file.showRestart
    if (typeof file.menuQuickActions === 'boolean') cfg.menuQuickActions = file.menuQuickActions
    if (typeof file.sessionDoneMark === 'boolean') cfg.sessionDoneMark = file.sessionDoneMark
    if (typeof file.flatListStyle === 'boolean') cfg.flatListStyle = file.flatListStyle
    if (typeof file.headerViewSwitches === 'boolean') cfg.headerViewSwitches = file.headerViewSwitches
    if (typeof file.messageDelete === 'boolean') cfg.messageDelete = file.messageDelete
    if (typeof file.conversationNav === 'boolean') cfg.conversationNav = file.conversationNav
  }
  return cfg
}

/** 把配置写回配置文件（先写临时文件再 rename，避免写一半损坏）。 */
function writeConfigFile(file, cfg) {
  const payload = {}
  for (const key of PERSIST_KEYS) payload[key] = cfg[key]
  const tmp = file + '.tmp'
  try {
    writeFileSync(tmp, JSON.stringify(payload, null, 2), 'utf8')
    renameSync(tmp, file)
  } catch (error) {
    throw new Error(`写入配置文件失败: ${String(error && error.message ? error.message : error)}`)
  }
}

/** 浏览器面板可见的配置视图（纯数据）。 */
function publicConfig(cfg) {
  return {
    enabled: cfg.enabled,
    editor: cfg.editor,
    showRestart: cfg.showRestart,
    menuQuickActions: cfg.menuQuickActions,
    sessionDoneMark: cfg.sessionDoneMark,
    flatListStyle: cfg.flatListStyle,
    headerViewSwitches: cfg.headerViewSwitches,
    messageDelete: cfg.messageDelete,
    conversationNav: cfg.conversationNav,
  }
}

/* ------------------------------------------------------------------ */
/* 编辑器清单与识别规则                                                  */
/* ------------------------------------------------------------------ */

/** 已知编辑器的品牌信息：macOS 应用名、CLI 名、品牌色与首字母。 */
const EDITOR_DEFS = [
  { id: 'vscode', name: 'Visual Studio Code', bg: '#007ACC', letter: 'VS', apps: ['Visual Studio Code.app', 'VSCodium.app', 'Code - Insiders.app'], cli: 'code' },
  { id: 'cursor', name: 'Cursor', bg: '#111111', letter: 'C', apps: ['Cursor.app', 'Cursor 0.47.app'], cli: 'cursor' },
  { id: 'trae', name: 'Trae', bg: '#2F6BFF', letter: 'T', apps: ['Trae.app', 'Trae CN.app'], cli: 'trae' },
  { id: 'windsurf', name: 'Windsurf', bg: '#0E7490', letter: 'W', apps: ['Windsurf.app'], cli: 'windsurf' },
  { id: 'zed', name: 'Zed', bg: '#1E1E1E', letter: 'Z', apps: ['Zed.app'], cli: 'zed' },
  { id: 'sublime', name: 'Sublime Text', bg: '#FF9800', letter: 'S', apps: ['Sublime Text.app'], cli: 'subl' },
  { id: 'hbuilderx', name: 'HBuilderX', bg: '#E6531F', letter: 'H', apps: ['HBuilderX.app'], cli: 'hbuilderx' },
  { id: 'idea', name: 'IntelliJ IDEA', bg: '#B437EE', letter: 'IJ', apps: ['IntelliJ IDEA.app', 'IntelliJ IDEA CE.app'], cli: 'idea' },
  { id: 'pycharm', name: 'PyCharm', bg: '#21D789', letter: 'PC', apps: ['PyCharm.app', 'PyCharm CE.app'], cli: 'pycharm' },
  { id: 'webstorm', name: 'WebStorm', bg: '#07C3F2', letter: 'WS', apps: ['WebStorm.app'], cli: 'webstorm' },
  { id: 'goland', name: 'GoLand', bg: '#00ACD7', letter: 'GL', apps: ['GoLand.app'], cli: 'goland' },
  { id: 'clion', name: 'CLion', bg: '#1C8E3E', letter: 'CL', apps: ['CLion.app'], cli: 'clion' },
  { id: 'phpstorm', name: 'PhpStorm', bg: '#A74BFF', letter: 'PS', apps: ['PhpStorm.app'], cli: 'phpstorm' },
  { id: 'vim', name: 'Vim (CLI)', bg: '#019733', letter: 'V', apps: [], cli: 'vim' },
  { id: 'nvim', name: 'Neovim (CLI)', bg: '#57A143', letter: 'NV', apps: [], cli: 'nvim' },
]

/** 动态扫描时的关键词表：应用/程序名命中任意一个即视为编辑器。 */
const KEYWORDS = [
  'visual studio', 'code', 'codium', 'cursor', 'trae', 'windsurf', 'zed', 'sublime', 'hbuilder',
  'intellij', 'idea', 'pycharm', 'webstorm', 'goland', 'clion', 'phpstorm', 'rider', 'datagrip',
  'emacs', 'xcode', 'atom', 'notepad', 'brackets', 'geany', 'kate', 'textmate', 'nova', 'bbedit',
  'fleet', 'micro', 'neovim', 'vim',
]

/** Linux 下逐一探测的 CLI 名表。 */
const LINUX_CLIS = [
  'code', 'codium', 'cursor', 'trae', 'windsurf', 'zed', 'subl', 'sublime_text', 'hbuilderx',
  'idea', 'pycharm', 'webstorm', 'goland', 'clion', 'phpstorm', 'rider', 'datagrip', 'emacs',
  'atom', 'notepadqq', 'geany', 'kate', 'gedit', 'xed', 'micro', 'nvim', 'vim',
]

/* ------------------------------------------------------------------ */
/* 图标生成                                                             */
/* ------------------------------------------------------------------ */

/** 生成品牌图标（品牌色底 + 首字母）的 data URI。 */
function iconDataUri(bg, letter) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="44" height="44"><rect width="44" height="44" rx="9" fill="${bg}"/><text x="22" y="29" font-family="-apple-system,Segoe UI,Arial,sans-serif" font-size="20" font-weight="700" text-anchor="middle" fill="#ffffff">${letter}</text></svg>`
  return 'data:image/svg+xml;base64,' + Buffer.from(svg, 'utf-8').toString('base64')
}

/** 扫描到的新编辑器使用灰色底 + 名称首字母作为图标。 */
function defaultIcon(name) {
  const letter = (String(name).replace(/[^a-zA-Z0-9]/g, '') || 'E').slice(0, 2).toUpperCase()
  return iconDataUri('#4B5563', letter)
}

/** 应用/程序名 → 稳定的去重 id（去扩展名、非字母数字转短横线、小写）。 */
function slug(name) {
  return String(name).replace(/\.(app|exe|lnk)$/i, '').replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase()
}

/** 名称是否命中编辑器关键词表。 */
function keywordHit(name) {
  const low = String(name).toLowerCase()
  return KEYWORDS.some((k) => low.indexOf(k) !== -1)
}

/** 带品牌图标的已知编辑器清单（模块加载时一次性生成）。 */
const EDITOR_DEFS_WITH_ICON = EDITOR_DEFS.map((ed) => ({ ...ed, icon: iconDataUri(ed.bg, ed.letter) }))

/* ------------------------------------------------------------------ */
/* 系统能力                                                            */
/* ------------------------------------------------------------------ */

/** 路径是否存在。 */
async function exists(ctx, path) {
  const fs = ctx.fs
  if (!fs) return false
  try { return !!(await fs.lstat(path)) } catch { return false }
}

/** 探测当前操作系统（进程内缓存：平台不会变化，避免每次操作重复探测）。 */
let platformCache = null
async function detectPlatform(ctx) {
  if (platformCache) return platformCache
  if (await exists(ctx, '/Applications')) platformCache = 'macos'
  else if (await exists(ctx, 'C:\\Windows')) platformCache = 'windows'
  else platformCache = 'linux'
  return platformCache
}

/** 执行一条系统命令，成功（exitCode 0）返回 true。 */
async function runShell(ctx, command) {
  const shell = ctx.shell
  if (!shell) return false
  try {
    const spec = shell.resolve({ command, timeoutMs: 15000 })
    const res = await shell.run(spec)
    return res.exitCode === 0
  } catch { return false }
}

/* ------------------------------------------------------------------ */
/* 编辑器扫描                                                           */
/* ------------------------------------------------------------------ */

/** 扫描结果缓存：{ at: 上次扫描时间, list: 结果列表 }。 */
let editorCache = { at: 0, list: [] }

/**
 * 扫描本机已安装的编辑器。结果缓存 30 秒。
 * 顺序：已知品牌精确探测 → 平台动态扫描（macOS/Windows 目录关键词、Linux CLI）。
 */
async function listEditors(ctx) {
  const now = Date.now()
  if (now - editorCache.at < EDITOR_CACHE_TTL) return editorCache.list
  const platform = await detectPlatform(ctx)
  const found = []
  const seen = new Set()
  const push = (ed) => { if (!seen.has(ed.id)) { seen.add(ed.id); found.push(ed) } }

  // 已知品牌：优先匹配 macOS 应用路径，其次 CLI。
  for (const ed of EDITOR_DEFS_WITH_ICON) {
    let appPath = null
    let cliPath = null
    if (platform === 'macos') {
      for (const app of ed.apps) {
        const p = '/Applications/' + app
        if (await exists(ctx, p)) { appPath = p; break }
      }
      if (!appPath) {
        for (const app of ed.apps) {
          const p = '/System/Applications/' + app
          if (await exists(ctx, p)) { appPath = p; break }
        }
      }
    }
    if (!appPath && ed.cli) {
      try {
        const sub = ctx.subprocess
        if (sub) cliPath = await sub.resolveExecutable(ed.cli)
      } catch { /* CLI 不存在 */ }
    }
    if (appPath || cliPath) push({ id: ed.id, name: ed.name, icon: ed.icon, appPath, cliPath })
  }

  // 动态扫描：识别已知清单之外、但命中关键词的编辑器。
  if (platform === 'macos') {
    for (const dir of ['/Applications', '/System/Applications']) {
      let entries = []
      try { entries = await ctx.fs.listDir(dir) } catch { entries = [] }
      for (const entry of entries) {
        const name = entry && entry.name ? entry.name : ''
        if (!/\.app$/i.test(name)) continue
        if (EDITOR_DEFS.some((ed) => ed.apps.indexOf(name) !== -1)) continue
        if (!keywordHit(name)) continue
        push({ id: 'scan:' + slug(name), name: name.replace(/\.app$/i, ''), icon: defaultIcon(name), appPath: dir + '/' + name, cliPath: null })
      }
    }
  } else if (platform === 'windows') {
    const dirs = ['C:\\Program Files', 'C:\\Program Files (x86)', 'C:\\Users\\Public\\AppData\\Local\\Programs']
    for (const dir of dirs) {
      let entries = []
      try { entries = await ctx.fs.listDir(dir) } catch { entries = [] }
      for (const entry of entries) {
        const name = entry && entry.name ? entry.name : ''
        if (!/\.(exe|lnk)$/i.test(name)) continue
        if (!keywordHit(name)) continue
        push({ id: 'scan:' + slug(name), name: name.replace(/\.(exe|lnk)$/i, ''), icon: defaultIcon(name), appPath: dir + '\\' + name, cliPath: null })
      }
    }
  } else {
    for (const cli of LINUX_CLIS) {
      try {
        const sub = ctx.subprocess
        if (!sub) break
        const p = await sub.resolveExecutable(cli)
        if (p) push({ id: 'scan:' + slug(cli), name: cli, icon: defaultIcon(cli), appPath: null, cliPath: p })
      } catch { /* CLI 不存在 */ }
    }
  }

  editorCache = { at: now, list: found }
  return found
}

/* ------------------------------------------------------------------ */
/* 打开命令                                                            */
/* ------------------------------------------------------------------ */

/** 在系统文件管理器中打开目录。 */
async function openInFinder(ctx, cwd) {
  if (!cwd) return { ok: false }
  const platform = await detectPlatform(ctx)
  const cmd = platform === 'windows' ? `explorer "${cwd}"` : platform === 'linux' ? `xdg-open "${cwd}"` : `open "${cwd}"`
  return { ok: await runShell(ctx, cmd) }
}

/** 用指定编辑器打开目录；返回 { opened, reason? }。 */
async function openWithEditor(ctx, cwd, editorId) {
  if (!cwd || !editorId) return { opened: false, reason: 'no-command' }
  const editors = await listEditors(ctx)
  const ed = editors.find((e) => e.id === editorId)
  if (!ed) return { opened: false, reason: 'not-found' }
  const platform = await detectPlatform(ctx)
  let command
  if (platform === 'macos') {
    if (ed.appPath) {
      const appName = ed.appPath.split('/').pop().replace(/\.app$/, '')
      command = `open -a "${appName}" "${cwd}"`
    } else if (ed.cliPath) {
      command = `"${ed.cliPath}" "${cwd}"`
    }
  } else if (platform === 'windows') {
    if (ed.appPath) command = `start "" "${ed.appPath}" "${cwd}"`
    else if (ed.cliPath) command = `"${ed.cliPath}" "${cwd}"`
  } else {
    if (ed.cliPath) command = `"${ed.cliPath}" "${cwd}"`
    else if (ed.appPath) command = `"${ed.appPath}" "${cwd}"`
  }
  if (!command) return { opened: false, reason: 'no-command' }
  return { opened: true, ok: await runShell(ctx, command) }
}

/* ------------------------------------------------------------------ */
/* 会话最后用户消息提取（单列表模式行预览）                               */
/* ------------------------------------------------------------------ */

/**
 * 是否为「用户发出的真实对话」消息。
 * 排除两类非用户输入的 user 角色消息：
 *  - source.kind === 'tool'：工具结果（content 为 tool-result 块）；
 *  - source.kind === 'plugin'：系统注入的 user 消息（运行时上下文快照等）。
 * 真实用户输入不携带 source（或 source 无 kind），予以保留。
 */
function isUserPrompt(data) {
  if (!data || typeof data !== 'object' || data.role !== 'user') return false
  const source = data.source
  if (source && typeof source === 'object' && typeof source.kind === 'string' && (source.kind === 'tool' || source.kind === 'plugin')) return false
  return true
}

/** 从 user 消息提取展示文本：拼接全部 text 块；无文本返回 null。 */
function userPromptText(data) {
  if (!data) return null
  const content = data.content
  if (typeof content === 'string') return content
  if (Array.isArray(content)) {
    const parts = []
    for (const block of content) {
      if (block && typeof block === 'object' && block.type === 'text' && typeof block.text === 'string') parts.push(block.text)
    }
    return parts.length > 0 ? parts.join(' ') : null
  }
  return null
}

/**
 * 在事件数组（正序）中找最后一条真实用户消息（倒序遍历第一个命中）。
 * 排除 replacement copies（compaction 替换 shadow 掉的旧消息，surfaceOp 为对象）。
 * @returns { { text: string, time: number } | null }
 */
function lastUserPromptEvent(events) {
  for (let i = events.length - 1; i >= 0; i -= 1) {
    const ev = events[i]
    if (!ev || ev.type !== 'user/message') continue
    if (ev.surfaceOp !== undefined && ev.surfaceOp !== 'append') continue
    if (!isUserPrompt(ev.data)) continue
    const text = userPromptText(ev.data)
    if (!text) continue
    return { text, time: typeof ev.time === 'number' ? ev.time : Date.now() }
  }
  return null
}

/**
 * 各会话「用户最后一条对话」实时字段：sessionId → { text, time }。
 * 订阅 session/event 在用户发出新消息时即时更新（无需等待会话执行完成
 * 或持久化刷新）；list-last-user-messages 优先读此字段。进程重启后清空，
 * 由实时读取（live session / 持久化日志）兜底回填。
 */
const lastUserPromptField = new Map()

/**
 * 订阅会话事件，维护 lastUserPromptField。
 * 用户在某个会话发出内容（user/message append）时立即更新该字段，
 * 供侧边栏会话卡片即时展示最后一句与时间。
 */
function subscribeLastUserPrompt(ctx) {
  ctx.on('session/event', (subject, event) => {
    if (!subject || typeof subject.id !== 'string') return
    if (!event || event.type !== 'user/message') return
    if (!isUserPrompt(event.data)) return
    const text = userPromptText(event.data)
    if (!text) return
    lastUserPromptField.set(subject.id, { text, time: typeof event.time === 'number' ? event.time : Date.now() })
  })
}

/**
 * 读取一个会话的最后一条用户消息（文本 + 时间）。
 * 优先取内存中的 live session（ctx.sessions），其次从持久化日志
 * （ctx.sessionPersistence.loadStored）恢复读取。两者皆无则返回 null。
 * 找到结果时同步写入 lastUserPromptField（即时字段，供下次直接命中）。
 */
async function lastUserMessage(ctx, sessionId) {
  // 1) 即时字段：用户发出内容后已被事件订阅更新（最新、最快）。
  const field = lastUserPromptField.get(sessionId)
  if (field && field.text) return field
  // 2) 实时读取：live session（内存中的会话，含刚发出的内容）。
  const sessions = ctx.get('sessions')
  const live = sessions && typeof sessions.get === 'function' ? sessions.get(sessionId) : undefined
  if (live) {
    let events = null
    try { events = live.events } catch { events = null }
    if (Array.isArray(events)) {
      const found = lastUserPromptEvent(events)
      if (found) { lastUserPromptField.set(sessionId, found); return found }
    }
  }
  // 3) 持久化日志兜底（会话不在内存时）。
  let persistence = ctx.get('sessionPersistence')
  // 兜底：部分装载方式下后端以自身 name（session-persistence-jsonl）注册。
  if (!(persistence && typeof persistence.loadStored === 'function')) persistence = ctx.get('session-persistence-jsonl')
  if (persistence && typeof persistence.loadStored === 'function') {
    try {
      const stored = await persistence.loadStored(sessionId)
      if (stored && Array.isArray(stored.events)) {
        const found = lastUserPromptEvent(stored.events)
        if (found) { lastUserPromptField.set(sessionId, found); return found }
      }
    } catch { /* 日志读取失败：该会话无预览 */ }
  }
  return null
}

/* ------------------------------------------------------------------ */
/* 会话消息删除（surface replace 遮蔽）                                  */
/* ------------------------------------------------------------------ */

/**
 * 会话是否正在运行（存在未闭合的 turn）。
 * 从事件尾部向前找最后一个 turn 边界：先遇 turn/end = 空闲，先遇
 * turn/start = 运行中。生成中的会话禁止删除（避免与 in-flight 冲突）。
 */
function sessionTurnRunning(session) {
  const events = session.events
  for (let i = events.length - 1; i >= 0; i -= 1) {
    const type = events[i] && events[i].type
    if (type === 'turn/end') return false
    if (type === 'turn/start') return true
  }
  return false
}

/**
 * 提取 assistant 消息的展示文本：拼接全部 text 块。
 * @returns {string | null} 无文本返回 null。
 */
function assistantMessageText(data) {
  const content = data && data.message && Array.isArray(data.message.content) ? data.message.content : []
  const parts = []
  for (const block of content) {
    if (block && typeof block === 'object' && block.type === 'text' && typeof block.text === 'string' && block.text.length > 0) parts.push(block.text)
  }
  const text = parts.join(' ').trim()
  return text.length > 0 ? text : null
}

/**
 * 读取一个会话的 surface 节点列表（模型可见消息，按 seq 升序）。
 * 仅列出可删除的消息：真实用户输入（source.kind === 'user'，排除工具结果
 * / 系统注入 / compact 检查点）与已生成完成的 assistant 回复。
 * 空 content 的 assistant/message（我们的删除占位、仅承载 usage 的消息）
 * 不产生模型消息，一并跳过。
 * @returns {Array<{ seq: number, role: 'user'|'assistant', text: string }>}
 */
function surfaceItemList(session) {
  const events = session.events
  const list = []
  for (const seq of session.surface.nodes) {
    const ev = events[seq]
    if (!ev) continue
    if (ev.type === 'user/message') {
      if (!isUserPrompt(ev.data)) continue
      const text = userPromptText(ev.data)
      if (!text) continue
      list.push({ seq, role: 'user', text: text.slice(0, 200) })
    } else if (ev.type === 'assistant/message') {
      const text = assistantMessageText(ev.data)
      if (!text) continue
      list.push({ seq, role: 'assistant', text: text.slice(0, 200) })
    }
  }
  return list
}

/**
 * 从会话中提取「最近一条 assistant 消息」的元信息（turn/step + model source）。
 * 删除占位消息必须携带合法的 model source（kind:'model' + provider/model）才能
 * 通过持久化校验（assertMessageEventShape），否则重启后整个会话加载失败。
 * @returns {{ turn: number, step: number, source: object }}
 */
function lastAssistantMeta(session) {
  const events = session.events
  const fallback = { turn: 0, step: 0, source: { kind: 'model', provider: 'unknown-provider', model: 'unknown-model' } }
  for (let i = events.length - 1; i >= 0; i -= 1) {
    const ev = events[i]
    if (!ev || ev.type !== 'assistant/message') continue
    const data = ev.data && typeof ev.data === 'object' ? ev.data : {}
    const msg = data.message && typeof data.message === 'object' ? data.message : {}
    const src = msg.source && typeof msg.source === 'object' ? msg.source : {}
    const meta = {
      turn: typeof data.turn === 'number' ? data.turn : 0,
      step: typeof data.step === 'number' ? data.step : 0,
    }
    if (src.kind === 'model' && typeof src.provider === 'string' && src.provider.length > 0 && typeof src.model === 'string' && src.model.length > 0) {
      return { ...meta, source: { kind: 'model', provider: src.provider, model: src.model } }
    }
    return { ...meta, source: fallback.source }
  }
  return fallback
}

/**
 * 删除会话中的一条消息：append 一条空 content 的 assistant/message，
 * 携带 surfaceOp replace 把目标节点从模型上下文中遮蔽（compaction 同款
 * 官方机制，append-only 日志本身不修改；重启重放后依然生效）。
 *
 * 删除语义：
 *  - 删除 user 消息：连带删除其后直到下一条 user 之前的所有节点（该轮
 *    回复与工具调用），适合「发错消息重发」；
 *  - 删除 assistant 消息：仅删除该条回答（保留用户问题）。
 *
 * @returns {Promise<{ ok: boolean, error?: { code, message }, value?: { deleted, seqs } }>}
 */
async function deleteMessage(ctx, sessionId, seq) {
  if (!Number.isSafeInteger(seq) || seq < 0) {
    return { ok: false, error: { code: 'invalid-seq', message: '无效的消息序号' } }
  }
  const sessions = ctx.get('sessions')
  const session = sessions && typeof sessions.get === 'function' ? sessions.get(sessionId) : undefined
  if (!session) {
    return { ok: false, error: { code: 'session-not-found', message: '会话不存在或已关闭' } }
  }
  if (sessionTurnRunning(session)) {
    return { ok: false, error: { code: 'session-running', message: '会话正在生成中，请稍后再删除' } }
  }
  const events = session.events
  const nodes = session.surface.nodes
  const idx = nodes.indexOf(seq)
  if (idx === -1) {
    return { ok: false, error: { code: 'not-in-surface', message: '该消息已不在当前会话中' } }
  }
  const type = events[seq] && events[seq].type
  if (type !== 'user/message' && type !== 'assistant/message') {
    return { ok: false, error: { code: 'invalid-target', message: '该消息不可删除' } }
  }
  let startIdx = idx
  let endIdx = idx
  if (type === 'user/message') {
    // 连带删除该 user 之后的回复：向后扩展直到下一条 user 之前。
    while (endIdx + 1 < nodes.length) {
      const nextType = events[nodes[endIdx + 1]] && events[nodes[endIdx + 1]].type
      if (nextType === 'user/message') break
      endIdx += 1
    }
  }
  const start = nodes[startIdx]
  const end = nodes[endIdx]
  const shadowedSeqs = nodes.slice(startIdx, endIdx + 1)
  try {
    // 空 content 的 assistant/message：deriveEventMessage 对其返回 null，
    // 模型上下文中完全不可见（系统本身就用这种消息仅承载 usage）。
    // 必须携带合法 message.id + model source（复制最近 assistant 的
    // provider/model）+ turn/step，否则持久化校验失败、重启后整个会话
    // 加载报「lacks an identified message」损坏错误。
    const meta = lastAssistantMeta(session)
    session.append('assistant/message', {
      turn: meta.turn,
      step: meta.step,
      message: {
        id: `nio-delete:${randomUUID()}`,
        role: 'assistant',
        content: [],
        source: meta.source,
      },
    }, {
      surfaceOp: { op: 'replace', start, end },
      sourceEventSeqs: shadowedSeqs,
    })
  } catch (error) {
    return { ok: false, error: { code: 'append-failed', message: `删除失败: ${String(error && error.message ? error.message : error)}` } }
  }
  return { ok: true, value: { deleted: shadowedSeqs.length, seqs: shadowedSeqs } }
}

/* ------------------------------------------------------------------ */
/* HTTP 路由                                                           */
/* ------------------------------------------------------------------ */

/** 请求处理器：仅接受同源 JSON POST，按 action 分发。 */
async function handle(ctx, cfg, req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    requestError(res, 405, 'method-not-allowed', 'Use POST')
    return
  }
  if (!sameOriginPost(req)) {
    requestError(res, 403, 'origin-rejected', 'The request must originate from this DSH Web application')
    return
  }
  let parsed
  try {
    parsed = JSON.parse(await readBody(req, 64 * 1024))
  } catch (error) {
    requestError(res, error instanceof RangeError ? 413 : 400, 'invalid-request', String(error.message || error))
    return
  }
  const action = typeof parsed.action === 'string' ? parsed.action : ''
  const cwd = typeof parsed.cwd === 'string' ? parsed.cwd : ''
  const editorId = typeof parsed.editorId === 'string' ? parsed.editorId : ''
  try {
    switch (action) {
      case 'get-config':
        responseJson(res, 200, { ok: true, value: { config: publicConfig(cfg) } })
        break
      case 'set-config': {
        const patch = parsed.config && typeof parsed.config === 'object' ? parsed.config : {}
        if (typeof patch.enabled === 'boolean') cfg.enabled = patch.enabled
        if (typeof patch.editor === 'string') cfg.editor = patch.editor
        if (typeof patch.showRestart === 'boolean') cfg.showRestart = patch.showRestart
        if (typeof patch.menuQuickActions === 'boolean') cfg.menuQuickActions = patch.menuQuickActions
        if (typeof patch.sessionDoneMark === 'boolean') cfg.sessionDoneMark = patch.sessionDoneMark
        if (typeof patch.flatListStyle === 'boolean') cfg.flatListStyle = patch.flatListStyle
        if (typeof patch.headerViewSwitches === 'boolean') cfg.headerViewSwitches = patch.headerViewSwitches
        if (typeof patch.messageDelete === 'boolean') cfg.messageDelete = patch.messageDelete
        writeConfigFile(cfg.configFile, cfg)
        responseJson(res, 200, { ok: true, value: { config: publicConfig(cfg) } })
        break
      }
      case 'list-editors':
        responseJson(res, 200, { ok: true, value: await listEditors(ctx) })
        break
      case 'open-in-finder':
        responseJson(res, 200, { ok: true, value: await openInFinder(ctx, cwd) })
        break
      case 'open-with-editor':
        responseJson(res, 200, { ok: true, value: await openWithEditor(ctx, cwd, editorId) })
        break
      case 'list-last-user-messages': {
        // 批量读取会话的最后一条用户消息（单列表模式行预览）。
        // 输入 sessionIds 上限 100，避免单个请求体过大。
        const ids = Array.isArray(parsed.sessionIds) ? parsed.sessionIds.filter((x) => typeof x === 'string').slice(0, 100) : []
        const items = []
        for (const id of ids) {
          const found = await lastUserMessage(ctx, id)
          if (found) items.push({ sessionId: id, text: found.text, time: found.time })
        }
        responseJson(res, 200, { ok: true, value: { items } })
        break
      }
      case 'list-surface': {
        // 读取当前会话的 surface 节点列表（消息删除按钮定位 seq 用）。
        const sessionId = typeof parsed.sessionId === 'string' ? parsed.sessionId : ''
        const sessions = ctx.get('sessions')
        const session = sessions && typeof sessions.get === 'function' ? sessions.get(sessionId) : undefined
        if (!session) {
          requestError(res, 404, 'session-not-found', '会话不存在或已关闭')
          break
        }
        responseJson(res, 200, { ok: true, value: { items: surfaceItemList(session) } })
        break
      }
      case 'delete-message': {
        // 删除会话中的一条消息（surface replace 遮蔽，模型上下文不再包含）。
        const sessionId = typeof parsed.sessionId === 'string' ? parsed.sessionId : ''
        const seq = parsed.seq
        const result = await deleteMessage(ctx, sessionId, typeof seq === 'number' ? seq : NaN)
        if (result.ok) responseJson(res, 200, { ok: true, value: result.value })
        else requestError(res, 400, result.error.code, result.error.message)
        break
      }
      case 'ping':
        // 重启后前端轮询探测用：服务恢复即可达。
        responseJson(res, 200, { ok: true, value: { alive: true } })
        break
      case 'restart':
        responseJson(res, 200, { ok: true, value: { restarting: true } })
        scheduleRestart()
        break
      default:
        requestError(res, 400, 'unknown-action', `unknown action: ${action}`)
    }
  } catch (error) {
    requestError(res, 500, 'internal', String(error.message || error))
  }
}

/**
 * 硬性重启 DeepSeek Harness 服务。
 *
 * 本插件运行在 dsh 进程内部，无法"拿到句柄优雅自重启"，因此采用
 * spawn 一个 detached 的重启代理进程 + 当前进程主动退出的方式：
 *   1. 代理进程与当前进程完全脱离（detached + stdio ignore + unref），
 *      当前进程退出后它继续存活；
 *   2. 代理等待 1.2s（给当前进程退出、端口 3080 释放留足时间），
 *      然后用与当前进程完全相同的命令（execPath + argv）拉起新实例；
 *   3. 当前进程在 HTTP 响应 flush 之后（300ms）彻底退出。
 *
 * 若 spawn 失败，代理静默退出，当前进程也会退出——用户需手动重启，
 * 这是"硬性重启"的固有风险，前端会在 30s 超时后提示手动刷新。
 */
function scheduleRestart() {
  const nextArgv = [process.argv[1], ...process.argv.slice(2)]
  const proxy = `
const { spawn } = require('node:child_process');
setTimeout(() => {
  try {
    const child = spawn(process.execPath, ${JSON.stringify(nextArgv)}, {
      detached: true,
      stdio: 'ignore',
      env: process.env,
      cwd: ${JSON.stringify(process.cwd())},
    });
    child.unref();
  } catch (error) { /* 拉起失败：静默退出，等待用户手动处理 */ }
  process.exit(0);
}, 1200);
`
  try {
    const child = spawn(process.execPath, ['-e', proxy], {
      detached: true,
      stdio: 'ignore',
      env: process.env,
    })
    child.unref()
  } catch (error) {
    /* 代理拉起失败：仍尝试退出当前进程（放弃重启） */
  }
  setTimeout(() => process.exit(0), 300)
}

/**
 * 插件入口：挂载同源 HTTP 路由。
 * 注意：Loader 并发启动各 entry，本插件虽声明 inject webServer，但为与
 * dsh-niao-message 一致的稳妥写法，仍通过 internal/service 事件在
 * webServer 就绪后重试注册。
 */
export function apply(ctx, config = {}) {
  const cfg = resolveConfig(config)
  let routeRegistered = false
  let disposed = false
  const registerRoute = () => {
    if (routeRegistered || disposed) return
    const ws = ctx.get('webServer')
    if (!ws) return
    routeRegistered = true
    const detach = ws.register({
      kind: 'exact',
      path: ROUTE_PATH,
      handler: (req, res) => handle(ctx, cfg, req, res),
    })
    ctx.effect(() => detach, 'dsh-niao-quick-open: route')
  }
  registerRoute()
  ctx.on('internal/service', (name) => {
    if (name === 'webServer') registerRoute()
  })
  // 订阅会话事件：用户发出内容时即时更新「最后一条用户消息」字段。
  subscribeLastUserPrompt(ctx)
  ctx.effect(() => () => { disposed = true }, 'dsh-niao-quick-open: dispose')
}

/* ------------------------------------------------------------------ */
/* HTTP 工具                                                           */
/* ------------------------------------------------------------------ */

function responseJson(res, status, body) {
  const bytes = Buffer.from(JSON.stringify(body))
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Content-Length', String(bytes.length))
  res.setHeader('Cache-Control', 'no-store')
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.writeHead(status)
  res.end(bytes)
}

function requestError(res, status, code, message) {
  responseJson(res, status, { ok: false, error: { code, message } })
}

async function readBody(req, maxBytes) {
  const chunks = []
  let bytes = 0
  for await (const chunk of req) {
    const part = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
    bytes += part.length
    if (bytes > maxBytes) throw new RangeError('request body too large')
    chunks.push(part)
  }
  if (chunks.length === 0) throw new TypeError('empty request body')
  return Buffer.concat(chunks).toString('utf-8')
}

/** 仅接受来自本 DSH Web 应用的同源 POST。 */
function sameOriginPost(req) {
  const fetchSite = req.headers['sec-fetch-site']
  if (fetchSite === 'cross-site') return false
  const origin = req.headers.origin
  if (origin === undefined) return fetchSite === 'same-origin' || fetchSite === 'same-site' || fetchSite === 'none'
  const host = req.headers.host
  if (host === undefined) return false
  try {
    const parsed = new URL(origin)
    return (parsed.protocol === 'http:' || parsed.protocol === 'https:') && parsed.host === host
  } catch {
    return false
  }
}
