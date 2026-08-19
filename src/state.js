/**
 * dsh-niao-quick-open — 浏览器端共享运行时状态。
 *
 * 各功能模块通过 import 共享同一份可变状态：
 *  - pluginConfig：运行时配置缓存，各模块按属性读写（同一对象引用，实时可见）；
 *  - runtimeCtx：apply 时保存的 client 根 ctx（仅保存引用，供 sessions /
 *    workspaces / slots 可选读取），经 setRuntimeCtx 整体替换；
 *  - configBaseline：「需要重启才能生效」的配置基线，经 setConfigBaseline
 *    整体替换（ESM live binding 下整体替换必须走 setter）。
 *
 * @module dsh-niao-quick-open/client/state
 */

/** 运行时配置缓存：{ enabled, editor, showRestart, menuQuickActions, sessionDoneMark, flatListStyle, headerViewSwitches, messageDelete, conversationNav }。 */
export let pluginConfig = { enabled: true, editor: '', showRestart: true, menuQuickActions: false, sessionDoneMark: false, flatListStyle: true, headerViewSwitches: false, messageDelete: true, conversationNav: true }

/** apply 时保存的 client 根 ctx（仅保存引用，供 sessions / slots 可选读取）。 */
export let runtimeCtx = null

/** 设置 client 根 ctx（apply 入口调用一次）。 */
export function setRuntimeCtx(ctx) { runtimeCtx = ctx }

/**
 * 「需要重启才能生效」的配置基线：页面加载（apply 首次拉取配置）时宿主端
 * 的配置快照。此后 set-config 修改的配置与其比对，差异即视为待重启生效；
 * 重启后页面重载会重新取基线，横幅随之消失。模块级变量使其在设置面板
 * 关闭/重开之间保持（需求：关闭设置再打开横幅仍展示）。
 */
export let configBaseline = null

/** 整体替换配置基线（首次拉取配置时调用一次）。 */
export function setConfigBaseline(value) { configBaseline = value }
