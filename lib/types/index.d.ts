/**
 * dsh-niao-quick-open 宿主端类型声明。
 *
 * 宿主端导出 cordis 插件入口（name / inject / Config / apply），浏览器端
 * 通过同源路由 /api/dsh-niao-quick-open 调用宿主能力。
 *
 * @module dsh-niao-quick-open
 */

/** 插件配置项（设置面板「界面功能」）。 */
export interface Config {
  /** 「工作区快捷按钮」显示开关。 */
  enabled: boolean
  /** 常用编辑器 id；空串 = 未设置。 */
  editor: string
  /** 左下角「硬性重启」按钮显示开关。 */
  showRestart: boolean
  /** 工作区行菜单快捷按钮开关。 */
  menuQuickActions: boolean
  /** 「会话待记标记」开关。 */
  sessionDoneMark: boolean
  /** 「单列表增强样式」开关。 */
  flatListStyle: boolean
  /** 「工作区栏头部增强」开关。 */
  headerViewSwitches: boolean
  /** 「用户消息导航条」开关。 */
  conversationNav: boolean
  /** 设置面板持久化配置文件路径（高级项，通常保持默认）。 */
  configFile: string
}

export declare const name: 'dsh-niao-quick-open'

export declare const inject: string[]

/** 配置 schema（Schemastery）：Cordis 加载时校验并填充默认值。 */
export declare const Config: import('@deepseek-ai/schemastery').Schema<Config>

export declare function apply(ctx: unknown, config: Config): void
