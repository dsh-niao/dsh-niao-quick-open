/**
 * dsh-niao-quick-open — 浏览器端：设置面板「界面功能」。
 *
 * 在 DSH 设置面板左侧边注册「界面功能」设置页（settings.section）：
 *  - 顶部「温馨提示」固定横幅（始终渲染，dirty 时显示「重启以生效」按钮）；
 *  - 「工作区快捷按钮」开关 + 子项「常用编辑器」选择 + 子项「工作区行菜单
 *    快捷按钮」开关；
 *  - 「会话待办标记」开关（与「工作区快捷按钮」同级）；
 *  - 「重启按钮」开关（控制左下角重启按钮是否显示）。
 * 配置即时保存（set-config 即时生效），无确认按钮。纯 React（React.createElement）。
 *
 * @module dsh-niao-quick-open/client/settings
 */

import React from 'react'
import { rpc } from './utils.js'
import { configBaseline, setConfigBaseline } from './state.js'
import { applyConfigPatch, configDirty } from './config.js'
import { showRestartConfirm } from './restart.js'

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
    // 「工作区快捷按钮」组：开关 + 其子项「常用编辑器」（缩进）。
    React.createElement('div', { className: 'nio-settings-group' },
      React.createElement('div', { className: 'nio-settings-row' },
        React.createElement('div', { className: 'nio-settings-text' },
          React.createElement('div', { className: 'nio-settings-title' }, '工作区快捷按钮'),
          React.createElement('div', { className: 'nio-settings-desc' }, '在会话区域顶部显示工作区文件夹名与快捷操作按钮（复制路径 / 访达显示 / 编辑器打开）'),
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
      // 子项：常用编辑器（随主开关禁用）
      React.createElement('div', { className: 'nio-settings-sub' },
        React.createElement('div', { className: 'nio-settings-text' },
          React.createElement('div', { className: 'nio-settings-title' }, '常用编辑器'),
          React.createElement('div', { className: 'nio-settings-desc' }, '「常用编辑器中打开」使用的编辑器，选择后立即生效'),
        ),
        React.createElement('select', {
          className: 'nio-settings-select',
          value: state.editor || '',
          disabled: !state.enabled,
          onChange: (e) => save({ editor: e.target.value }),
        },
        React.createElement('option', { value: '', key: '' }, '未设置'),
        editors.map((ed) => React.createElement('option', { value: ed.id, key: ed.id }, ed.name || ed.id)),
        ),
      ),
      // 子项：工作区行菜单快捷按钮（随主开关禁用）
      React.createElement('div', { className: 'nio-settings-sub' },
        React.createElement('div', { className: 'nio-settings-text' },
          React.createElement('div', { className: 'nio-settings-title' }, '工作区行菜单快捷按钮'),
          React.createElement('div', { className: 'nio-settings-desc' }, '在工作区「⋯」菜单中展示一行快捷按钮（复制路径 / 访达显示 / 编辑器打开）'),
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
    // 「会话待办标记」组（与「工作区快捷按钮」同级）：空闲会话前的标记圆点开关。
    React.createElement('div', { className: 'nio-settings-group' },
      React.createElement('div', { className: 'nio-settings-row' },
        React.createElement('div', { className: 'nio-settings-text' },
          React.createElement('div', { className: 'nio-settings-title' }, '会话待办标记'),
          React.createElement('div', { className: 'nio-settings-desc' }, '在空闲会话前显示可点击的标记圆点，将其标记为已完成'),
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
    // 「重启按钮」组（与「工作区快捷按钮」同级）：开关控制左下角按钮是否显示。
    React.createElement('div', { className: 'nio-settings-group' },
      React.createElement('div', { className: 'nio-settings-row' },
        React.createElement('div', { className: 'nio-settings-text' },
          React.createElement('div', { className: 'nio-settings-title' }, '重启按钮'),
          React.createElement('div', { className: 'nio-settings-desc' }, '在界面左下角设置按钮右侧显示「硬性重启」按钮'),
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
