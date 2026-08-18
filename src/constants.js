/**
 * dsh-niao-quick-open — 浏览器端常量。
 *
 * 集中管理跨模块共享的字符串常量：宿主路由、localStorage 键、
 * 「需要重启才能生效」的配置键白名单。
 *
 * @module dsh-niao-quick-open/client/constants
 */

/** 宿主路由（与 lib/index.js 的 ROUTE_PATH 对应）。 */
export const ROUTE = '/api/dsh-niao-quick-open'

/** 旧版常用编辑器选择的 localStorage 键（用于迁移到宿主端配置）。 */
export const EDITOR_KEY = 'dsh.niao.quickOpen.editor'

/** 会话待办标记 id 集合的 localStorage 键（JSON 数组）。 */
export const DONE_IDS_KEY = 'dsh.niao.quickOpen.doneSessionIds'

/**
 * 修改后「真的需要重启才能生效」的配置键白名单。
 * 当前所有面板配置（enabled/editor/showRestart/menuQuickActions/sessionDoneMark）
 * 都是 set-config 即时生效的：宿主端内存配置即时更新、客户端 UI 即时重建，
 * 因此均不需要重启。仅当未来加入宿主端启动时才读取、运行时无法热更新的
 * 配置时，把对应键加入此白名单，configDirty 才会因它变 true。
 */
export const RESTART_REQUIRED_KEYS = []
