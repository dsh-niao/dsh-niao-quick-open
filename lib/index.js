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
  /** 设置面板持久化配置文件路径。 */
  configFile: join(homedir(), '.dsh', 'dsh-niao-quick-open.config.json'),
}

/** 面板可持久化的键。 */
const PERSIST_KEYS = ['enabled', 'editor', 'showRestart', 'menuQuickActions']

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
  return { enabled: cfg.enabled, editor: cfg.editor, showRestart: cfg.showRestart, menuQuickActions: cfg.menuQuickActions }
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
