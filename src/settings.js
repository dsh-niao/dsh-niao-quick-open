/**
 * dsh-niao-quick-open — 浏览器端：设置面板「界面功能」。
 *
 * 在 DSH 设置面板左侧边注册「界面功能」设置页（settings.section）：
 *  - 顶部「温馨提示」固定横幅（始终渲染，dirty 时显示「重启以生效」按钮）；
 *  - 分组标题按功能区域划分：侧边栏（单列表增强样式 / 工作区栏头部增强 /
 *    会话待办标记）→ 会话区域（常用编辑器 / 工作区快捷按钮 + 子项工作区行
 *    菜单快捷按钮 / 用户消息导航条）→ 系统工具（重启按钮）；
 *  - 「常用编辑器」为独立配置项（不再随「工作区快捷按钮」禁用——编辑器被
 *    会话顶部按钮与工作区菜单按钮共用）；
 *  - 每个配置项默认只显示一句话概要，右侧「详情」展开按钮点击后显示
 *    分段详细说明，再点收起。
 * 配置即时保存（set-config 即时生效），无确认按钮。纯 React（React.createElement）。
 *
 * @module dsh-niao-quick-open/client/settings
 */

import React from 'react'
import { rpc } from './utils.js'
import { configBaseline, setConfigBaseline } from './state.js'
import { applyConfigPatch, configDirty } from './config.js'
import { showRestartConfirm } from './restart.js'

/** 展开/收起图标（12px chevron，旋转动画由 CSS 控制）。 */
function chevronSvg() {
  return React.createElement('svg', {
    width: 12, height: 12, viewBox: '0 0 24 24', fill: 'none',
    stroke: 'currentColor', strokeWidth: 2.4, strokeLinecap: 'round', strokeLinejoin: 'round',
  },
    React.createElement('path', { d: 'm6 9 6 6 6-6' }),
  )
}

/**
 * 配置项说明：默认一行概要；「详情」按钮展开后显示分段详细说明。
 * @param {string} summary 一句话概要（始终显示）。
 * @param {Array<string>} details 详细分段说明（展开后显示，每段一个 <p>）。
 */
function DescExpandable({ summary, details }) {
  const [open, setOpen] = React.useState(false)
  const hasDetails = Array.isArray(details) && details.length > 0
  return React.createElement('div', null,
    React.createElement('div', { className: 'nio-settings-desc-line' },
      React.createElement('span', { className: 'nio-settings-desc-summary' }, summary),
      hasDetails && React.createElement('button', {
        type: 'button',
        className: 'nio-settings-desc-more',
        'aria-expanded': open,
        'aria-label': open ? '收起详情' : '展开详情',
        onClick: () => setOpen(!open),
      }, chevronSvg()),
    ),
    open && hasDetails && React.createElement('div', { className: 'nio-settings-desc-detail' },
      details.map((d, i) => React.createElement('p', { key: i }, d)),
    ),
  )
}

/** 配置面板：即时保存，无确认按钮。 */
export function ConfigPanel() {
  const [state, setState] = React.useState(null)
  const [editors, setEditors] = React.useState([])
  const [loadError, setLoadError] = React.useState('')
  // 需要重启才能生效的配置修改存在与否；由模块级基线 + 当前配置实时判定，
  // 初始值立即计算（关闭设置再打开时基线/配置仍在内存，横幅保持展示）。
  const [dirty, setDirty] = React.useState(configDirty())

  React.useEffect(() => {
    let alive = true
    Promise.all([rpc('get-config'), rpc('list-editors')]).then(([configRes, editorsRes]) => {
      if (!alive) return
      if (configRes.ok && configRes.value && configRes.value.config) {
        // 首次取得宿主端配置时（apply 的 refreshConfig 尚未完成的兜底）记录基线。
        if (configBaseline === null) setConfigBaseline({ ...configRes.value.config })
        setState(configRes.value.config)
        applyConfigPatch(configRes.value.config)
        setDirty(configDirty())
      } else {
        setLoadError(configRes.error || '配置读取失败')
      }
      if (editorsRes.ok && Array.isArray(editorsRes.value)) setEditors(editorsRes.value)
    })
    return () => { alive = false }
  }, [])

  const save = (patch) => {
    rpc('set-config', { config: patch }).then((res) => {
      if (res.ok && res.value && res.value.config) {
        setState(res.value.config)
        applyConfigPatch(res.value.config)
        // 保存后重新判定：改动 → 出现横幅；改回基线 → 横幅消失。
        setDirty(configDirty())
      }
    })
  }

  if (loadError) {
    return React.createElement('div', { className: 'nio-settings-error' }, loadError)
  }
  if (!state) {
    return React.createElement('div', { className: 'nio-settings-note' }, '加载中…')
  }

  return React.createElement('div', { className: 'nio-settings' },
    // 顶部固定横幅（高度恒定，不随 dirty 变化而伸缩）：
    // 左右两侧 flex 纵向居中：左侧两行（标题「温馨提示」+ 提示内容），
    // 右侧预留盒子（dirty 时显示「重启以生效」按钮）。
    React.createElement('div', {
      className: 'nio-settings-banner' + (dirty ? ' nio-settings-banner-warn' : ''),
      'aria-live': 'polite',
    },
      React.createElement('div', { className: 'nio-settings-banner-main' },
        React.createElement('div', { className: 'nio-settings-banner-title' }, '温馨提示'),
        React.createElement('div', { className: 'nio-settings-banner-text' },
          dirty ? '有配置修改需要重启才能生效' : '部分配置修改后，需重启服务才能生效',
        ),
      ),
      React.createElement('div', { className: 'nio-settings-banner-side' },
        dirty && React.createElement('button', {
          type: 'button',
          className: 'nio-settings-banner-btn',
          onClick: () => showRestartConfirm({
            title: '重启以生效',
            desc: '即将硬性重启 DeepSeek Harness 服务，以使本次修改生效。所有正在运行的会话会暂时中断，服务关闭后以相同方式重新启动，页面会自动恢复。',
            okText: '重启',
          }),
        }, '重启以生效'),
      ),
    ),

    // ▍侧边栏
    React.createElement('div', { className: 'nio-settings-section' }, '侧边栏'),
    // 单列表增强样式
    React.createElement('div', { className: 'nio-settings-group' },
      React.createElement('div', { className: 'nio-settings-row' },
        React.createElement('div', { className: 'nio-settings-text' },
          React.createElement('div', { className: 'nio-settings-title' }, '单列表增强样式'),
          React.createElement(DescExpandable, {
            summary: '单列表视图的三行会话卡片样式',
            details: [
              '开启后，分组方式 → 单列表 中的会话列表使用三行布局：工作区名称、最后一条对话预览、状态图标对齐。',
              '关闭则使用系统原生单列表样式。',
            ],
          }),
        ),
        React.createElement('label', { className: 'nio-settings-toggle' },
          React.createElement('input', {
            type: 'checkbox',
            checked: !!state.flatListStyle,
            onChange: (e) => save({ flatListStyle: e.target.checked }),
          }),
          React.createElement('span', { className: 'nio-settings-toggle-track' }, null),
        ),
      ),
    ),
    // 工作区栏头部增强
    React.createElement('div', { className: 'nio-settings-group' },
      React.createElement('div', { className: 'nio-settings-row' },
        React.createElement('div', { className: 'nio-settings-text' },
          React.createElement('div', { className: 'nio-settings-title' }, '工作区栏头部增强'),
          React.createElement(DescExpandable, {
            summary: '会话列表头部增加「切换分组方式」图标',
            details: [
              '在工作区/会话列表头部（搜索、分组方式、排序方式所在行）额外添加一个快捷图标，点击即可在工作区 ⇄ 单列表间切换，并带悬浮提示。',
              '原有图标保持不变；关闭则恢复原样。',
            ],
          }),
        ),
        React.createElement('label', { className: 'nio-settings-toggle' },
          React.createElement('input', {
            type: 'checkbox',
            checked: !!state.headerViewSwitches,
            onChange: (e) => save({ headerViewSwitches: e.target.checked }),
          }),
          React.createElement('span', { className: 'nio-settings-toggle-track' }, null),
        ),
      ),
    ),
    // 会话待办标记
    React.createElement('div', { className: 'nio-settings-group' },
      React.createElement('div', { className: 'nio-settings-row' },
        React.createElement('div', { className: 'nio-settings-text' },
          React.createElement('div', { className: 'nio-settings-title' }, '会话待办标记'),
          React.createElement(DescExpandable, {
            summary: '空闲会话前显示可点击的待办圆点',
            details: [
              '开启后，空闲会话前出现一个圆点，点击即可标记为已完成（绿色）；再次点击取消。',
              '切换会话时自动取消待办标记。',
            ],
          }),
        ),
        React.createElement('label', { className: 'nio-settings-toggle' },
          React.createElement('input', {
            type: 'checkbox',
            checked: !!state.sessionDoneMark,
            onChange: (e) => save({ sessionDoneMark: e.target.checked }),
          }),
          React.createElement('span', { className: 'nio-settings-toggle-track' }, null),
        ),
      ),
    ),

    // ▍会话区域
    React.createElement('div', { className: 'nio-settings-section' }, '会话区域'),
    // 常用编辑器（独立项，不再随「工作区快捷按钮」禁用）
    React.createElement('div', { className: 'nio-settings-group' },
      React.createElement('div', { className: 'nio-settings-row' },
        React.createElement('div', { className: 'nio-settings-text' },
          React.createElement('div', { className: 'nio-settings-title' }, '常用编辑器'),
          React.createElement(DescExpandable, {
            summary: '「常用编辑器中打开」使用的编辑器',
            details: [
              '选择后立即生效（无需保存）。',
              '该编辑器被「工作区快捷按钮」与「工作区行菜单快捷按钮」两处「编辑器打开」共用。',
              '未设置时点击「编辑器打开」会提示前往设置。',
            ],
          }),
        ),
        React.createElement('select', {
          className: 'nio-settings-select',
          value: state.editor || '',
          onChange: (e) => save({ editor: e.target.value }),
        },
        React.createElement('option', { value: '', key: '' }, '未设置'),
        editors.map((ed) => React.createElement('option', { value: ed.id, key: ed.id }, ed.name || ed.id)),
        ),
      ),
    ),
    // 工作区快捷按钮（含子项：工作区行菜单快捷按钮）
    React.createElement('div', { className: 'nio-settings-group' },
      React.createElement('div', { className: 'nio-settings-row' },
        React.createElement('div', { className: 'nio-settings-text' },
          React.createElement('div', { className: 'nio-settings-title' }, '工作区快捷按钮'),
          React.createElement(DescExpandable, {
            summary: '会话区域顶部的文件夹名与快捷按钮',
            details: [
              '在会话区域顶部第一行显示工作区文件夹名，以及三个图标按钮：复制绝对路径、在文件管理器中显示、用常用编辑器打开。',
              '关闭后不显示该行（会话名仍正常显示）。',
            ],
          }),
        ),
        React.createElement('label', { className: 'nio-settings-toggle' },
          React.createElement('input', {
            type: 'checkbox',
            checked: !!state.enabled,
            onChange: (e) => save({ enabled: e.target.checked }),
          }),
          React.createElement('span', { className: 'nio-settings-toggle-track' }, null),
        ),
      ),
      // 子项：工作区行菜单快捷按钮（随主开关禁用）
      React.createElement('div', { className: 'nio-settings-sub' },
        React.createElement('div', { className: 'nio-settings-text' },
          React.createElement('div', { className: 'nio-settings-title' }, '工作区行菜单快捷按钮'),
          React.createElement(DescExpandable, {
            summary: '工作区「⋯」菜单中的一行快捷按钮',
            details: [
              '开启后，每个工作区的「⋯」菜单底部多出一行按钮：复制路径、在文件管理器中显示、用常用编辑器打开。',
              '随「工作区快捷按钮」总开关联动（主开关关闭时不可用）。',
            ],
          }),
        ),
        React.createElement('label', { className: 'nio-settings-toggle' },
          React.createElement('input', {
            type: 'checkbox',
            checked: !!state.menuQuickActions,
            disabled: !state.enabled,
            onChange: (e) => save({ menuQuickActions: e.target.checked }),
          }),
          React.createElement('span', { className: 'nio-settings-toggle-track' }, null),
        ),
      ),
    ),
    // 用户消息导航条
    React.createElement('div', { className: 'nio-settings-group' },
      React.createElement('div', { className: 'nio-settings-row' },
        React.createElement('div', { className: 'nio-settings-text' },
          React.createElement('div', { className: 'nio-settings-title' }, '用户消息导航条'),
          React.createElement(DescExpandable, {
            summary: '会话右侧的用户消息标记条',
            details: [
              '开启后，会话聊天区域右侧显示本会话用户消息导航条：每条用户消息一个圆点，悬停查看提问摘要、点击跳转。',
              '当前阅读位置的圆点高亮为品牌色。',
              '用户消息少于两条或内容未超一屏时不显示。',
            ],
          }),
        ),
        React.createElement('label', { className: 'nio-settings-toggle' },
          React.createElement('input', {
            type: 'checkbox',
            checked: !!state.conversationNav,
            onChange: (e) => save({ conversationNav: e.target.checked }),
          }),
          React.createElement('span', { className: 'nio-settings-toggle-track' }, null),
        ),
      ),
    ),

    // ▍系统工具
    React.createElement('div', { className: 'nio-settings-section' }, '系统工具'),
    // 重启按钮
    React.createElement('div', { className: 'nio-settings-group' },
      React.createElement('div', { className: 'nio-settings-row' },
        React.createElement('div', { className: 'nio-settings-text' },
          React.createElement('div', { className: 'nio-settings-title' }, '重启按钮'),
          React.createElement(DescExpandable, {
            summary: '左下角设置按钮旁的「硬性重启」按钮',
            details: [
              '开启后，界面左下角设置按钮右侧显示重启图标。',
              '点击后弹出二次确认，确认后以相同命令重启 DeepSeek Harness 服务，页面自动恢复。',
            ],
          }),
        ),
        React.createElement('label', { className: 'nio-settings-toggle' },
          React.createElement('input', {
            type: 'checkbox',
            checked: !!state.showRestart,
            onChange: (e) => save({ showRestart: e.target.checked }),
          }),
          React.createElement('span', { className: 'nio-settings-toggle-track' }, null),
        ),
      ),
    ),
  )
}
