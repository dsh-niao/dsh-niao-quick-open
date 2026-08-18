/**
 * dsh-niao-quick-open — 浏览器端：左下角「硬性重启」按钮。
 *
 * 在 DSH 设置按钮（sidebar 左下角 settingsArea）右侧注入「重启」图标按钮：
 * 点击弹出二次确认框，确认后通知宿主端硬性重启服务，前台轮询探测服务
 * 恢复并自动刷新页面。受配置「重启按钮」开关控制。
 *
 * @module dsh-niao-quick-open/client/restart
 */

import { pluginConfig } from './state.js'
import { rpc } from './utils.js'
import { restartSvg } from './icons.js'
import { registerUIApply } from './config.js'

/** 定位左下角设置区容器（重启按钮的注入锚点）。多级回退，不依赖单一类名。 */
export function findSettingsArea() {
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
export function ensureRestartButton() {
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
export function showRestartConfirm(opts) {
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

/** 配置「重启按钮」开关变化时重建按钮。 */
registerUIApply(() => { try { ensureRestartButton() } catch { /* 设置区未就绪时忽略 */ } })
