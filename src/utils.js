/**
 * dsh-niao-quick-open — 浏览器端基础工具。
 *
 * 与具体 UI 功能无关的通用能力：同源路由调用、剪贴板、平台/语言判断、
 * 文案字典、幂等 DOM 写入。供各功能模块共享。
 *
 * @module dsh-niao-quick-open/client/utils
 */

import { ROUTE } from './constants.js'

/** 同源 JSON POST 到宿主路由；统一返回 { ok, value } 或 { ok:false, error }。 */
export async function rpc(action, payload) {
  try {
    const res = await fetch(ROUTE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, ...payload }),
    })
    const data = await res.json()
    if (data && data.ok) return { ok: true, value: data.value }
    return { ok: false, error: (data && data.error && data.error.message) || `HTTP ${res.status}` }
  } catch (error) {
    return { ok: false, error: String(error && error.message ? error.message : error) }
  }
}

/** 写入剪贴板：优先 Clipboard API，回退 execCommand。 */
export async function copyText(text) {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch { /* 继续尝试回退 */ }
  try {
    const el = document.createElement('textarea')
    el.value = text
    el.setAttribute('readonly', '')
    el.style.position = 'fixed'
    el.style.left = '-9999px'
    document.body.appendChild(el)
    el.select()
    const ok = document.execCommand('copy')
    el.remove()
    return ok
  } catch { return false }
}

const isMac = /Mac|iPhone|iPad|iPod/i.test(navigator.userAgent || '')
const isWin = /Windows|Win32|Win64/i.test(navigator.userAgent || '')

/** 文件管理器按钮文案，随操作系统自适应。 */
export function finderLabel() {
  return isWin ? '在资源管理器中打开' : isMac ? '在访达中打开' : '在文件管理器中打开'
}

/** 根据当前界面语言（由调用方判定 zh/en）选择文案字典。 */
export function pickDict(zh) {
  return zh ? {
    finder: finderLabel(),
    openEditor: '常用编辑器中打开',
    openFailed: '打开失败: ',
    unknown: '未知原因',
    pleaseSet: '请先在设置-界面功能-工作区快捷按钮中进行常用编辑器的配置',
    copyTip: '复制绝对路径',
    copied: '已复制绝对路径',
  } : {
    finder: finderLabel(),
    openEditor: 'Open in Default Editor',
    openFailed: 'Failed to open: ',
    unknown: 'unknown reason',
    pleaseSet: 'Please configure a default editor under Settings → UI Features → Workspace quick buttons first',
    copyTip: 'Copy absolute path',
    copied: 'Absolute path copied',
  }
}

/** 幂等写入 textContent：值相同不写（避免无意义的 DOM 变化触发 MutationObserver）。 */
export function setText(el, text) {
  if (el && el.textContent !== text) el.textContent = text
}

/** 幂等写入属性：值相同不写。 */
export function setAttr(el, name, value) {
  if (el && el.getAttribute(name) !== value) el.setAttribute(name, value)
}
