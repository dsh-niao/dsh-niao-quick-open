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
/* 内层圆点：与原生规则一致（position:relative + :before/:after 双层圆），仅颜色不同。
   默认常显（opacity:.6 浅灰）：空闲会话的待办圆点无需 hover 即显示；
   hover 会话卡片/圆点时加深到 .8；已标记为绿色常显。 */
.nio-sdone-dot{position:relative;display:inline-block;flex:none;width:10px;height:10px;box-sizing:border-box;opacity:.6 !important;transition:opacity .12s ease,color .15s ease !important}
.nio-sdone-dot:before{content:"";position:absolute;top:0;right:0;bottom:0;left:0;border-radius:50%;background:currentColor;opacity:.1}
.nio-sdone-dot:after{content:"";position:absolute;top:20%;right:20%;bottom:20%;left:20%;border-radius:50%;background:currentColor}
[class*="sessionRow"]:hover .nio-sdone .nio-sdone-dot{opacity:.8 !important}
.nio-sdone:hover .nio-sdone-dot{opacity:.8 !important}
.nio-sdone-marked .nio-sdone-dot{opacity:1 !important;color:var(--dsw-alias-state-success-primary) !important}
/* 卡片选中（激活）时：圆点颜色与工作区名称一致（品牌亮色）。
   圆点 color 不再内联覆盖（改用 currentColor 继承）——父级 .nio-sdone
   的 color 在选中态变为品牌色，内层圆点自动跟随。 */
[class*="flatList"][data-nio-flat-style] [class*="sessionRow"][aria-selected="true"] [data-nio-fchip],
[class*="flatList"][data-nio-flat-style] [class*="sessionRow"][aria-selected="true"] .nio-sdone{color:var(--dsw-alias-state-business-primary)}
.nio-sdone-vh{clip:rect(0 0 0 0);white-space:nowrap;width:1px;height:1px;position:absolute;overflow:hidden}
/* 待办圆点悬浮提示：显示在圆点下方、左对齐（bottom-left） */
.nio-sdone-tip{position:absolute;top:calc(100% + 6px);left:0;white-space:nowrap;background:var(--dsw-alias-tooltip-bg);color:#f2f2f2;border:1px solid rgba(255,255,255,0.12);border-radius:6px;padding:4px 8px;font-size:11px;line-height:15px;pointer-events:none;opacity:0;transition:opacity .12s ease;z-index:2147483001;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif}
.nio-sdone:hover .nio-sdone-tip{opacity:1}
/* 单列表 hover 悬浮卡片兜底隐藏（只加类不删节点，React 卸载不受影响） */
.nio-hide-card{display:none !important;visibility:hidden !important;pointer-events:none !important}
/* 双击重命名：菜单在绘制前被隐藏（配合 MutationObserver 同步处理，杜绝闪现） */
.nio-hide-menu{display:none !important}
/* 工作区栏头部增强：分组切换图标（与原生 headerActions 图标同风格） */
.nio-hvswitch{position:relative;cursor:pointer;width:28px;height:28px;color:var(--dsw-alias-label-secondary);background:transparent;border:none;border-radius:50%;padding:0;display:inline-flex;align-items:center;justify-content:center}
.nio-hvswitch:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}
.nio-hvswitch svg{display:block;width:16px;height:16px}
.nio-hvswitch-tip{position:absolute;top:calc(100% + 6px);left:50%;transform:translateX(-50%);white-space:nowrap;background:var(--dsw-alias-tooltip-bg);color:#f2f2f2;border:1px solid rgba(255,255,255,0.12);border-radius:6px;padding:4px 8px;font-size:11px;line-height:15px;pointer-events:none;opacity:0;transition:opacity .12s ease;z-index:2147483001;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif}
.nio-hvswitch:hover .nio-hvswitch-tip{opacity:1}
/* 单列表（flat）会话行：三行结构。
   全部规则以 [class*="flatList"][data-nio-flat-style] 为前缀：容器仅在
   「单列表增强样式」开关开启时带 data-nio-flat-style 标记，关闭后所有
   规则失效、恢复系统原生单列表布局。
   ┌─ 第一行：状态图标(原生 slot / 待办圆点) + 工作区名 ──┬ 时间 ─┐
   ├─ 第二行：会话标题 ───────────────────┬ ⋯菜单 ─┤
   └─ 第三行：最后一条用户消息预览（全宽） ─┘
   原生元素（slot/title/time/rowActions）由 React 渲染管理，物理移动会
   导致 React 协调崩溃（列表卸载），必须保留为会话行直接子元素、以 grid
   定位；我们注入的元素（圆点/工作区名/预览）放在行容器
   nio-flat-line1 / nio-flat-line3 中。 */
/* 卡片间 margin-top 的真正来源：原生 .qDHVXG_flatList>*+* 给相邻兄弟
   （HoverCard root span，会话行的外层包裹）加 margin-top:2px —— 加在
   sessionRow 上的 margin-top:0 无效（margin 在外层 span 上）。这里在
   容器级覆盖相邻兄弟的 margin。 */
[class*="flatList"][data-nio-flat-style] > * + *{margin-top:0 !important}
[class*="flatList"][data-nio-flat-style] [class*="sessionRow"]{height:auto !important;box-sizing:border-box;display:grid !important;grid-template-columns:minmax(28px,auto) minmax(0,1fr) auto;grid-template-rows:auto auto auto;column-gap:6px;row-gap:1px;align-items:center;align-content:start;padding:7px 8px !important;margin-top:0 !important;border-radius:0 !important;border-bottom:1px solid var(--dsw-alias-border-l2);cursor:pointer}
/* —— 第一行（grid row 1） —— */
/* 原生状态图标（React 管理，第一行第一列；空闲时无此元素）。
   靠左（justify-self:start）而非居中：列1保底 28px，居中会把图标推到
   9~19px、显得偏右；靠左后图标落在 3~13px，与空闲行待办圆点（absolute
   left:0 内 10px 居中 = 3~13px）水平对齐，视觉一致。 */
[class*="flatList"][data-nio-flat-style] [class*="sessionRow"] > [class*="slot"]{grid-column:1;grid-row:1;align-self:center;justify-self:start;min-width:0}
/* 第一行左侧组（我们的容器：待办圆点 + 工作区名称）。
   待办圆点绝对定位在容器最左（position:relative + padding-left），从
   flex 流中移除——无论标题多长、grid 如何压缩，圆点都不会被挤没；
   工作区名称由 min-width:max-content 保证完整（fchip 自身 max-width:180
   截断省略）。有原生状态图标时图标占列1（16px）、本容器跨列1-2，
   padding-left:22px 为图标留位，内容从图标右侧开始。 */
[class*="flatList"][data-nio-flat-style] [class*="sessionRow"] > [data-nio-flat-line1]{grid-column:1;grid-row:1;align-self:center;justify-self:start;position:relative;box-sizing:border-box;display:flex;align-items:center;min-width:max-content;padding-left:22px}
/* 有原生状态图标：line1 跨列 1-3。
   padding-left 必须 ≥ 图标右缘（列1=28px，slot 靠左 → 图标 3~13px，
   右缘 13px）+ 间距 → 22px。 */
[class*="flatList"][data-nio-flat-style] [class*="sessionRow"]:has(> [class*="slot"] > *) > [data-nio-flat-line1]{grid-column:1 / 3;padding-left:22px}
/* 待办圆点（绝对定位在左侧组最左，不占 flex 流、永不被压缩） */
[class*="flatList"][data-nio-flat-style] [data-nio-flat-line1] .nio-sdone{position:absolute;left:0;top:50%;transform:translateY(-50%)}
/* 工作区名称（第一行左侧组内；加粗；非选中正常色，选中亮色）。
   flex-shrink:0：在左侧组 flex 内不收缩，超长由 max-width:180 截断省略 */
[class*="flatList"][data-nio-flat-style] [data-nio-flat-line1] [data-nio-fchip]{box-sizing:border-box;flex:none;min-width:0;max-width:180px;font-size:12px;line-height:16px;font-weight:600;color:var(--dsw-alias-label-secondary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
[class*="flatList"][data-nio-flat-style] [class*="sessionRow"][aria-selected="true"] [data-nio-fchip]{color:var(--dsw-alias-state-business-primary)}
/* 原生时间（React 管理，第一行最右） */
[class*="flatList"][data-nio-flat-style] [class*="sessionRow"] > [class*="time"]{grid-column:3;grid-row:1;align-self:center;justify-self:end;min-width:0;white-space:nowrap}
/* —— 第二行（grid row 2） —— */
/* 原生会话标题（React 管理，全宽；覆盖原生 margin:0 6px 0 4px） */
[class*="flatList"][data-nio-flat-style] [class*="sessionRow"] > [class*="title"]{grid-column:1 / 3;grid-row:2;align-self:center;min-width:0;margin:0 !important;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;padding-right:20px}
/* 原生 ⋯菜单（React 管理，第二行最右；固定占位，默认隐藏，hover 会话横幅时显示） */
[class*="flatList"][data-nio-flat-style] [class*="sessionRow"] > [class*="rowActions"]{grid-column:3;grid-row:2;align-self:center;justify-self:end;display:inline-flex !important;opacity:0;visibility:hidden;pointer-events:none;transition:opacity .12s ease}
[class*="flatList"][data-nio-flat-style] [class*="sessionRow"]:hover > [class*="rowActions"]{opacity:1;visibility:visible;pointer-events:auto}
[class*="flatList"][data-nio-flat-style] [class*="sessionRow"]:hover > [class*="time"]{display:inline-flex !important}
/* 菜单打开（menuOpen 类，点击三个点后）时：即使鼠标移开行，三个点与
   时间也保持显示 —— 覆盖无条件的 opacity:0 隐藏（rowActions）与原生
   menuOpen 隐藏时间（sessionRow.menuOpen .time{display:none}）。 */
[class*="flatList"][data-nio-flat-style] [class*="sessionRow"][class*="menuOpen"] > [class*="rowActions"]{opacity:1;visibility:visible;pointer-events:auto}
[class*="flatList"][data-nio-flat-style] [class*="sessionRow"][class*="menuOpen"] > [class*="time"]{display:inline-flex !important}
/* —— 第三行（grid row 3） —— */
/* 第三行容器（我们的：最后用户消息预览，全宽） */
[class*="flatList"][data-nio-flat-style] [class*="sessionRow"] > [data-nio-flat-line3]{grid-column:1 / 4;grid-row:3;align-self:start;min-width:0}
/* 预览文本：盒子高度与行高固定 1.2em（内容变化不改变行高，避免抖动）。
   cursor 继承行的 pointer（不在预览上设 default，保证整卡小手） */
[class*="flatList"][data-nio-flat-style] [data-nio-flat-line3] [data-nio-fprev]{display:block;min-width:0;height:1.2em;box-sizing:border-box;font-size:11px;line-height:1.2em;color:var(--dsw-alias-label-tertiary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
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
