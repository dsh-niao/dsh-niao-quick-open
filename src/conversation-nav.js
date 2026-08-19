/**
 * dsh-niao-quick-open — 浏览器端：会话右侧「用户消息导航条」（入口）。
 *
 * 维护「每个对话滚动容器一个 Rail」的挂载集合：每次 scan 时同步
 * 当前可见的 [data-conversation-scroll] 容器，为新容器挂载 Rail、
 * 为消失的容器销毁 Rail。受配置「用户消息导航条」开关控制
 * （关闭时销毁全部，重新打开时恢复）。
 *
 * @module dsh-niao-quick-open/client/conversation-nav
 */

import { pluginConfig } from './state.js'
import { registerUIApply } from './config.js'
import { Rail, SCROLLPORT_SELECTOR } from './nav-rail.js'

/** 已挂载的 Rail 集合（scrollport → Rail）。 */
const rails = new Map()

/** 销毁全部 Rail（配置关闭 / 滚动容器全部消失时）。 */
function disposeAll() {
  for (const rail of rails.values()) rail.dispose()
  rails.clear()
}

/**
 * 扫描并维护「用户消息导航条」。幂等：每个滚动容器只挂载一次；
 * 容器销毁 / 配置关闭时自动清理。由 client.js 的 scan() 每帧调用。
 */
export function ensureConversationNav() {
  if (!pluginConfig.conversationNav) {
    disposeAll()
    return
  }
  const live = new Set(Array.from(document.querySelectorAll(SCROLLPORT_SELECTOR)))
  for (const [element, rail] of rails) {
    if (!live.has(element) || !element.isConnected) {
      rail.dispose()
      rails.delete(element)
    }
  }
  for (const element of live) {
    if (!rails.has(element)) {
      try { rails.set(element, new Rail(element)) } catch { /* 挂载失败时下次扫描重试 */ }
    }
  }
}

/** 配置「用户消息导航条」开关变化时立即重建。 */
registerUIApply(() => { try { ensureConversationNav() } catch { /* 滚动容器未就绪时忽略 */ } })
