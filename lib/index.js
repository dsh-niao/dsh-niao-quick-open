/**
 * dsh-niao-quick-open — DeepSeek Harness profile bundle.
 *
 * Host half: exposes the workspace-action HTTP surface used by the browser
 * half (file-manager open, editor open, editor discovery). The browser half
 * registers the session-header buttons in `conversation.session.header.utilities`
 * and calls this same-origin route with JSON POSTs.
 *
 * @module dsh-niao-quick-open
 */

import { Buffer } from 'node:buffer'

export const name = 'dsh-niao-quick-open'

export const inject = ['webServer', 'fs', 'shell', 'subprocess']

/** Route path (same-origin, exact). */
const ROUTE_PATH = '/api/dsh-niao-quick-open'

/** Editor discovery cache TTL. */
const EDITOR_CACHE_TTL = 30000

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

/** Simple deterministic icon data-URI (brand color + letter). */
function iconDataUri(bg, letter) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="44" height="44"><rect width="44" height="44" rx="9" fill="${bg}"/><text x="22" y="29" font-family="-apple-system,Segoe UI,Arial,sans-serif" font-size="20" font-weight="700" text-anchor="middle" fill="#ffffff">${letter}</text></svg>`
  return 'data:image/svg+xml;base64,' + Buffer.from(svg, 'utf-8').toString('base64')
}

const EDITOR_DEFS_WITH_ICON = EDITOR_DEFS.map((ed) => ({
  ...ed,
  icon: iconDataUri(ed.bg, ed.letter),
}))

/** Plugin entry: mount the same-origin HTTP surface. */
export function apply(ctx) {
  let editorCache = { at: 0, list: [] }

  const exists = async (p) => {
    const fs = ctx.fs
    if (!fs) return false
    try { return !!(await fs.lstat(p)) } catch { return false }
  }

  const detectPlatform = async () => {
    if (await exists('/Applications')) return 'macos'
    if (await exists('C:\\Windows')) return 'windows'
    return 'linux'
  }

  const runShell = async (command) => {
    const shell = ctx.shell
    if (!shell) return false
    try {
      const spec = shell.resolve({ command, timeoutMs: 15000 })
      const res = await shell.run(spec)
      return res.exitCode === 0
    } catch { return false }
  }

  const listEditors = async () => {
    const now = Date.now()
    if (now - editorCache.at < EDITOR_CACHE_TTL) return editorCache.list
    const platform = await detectPlatform()
    const found = []
    for (const ed of EDITOR_DEFS_WITH_ICON) {
      let appPath = null
      let cliPath = null
      if (platform === 'macos') {
        for (const app of ed.apps) {
          const p = '/Applications/' + app
          if (await exists(p)) { appPath = p; break }
        }
        if (!appPath) {
          for (const app of ed.apps) {
            const p = '/System/Applications/' + app
            if (await exists(p)) { appPath = p; break }
          }
        }
      } else if (platform === 'windows') {
        const winApps = [
          'C:\\Program Files\\' + (ed.apps[0] || ''),
          'C:\\Program Files (x86)\\' + (ed.apps[0] || ''),
          'C:\\Users\\Public\\AppData\\Local\\Programs\\' + (ed.apps[0] || ''),
        ]
        for (const p of winApps) if (await exists(p)) { appPath = p; break }
      }
      if (!appPath && ed.cli) {
        try {
          const sub = ctx.subprocess
          if (sub) cliPath = await sub.resolveExecutable(ed.cli)
        } catch { /* cli absent */ }
      }
      if (appPath || cliPath) {
        found.push({ id: ed.id, name: ed.name, icon: ed.icon, appPath, cliPath })
      }
    }
    editorCache = { at: now, list: found }
    return found
  }

  const openInFinder = async (cwd) => {
    if (!cwd) return { ok: false }
    const platform = await detectPlatform()
    const cmd = platform === 'windows' ? `explorer "${cwd}"` : platform === 'linux' ? `xdg-open "${cwd}"` : `open "${cwd}"`
    return { ok: await runShell(cmd) }
  }

  const openWithEditor = async (cwd, editorId) => {
    if (!cwd || !editorId) return { ok: false }
    const editors = await listEditors()
    const ed = editors.find((e) => e.id === editorId)
    if (!ed) return { ok: false, reason: 'not-found' }
    const platform = await detectPlatform()
    let command
    if (platform === 'macos') {
      if (ed.appPath) {
        const appName = ed.appPath.split('/').pop().replace(/\.app$/, '')
        command = `open -a "${appName}" "${cwd}"`
      } else if (ed.cliPath) {
        command = `"${ed.cliPath}" "${cwd}"`
      }
    } else if (platform === 'windows') {
      if (ed.cliPath) command = `"${ed.cliPath}" "${cwd}"`
      else if (ed.appPath) command = `start "" "${ed.appPath}" "${cwd}"`
    } else {
      if (ed.cliPath) command = `"${ed.cliPath}" "${cwd}"`
      else if (ed.appPath) command = `"${ed.appPath}" "${cwd}"`
    }
    if (!command) return { ok: false, reason: 'no-command' }
    return { ok: await runShell(command) }
  }

  const handle = async (req, res) => {
    if (req.method === 'GET') {
      responseJson(res, 200, { ok: true, value: { editors: await listEditors() } })
      return
    }
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'GET, POST')
      requestError(res, 405, 'method-not-allowed', 'Use GET or POST')
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
        case 'list-editors':
          responseJson(res, 200, { ok: true, value: await listEditors() })
          break
        case 'open-in-finder':
          responseJson(res, 200, { ok: true, value: await openInFinder(cwd) })
          break
        case 'open-with-editor':
          responseJson(res, 200, { ok: true, value: await openWithEditor(cwd, editorId) })
          break
        default:
          requestError(res, 400, 'unknown-action', `unknown action: ${action}`)
      }
    } catch (error) {
      requestError(res, 500, 'internal', String(error.message || error))
    }
  }

  const detach = ctx.webServer.register({
    kind: 'exact',
    path: ROUTE_PATH,
    handler: (req, res) => handle(req, res),
  })
  ctx.effect(() => detach, 'dsh-niao-quick-open: route')
}

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
