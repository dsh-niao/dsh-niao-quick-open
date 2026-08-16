# dsh-niao-quick-open

[English](README.md) | [中文](README.zh.md)

One-click workspace actions in the DeepSeek Harness session header.

When you are inside a conversation, the header row (next to the Session log download button) gains three icon buttons that operate on the **current session's workspace directory**:

| Icon | Tooltip | Action |
| --- | --- | --- |
| ⚙️ | Configure default editor | Opens a settings menu with an editor dropdown — changes apply only after you click **Save**; clicking outside or **Cancel** discards them |
| `</>` | Open in editor | Opens the workspace folder in your configured default editor |
| 📂 | Open in file manager | Reveals the workspace folder in the file manager (Finder on macOS / Explorer on Windows / file manager on Linux) |
| 📋 | Copy folder name | Copies the workspace folder name to the clipboard (shows **Copied** for 1s) |

The buttons only appear while a session is open (they live in the `conversation.session.header.utilities` slot).

## Features

- **Auto editor discovery** — detects installed editors (Visual Studio Code, Cursor, Trae, Windsurf, Zed, Sublime Text, HBuilderX, JetBrains family, Vim/Neovim CLI, …) on macOS / Windows / Linux.
- **Platform-aware file manager label** — the tooltip adapts to the running OS.
- **Draft-and-save settings** — selecting an editor in the menu is a draft; it takes effect only on Save.
- **Copy feedback** — the copy button tooltip switches to "Copied" for one second.
- **No workspace? Buttons disabled** — sessions without a workspace directory get greyed-out editor/file-manager buttons.

## Install

```sh
dsh plugin --profile web add dsh-niao-quick-open
```

Or add it to your profile `package.json` `dependencies` and `dsh.profile.bundles`, then restart `dsh web`.

## Usage

1. Open any conversation (its session must belong to a workspace).
2. In the header row, find the three icon buttons left of the Session log download button.
3. First time: click ⚙️, pick your default editor in the dropdown, click **Save**.
4. Then click `</>` to open the workspace in that editor, 📂 to reveal it in the file manager, or 📋 to copy the folder name.

## Development

```sh
npm install
npm run build   # build host + client bundles
npm test        # run tests (when added)
```

## License

MIT
