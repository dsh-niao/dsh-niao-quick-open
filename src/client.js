/**
 * dsh-niao-quick-open — 浏览器端入口（static bundle 入口）。
 *
 * 本文件仅负责装配：导入各功能模块、注入全局样式、挂起 DOM 观察器
 * （MutationObserver + 兜底轮询）、注册设置页并预热配置。各功能实现
 * 已按模块拆分到同目录下的独立文件：
 *
 *  - constants.js      字符串常量（路由 / localStorage 键 / 重启白名单）
 *  - state.js          共享运行时状态（pluginConfig / runtimeCtx / configBaseline）
 *  - utils.js          基础工具（rpc / 剪贴板 / 文案字典 / 幂等 DOM 写入）
 *  - icons.js          SVG 图标
 *  - config.js         配置拉取 / 应用 / 编辑器迁移（registerUIApply 回调）
 *  - header.js         会话 header 工作区行
 *  - workspace-menu.js 工作区「⋯」菜单快捷按钮行
 *  - session-done.js   会话待办标记圆点
 *  - flat-list.js      单列表（flat）三行布局 + hover 卡片禁用
 *  - settings.js       设置面板「界面功能」（React 组件）
 *  - restart.js        左下角「硬性重启」按钮 + 二次确认 + 等待层
 *  - styles.js         全部样式（CSS 常量）
 *
 * @module dsh-niao-quick-open/client
 */

import React from 'react'

import { setRuntimeCtx } from './state.js'
import { refreshConfig, migrateLegacyEditor } from './config.js'
import { ensureHeaderRow } from './header.js'
import { ensureWorkspaceMenuActions } from './workspace-menu.js'
import { clearDoneOnOpen, ensureSessionDoneDots } from './session-done.js'
import { ensureFlatEnhance, fixFlatRowMenuPosition, hideFlatHoverCards, installFlatPointerGuard } from './flat-list.js'
import { installDblclickRename } from './dblclick-rename.js'
import { ensureHeaderViewSwitches } from './header-view-switches.js'
import { ConfigPanel } from './settings.js'
import { ensureRestartButton } from './restart.js'
import { CSS } from './styles.js'

/* ------------------------------------------------------------------ */
/* DOM 观察与扫描                                                       */
/* ------------------------------------------------------------------ */

/** 维护会话 header 工作区行、左下角重启按钮、工作区「⋯」菜单快捷按钮行、会话待办标记圆点与单列表三行布局（DOM 由 React 管理，每次变化后补回）。 */
function scan() {
  try { ensureHeaderRow() } catch { /* header 尚未就绪时静默跳过 */ }
  try { ensureRestartButton() } catch { /* 设置区尚未就绪时静默跳过 */ }
  try { ensureWorkspaceMenuActions() } catch { /* 菜单尚未就绪时静默跳过 */ }
  try { clearDoneOnOpen() } catch { /* 会话区尚未就绪时静默跳过 */ }
  try { ensureSessionDoneDots() } catch { /* 会话区尚未就绪时静默跳过 */ }
  try { ensureFlatEnhance() } catch { /* flat 列表尚未就绪时静默跳过 */ }
  try { ensureHeaderViewSwitches() } catch { /* 头部图标未就绪时静默跳过 */ }
  try { fixFlatRowMenuPosition() } catch { /* 菜单定位失败时忽略 */ }
  try { hideFlatHoverCards() } catch { /* 卡片隐藏失败时忽略 */ }
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
  setRuntimeCtx(ctx)

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
    // 安装单列表 hover 卡片拦截（window 捕获 pointerover，全局一次性）。
    installFlatPointerGuard()
    // 安装会话双击重命名（document 捕获 dblclick，全局一次性）。
    installDblclickRename()
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
