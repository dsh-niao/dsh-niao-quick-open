/**
 * dsh-niao-quick-open 宿主端类型声明。
 *
 * 宿主端导出 cordis 插件入口（name / inject / apply），浏览器端通过
 * 同源路由 /api/dsh-niao-quick-open 调用宿主能力。
 *
 * @module dsh-niao-quick-open
 */

export declare const name: 'dsh-niao-quick-open'

export declare const inject: string[]

export declare function apply(ctx: unknown): void
