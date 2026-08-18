/**
 * dsh-niao-quick-open — 浏览器端样式。
 *
 * 全部使用 DSH 主题语义变量（--dsw-alias-*），随亮/暗主题自动切换。
 * 按功能模块分区注释：会话 header 工作区行 → 工作区菜单快捷按钮 →
 * 会话待办圆点 → 单列表三行布局 → 设置面板 → 左下角重启按钮 →
 * 重启确认框/等待层。
 *
 * @module dsh-niao-quick-open/client/styles
 */

export const CSS = `
/* 全部使用 DSH 主题语义变量（--dsw-alias-*），随亮/暗主题自动切换 */
/* 会话 header（wSkVaW_header 为原生类名）：收紧顶部留白 */
.wSkVaW_header{padding-top:5px !important}
/* 会话 header 工作区行（第一行） */
.nio-hrow{box-sizing:border-box;display:flex;align-items:center;gap:6px;min-height:20px;margin:0 0 2px;padding:2px 10px 2px 2px;background:var(--dsw-alias-interactive-bg-hover);border-radius:12px;width:fit-content;max-width:100%}
.nio-hchip{box-sizing:border-box;flex:none;max-width:260px;padding:1px 8px;border:1px solid color-mix(in srgb,var(--dsw-alias-state-business-primary) 30%,transparent);border-radius:999px;background:color-mix(in srgb,var(--dsw-alias-state-business-primary) 14%,transparent);color:var(--dsw-alias-state-business-primary);font-size:11px;line-height:15px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.nio-hbtn{position:relative;cursor:pointer;width:18px;height:18px;border:none;background:transparent;color:var(--dsw-alias-label-tertiary);border-radius:4px;padding:0;display:inline-flex;align-items:center;justify-content:center}
.nio-hbtn:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}
.nio-hbtn svg{display:block;width:14px;height:14px}
.nio-htip{position:absolute;top:calc(100% + 6px);left:50%;transform:translateX(-50%);white-space:nowrap;background:var(--dsw-alias-tooltip-bg);color:#f2f2f2;border:1px solid rgba(255,255,255,0.12);border-radius:6px;padding:4px 8px;font-size:11px;line-height:15px;pointer-events:none;opacity:0;transition:opacity .12s ease;z-index:2147483001;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif}
.nio-hbtn:hover .nio-htip{opacity:1}
.nio-hfeed{font-size:11px;line-height:16px;color:var(--dsw-alias-state-success-primary);padding:0 2px;white-space:nowrap}
.nio-hfeed.err{color:var(--dsw-alias-state-error-primary)}
/* 会话名（第二行）放大 */
[class*="crumbCurrent"]{font-size:19px !important;line-height:27px !important;max-width:none !important;font-weight:600 !important}
/* 工作区「⋯」菜单：快捷按钮行（挂在 list 末尾、viewport 滚动容器外） */
[data-nio-mqa-menu]{overflow:visible !important}
[data-nio-mqa-menu] > [role="presentation"]{max-height:none !important;overflow:visible !important}
.nio-mqa{box-sizing:border-box;display:flex;align-items:center;gap:4px;padding:6px 12px;border-top:1px solid var(--dsw-alias-border-l2);margin-top:2px}
.nio-mqa-btn{position:relative;width:22px;height:22px;color:var(--dsw-alias-label-secondary);background:transparent;border:none;border-radius:5px;padding:0;display:inline-flex;align-items:center;justify-content:center;cursor:pointer}
.nio-mqa-btn:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}
.nio-mqa-btn svg{display:block;width:14px;height:14px}
.nio-mqa-tip{position:absolute;top:calc(100% + 6px);left:50%;transform:translateX(-50%);white-space:nowrap;background:var(--dsw-alias-tooltip-bg);color:#f2f2f2;border:1px solid rgba(255,255,255,0.12);border-radius:6px;padding:4px 8px;font-size:11px;line-height:15px;pointer-events:none;opacity:0;transition:opacity .12s ease;z-index:2147483001;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif}
.nio-mqa-btn:hover .nio-mqa-tip{opacity:1}
.nio-mqa-feedback{font-size:11px;line-height:16px;color:var(--dsw-alias-state-success-primary);margin-left:2px;white-space:nowrap}
.nio-mqa-feedback.err{color:var(--dsw-alias-state-error-primary)}
/* 会话待办标记圆点：完整复刻原生 _dot_10orb_3（span 透明 + :before 晕圈 + :after 内芯，currentColor 着色） */
.nio-sdone{position:relative;box-sizing:border-box;flex:none;width:16px;height:20px;border:none;background:transparent;padding:0;margin:0;display:inline-flex;align-items:center;justify-content:center;cursor:pointer;color:var(--dsw-alias-label-tertiary)}
/* 内层圆点：与原生规则一致（position:relative + :before/:after 双层圆），仅颜色不同 */
.nio-sdone-dot{position:relative;display:inline-block;flex:none;width:10px;height:10px;box-sizing:border-box;opacity:0 !important;transition:opacity .12s ease,color .15s ease !important;color:var(--dsw-alias-label-tertiary) !important}
.nio-sdone-dot:before{content:"";position:absolute;top:0;right:0;bottom:0;left:0;border-radius:50%;background:currentColor;opacity:.1}
.nio-sdone-dot:after{content:"";position:absolute;top:20%;right:20%;bottom:20%;left:20%;border-radius:50%;background:currentColor}
[class*="sessionRow"]:hover .nio-sdone .nio-sdone-dot{opacity:.8 !important}
.nio-sdone:hover .nio-sdone-dot{opacity:1 !important}
.nio-sdone-marked .nio-sdone-dot{opacity:1 !important;color:var(--dsw-alias-state-success-primary) !important}
.nio-sdone-vh{clip:rect(0 0 0 0);white-space:nowrap;width:1px;height:1px;position:absolute;overflow:hidden}
.nio-sdone-tip{position:absolute;bottom:calc(100% + 6px);left:0;white-space:nowrap;background:var(--dsw-alias-tooltip-bg);color:#f2f2f2;border:1px solid rgba(255,255,255,0.12);border-radius:6px;padding:4px 8px;font-size:11px;line-height:15px;pointer-events:none;opacity:0;transition:opacity .12s ease;z-index:2147483001;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif}
.nio-sdone:hover .nio-sdone-tip{opacity:1}
/* 单列表 hover 悬浮卡片兜底隐藏（只加类不删节点，React 卸载不受影响） */
.nio-hide-card{display:none !important;visibility:hidden !important;pointer-events:none !important}
/* 单列表（flat）会话行：三行布局（第一行 状态图标+chip+时间 / 第二行标题 / 第三行预览） */
.nio-flat-row{height:auto !important;min-height:82px;box-sizing:border-box;display:grid !important;grid-template-columns:auto minmax(0,1fr) auto;grid-template-rows:auto auto auto;column-gap:6px;row-gap:1px;align-items:center;padding:7px 8px !important}
/* 无前置图标（默认）：chip 跨前两列、time/actions 在最右列 */
.nio-flat-slot{grid-column:1;grid-row:1;align-self:center;justify-self:center;min-width:0}
.nio-flat-chip{grid-column:1 / 3;grid-row:1;align-self:center;justify-self:start;min-width:0}
.nio-fchip{box-sizing:border-box;max-width:180px;font-size:12px;line-height:16px;font-weight:600;color:var(--dsw-alias-label-secondary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
/* 选中会话时工作区名称变亮色（aria-selected 原生属性，无 hash 类名依赖） */
.nio-flat-row[aria-selected="true"] .nio-fchip{color:var(--dsw-alias-state-business-primary)}
.nio-flat-time{grid-column:3;grid-row:1;align-self:center;justify-self:end;min-width:0;white-space:nowrap}
.nio-flat-title{grid-column:1 / 3;grid-row:2;align-self:center;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;padding-right:20px}
/* ⋯菜单固定于会话名称行（第二行）最右列：始终占位（覆盖原生 display:none），
   默认隐藏（opacity/visibility，不改变 grid 布局），hover 会话横幅时显示。
   仅影响第二行——第一行时间不再被原生 hover 规则隐藏。 */
.nio-flat-actions{grid-column:3;grid-row:2;align-self:center;justify-self:end;display:inline-flex !important;opacity:0;visibility:hidden;pointer-events:none;transition:opacity .12s ease}
.nio-flat-row:hover .nio-flat-actions{opacity:1;visibility:visible;pointer-events:auto}
.nio-flat-row:hover .nio-flat-time{display:inline-flex !important}
.nio-fprev{grid-column:1 / 4;grid-row:3;align-self:start;min-width:0;font-size:11px;line-height:16px;color:var(--dsw-alias-label-tertiary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;cursor:default}
/* 有原生状态图标（运行/等待/完成提醒）：图标占第一列，chip/标题后移一列 */
.nio-flat-has-status .nio-flat-slot{grid-column:1;grid-row:1}
.nio-flat-has-status .nio-flat-chip{grid-column:2}
.nio-flat-has-status .nio-flat-title{grid-column:2}
.nio-flat-has-status .nio-flat-time{grid-column:3}
.nio-flat-has-status .nio-flat-actions{grid-column:3}
.nio-flat-has-status .nio-fprev{grid-column:2 / 4}
/* 有待办圆点（空闲会话被标记）：圆点占第一列，其余后移（与原生图标相同布局） */
.nio-flat-has-dot .nio-sdone{grid-column:1;grid-row:1;align-self:center;justify-self:center}
.nio-flat-has-dot .nio-flat-chip{grid-column:2}
.nio-flat-has-dot .nio-flat-title{grid-column:2}
.nio-flat-has-dot .nio-flat-time{grid-column:3}
.nio-flat-has-dot .nio-flat-actions{grid-column:3}
.nio-flat-has-dot .nio-fprev{grid-column:2 / 4}
/* 设置面板「界面功能」页 */
.nio-settings{display:flex;flex-direction:column;max-width:640px}
/* 顶部「配置状态」固定横幅：始终渲染（高度恒定），dirty 只切换颜色与按钮 */
.nio-settings-banner{box-sizing:border-box;flex:none;display:flex;align-items:center;justify-content:space-between;gap:16px;min-height:64px;margin:12px 0 4px;padding:8px 12px;border:1px solid var(--dsw-alias-border-l2);border-radius:10px;background:color-mix(in srgb,var(--dsw-alias-bg-base) 92%,transparent);transition:border-color .2s ease,background-color .2s ease}
/* 左侧：上下两行（标题 + 提示内容） */
.nio-settings-banner-main{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}
.nio-settings-banner-title{color:var(--dsw-alias-label-tertiary);font-size:12px;font-weight:600;line-height:18px}
.nio-settings-banner-text{color:var(--dsw-alias-label-secondary);font-size:13px;line-height:20px}
/* 右侧：预留盒子（dirty 时显示按钮），纵向居中 */
.nio-settings-banner-side{flex:none;display:flex;align-items:center;min-width:96px;justify-content:flex-end}
/* 有待重启修改：强调色提示 + 按钮（浅色底） */
.nio-settings-banner-warn{border-color:color-mix(in srgb,var(--dsw-alias-state-business-primary) 40%,transparent);background:color-mix(in srgb,var(--dsw-alias-state-business-primary) 5%,transparent)}
.nio-settings-banner-warn .nio-settings-banner-title{color:var(--dsw-alias-state-business-primary)}
.nio-settings-banner-warn .nio-settings-banner-text{color:var(--dsw-alias-label-primary);font-weight:500}
.nio-settings-banner-btn{box-sizing:border-box;flex:none;height:30px;padding:0 14px;border:none;border-radius:8px;background:var(--dsw-alias-state-business-primary);color:#fff;font-size:13px;line-height:30px;font-family:inherit;cursor:pointer;white-space:nowrap}
.nio-settings-banner-btn:hover{opacity:.9}
.nio-settings-group{display:flex;flex-direction:column}
.nio-settings-row{box-sizing:border-box;border-bottom:1px solid var(--dsw-alias-border-l2);align-items:center;gap:16px;padding:16px 0;display:flex}
.nio-settings-group > .nio-settings-row{border-bottom:none}
.nio-settings-sub{box-sizing:border-box;align-items:center;gap:16px;padding:4px 0 16px 28px;display:flex}
.nio-settings-sub .nio-settings-title{font-weight:400;color:var(--dsw-alias-label-secondary)}
.nio-settings-sub::before{content:"";flex:none;width:2px;align-self:stretch;background:var(--dsw-alias-border-l2);border-radius:1px;margin-right:12px}
.nio-settings-text{flex:1;min-width:0}
.nio-settings-title{color:var(--dsw-alias-label-primary);font-size:14px;font-weight:500;line-height:22px}
.nio-settings-desc{color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:18px;margin-top:2px}
.nio-settings-toggle{position:relative;cursor:pointer;width:36px;height:20px;flex:none}
.nio-settings-toggle input{position:absolute;opacity:0;width:100%;height:100%;margin:0;cursor:pointer}
.nio-settings-toggle-track{box-sizing:border-box;display:block;width:36px;height:20px;border-radius:999px;background:var(--dsw-alias-border-l3);transition:background .15s ease;position:relative}
.nio-settings-toggle-track:after{content:"";position:absolute;top:2px;left:2px;width:16px;height:16px;border-radius:50%;background:var(--dsw-alias-label-primary-inverted);transition:transform .15s ease}
.nio-settings-toggle input:checked + .nio-settings-toggle-track{background:var(--dsw-alias-state-business-primary)}
.nio-settings-toggle input:checked + .nio-settings-toggle-track:after{transform:translateX(16px)}
.nio-settings-select{box-sizing:border-box;flex:none;min-width:200px;max-width:260px;height:32px;color:var(--dsw-alias-label-primary);background:var(--dsw-alias-bg-base);border:1px solid var(--dsw-alias-border-l2);border-radius:8px;padding:0 10px;font-size:13px;line-height:20px;font-family:inherit;cursor:pointer}
.nio-settings-select:focus{outline:none;border-color:var(--dsw-alias-state-business-primary)}
.nio-settings-select:disabled{opacity:.5;cursor:default}
.nio-settings-note{color:var(--dsw-alias-label-tertiary);font-size:13px;line-height:20px;padding:16px 0}
.nio-settings-error{color:var(--dsw-alias-state-error-primary);font-size:13px;line-height:20px;padding:16px 0}
/* 左下角重启按钮：absolute 定位在设置行右侧（定位上下文 = settingsArea） */
[class*="settingsArea"].nio-rst-area{position:relative}
/* 默认：灰色半透明；hover：变为红色（硬性重启警示色） */
.nio-rst{position:absolute;right:8px;top:50%;transform:translateY(-50%);width:28px;height:28px;color:color-mix(in srgb,var(--dsw-alias-label-secondary) 55%,transparent);background:transparent;border:none;border-radius:50%;padding:0;display:inline-flex;align-items:center;justify-content:center;cursor:pointer;transition:color .15s ease,background .15s ease}
.nio-rst:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-state-error-primary)}
.nio-rst svg{display:block;width:15px;height:15px}
.nio-rst-tip{position:absolute;bottom:calc(100% + 8px);left:50%;transform:translateX(-50%);white-space:nowrap;background:var(--dsw-alias-tooltip-bg);color:#f2f2f2;border:1px solid rgba(255,255,255,0.12);border-radius:6px;padding:4px 8px;font-size:11px;line-height:15px;pointer-events:none;opacity:0;transition:opacity .12s ease;z-index:2147483001;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif}
.nio-rst:hover .nio-rst-tip{opacity:1}
/* 重启二次确认框 */
.nio-confirm{position:fixed;inset:0;z-index:2147483003;display:flex;align-items:center;justify-content:center;background:var(--dsw-alias-bg-mask-1);backdrop-filter:blur(2px)}
.nio-confirm-dialog{box-sizing:border-box;width:min(420px,calc(100vw - 48px));background:var(--dsw-alias-bg-overlay);border:1px solid var(--dsw-alias-border-l2);border-radius:16px;box-shadow:var(--dsw-shadow-lv3,0 10px 32px rgba(0,0,0,.35));padding:20px;display:flex;flex-direction:column;gap:10px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif}
.nio-confirm-title{color:var(--dsw-alias-label-primary);font-size:16px;font-weight:600;line-height:24px}
.nio-confirm-desc{color:var(--dsw-alias-label-secondary);font-size:13px;line-height:20px}
.nio-confirm-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:6px}
.nio-confirm-btn{box-sizing:border-box;height:32px;padding:0 16px;border:1px solid var(--dsw-alias-border-l2);border-radius:8px;background:transparent;color:var(--dsw-alias-label-primary);font-size:13px;line-height:30px;font-family:inherit;cursor:pointer}
.nio-confirm-btn:hover{background:var(--dsw-alias-interactive-bg-hover)}
.nio-confirm-danger{background:var(--dsw-alias-state-error-primary);border-color:transparent;color:#fff}
.nio-confirm-danger:hover{background:var(--dsw-alias-state-error-primary);opacity:.9}
.nio-confirm-primary{background:var(--dsw-alias-state-business-primary);border-color:transparent;color:#fff}
.nio-confirm-primary:hover{background:var(--dsw-alias-state-business-primary);opacity:.9}
/* 重启等待层 */
.nio-reboot{position:fixed;inset:0;z-index:2147483003;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;background:var(--dsw-alias-bg-mask-1);backdrop-filter:blur(2px);font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif}
.nio-reboot-spinner{width:26px;height:26px;border:2px solid var(--dsw-alias-border-l2);border-top-color:var(--dsw-alias-state-business-primary);border-radius:50%;animation:nio-reboot-spin .8s linear infinite}
@keyframes nio-reboot-spin{to{transform:rotate(360deg)}}
.nio-reboot-text{color:var(--dsw-alias-label-primary);font-size:14px;line-height:22px}
`
