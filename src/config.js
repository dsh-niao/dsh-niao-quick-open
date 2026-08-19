/**
 * dsh-niao-quick-open — 浏览器端配置管理。
 *
 * 与宿主端 config.json 的读写同步、运行时配置缓存更新、「需要重启才能
 * 生效」的基线判定、旧版 localStorage 编辑器选择迁移。
 *
 * applyConfigPatch 触发各 UI 模块重建采用回调注册机制（registerUIApply），
 * 避免本模块反向依赖 UI 模块造成循环引用。
 *
 * @module dsh-niao-quick-open/client/config
 */

import { EDITOR_KEY, RESTART_REQUIRED_KEYS } from './constants.js'
import { pluginConfig, configBaseline, setConfigBaseline } from './state.js'
import { rpc } from './utils.js'

/** UI 重建回调列表（各功能模块在加载时注册自己的 ensure 函数）。 */
const uiAppliers = []

/** 注册一个「配置变化后重建 UI」的回调（由各功能模块在模块加载时调用）。 */
export function registerUIApply(fn) {
  if (typeof fn === 'function') uiAppliers.push(fn)
}

/** 从宿主端拉取最新配置并更新缓存；首次成功时记录配置基线。 */
export async function refreshConfig() {
  const res = await rpc('get-config')
  if (res.ok && res.value && res.value.config) {
    if (configBaseline === null) setConfigBaseline({ ...res.value.config })
    applyConfigPatch(res.value.config)
    return true
  }
  return false
}

/** 当前配置与基线是否有差异（仅比较「需要重启才能生效」的白名单键）。 */
export function configDirty() {
  if (!configBaseline) return false
  for (const key of RESTART_REQUIRED_KEYS) {
    if (pluginConfig[key] !== configBaseline[key]) return true
  }
  return false
}

/** 应用一份配置补丁：更新缓存，并在任一「显示开关」变化时立即重建对应 UI。 */
export function applyConfigPatch(next) {
  const changed = next && (typeof next.enabled === 'boolean' || typeof next.editor === 'string' || typeof next.showRestart === 'boolean' || typeof next.menuQuickActions === 'boolean' || typeof next.sessionDoneMark === 'boolean' || typeof next.flatListStyle === 'boolean' || typeof next.headerViewSwitches === 'boolean' || typeof next.messageDelete === 'boolean' || typeof next.conversationNav === 'boolean')
  if (next && typeof next.enabled === 'boolean') pluginConfig.enabled = next.enabled
  if (next && typeof next.editor === 'string') pluginConfig.editor = next.editor
  if (next && typeof next.showRestart === 'boolean') pluginConfig.showRestart = next.showRestart
  if (next && typeof next.menuQuickActions === 'boolean') pluginConfig.menuQuickActions = next.menuQuickActions
  if (next && typeof next.sessionDoneMark === 'boolean') pluginConfig.sessionDoneMark = next.sessionDoneMark
  if (next && typeof next.flatListStyle === 'boolean') pluginConfig.flatListStyle = next.flatListStyle
  if (next && typeof next.headerViewSwitches === 'boolean') pluginConfig.headerViewSwitches = next.headerViewSwitches
  if (next && typeof next.messageDelete === 'boolean') pluginConfig.messageDelete = next.messageDelete
  if (next && typeof next.conversationNav === 'boolean') pluginConfig.conversationNav = next.conversationNav
  if (changed) {
    for (const fn of uiAppliers) {
      try { fn() } catch { /* 单个模块重建失败不影响其他模块 */ }
    }
  }
}

/** 读取已设置的常用编辑器 id；未设置返回空串。 */
export function getEditor() {
  return pluginConfig.editor || ''
}

/** 保存常用编辑器 id（空串 = 清除），持久化到宿主端 config.json。 */
export async function setEditor(id) {
  const editor = id || ''
  pluginConfig.editor = editor
  await rpc('set-config', { config: { editor } })
}

/** 迁移旧版 localStorage 里的编辑器选择到宿主端配置（一次性）。 */
export async function migrateLegacyEditor() {
  if (pluginConfig.editor) return
  let legacy = ''
  try { legacy = window.localStorage.getItem(EDITOR_KEY) || '' } catch { /* 存储不可用 */ }
  if (!legacy) return
  await setEditor(legacy)
  try { window.localStorage.removeItem(EDITOR_KEY) } catch { /* 忽略 */ }
}
