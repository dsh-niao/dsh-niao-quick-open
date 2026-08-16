/**
 * dsh-niao-quick-open — DeepSeek Harness profile bundle.
 *
 * Host half: exposes the workspace-action RPC surface used by the browser
 * half (file-manager open, editor open, editor discovery). The browser half
 * registers the session-header buttons in `conversation.session.header.utilities`.
 *
 * @module dsh-niao-quick-open
 */

export const name = 'dsh-niao-quick-open'

export const inject = ['fs', 'shell', 'subprocess']

/** Plugin entry: mount the Host RPC surface. */
export function apply(ctx) {
  // Host half implementation lands here in a later stage; the skeleton
  // ships the loader-compatible package structure and bundle patch first.
}
