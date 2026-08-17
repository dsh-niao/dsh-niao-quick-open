# dsh-niao-quick-open

[English](README.md) | [中文](README.zh.md)

Session-header quick actions for DeepSeek Harness.

### Session header

The top-left of the session area becomes two rows:

- **Row 1** — the current workspace folder name (small highlighted label) plus four icon buttons, with tooltips shown below each icon:
  - 📋 **Copy absolute path**
  - 📁 **Reveal in file manager** (Finder on macOS / Explorer on Windows / file manager on Linux)
  - `</>` **Open in default editor**
  - ⚙️ **Set default editor** — opens a floating card listing the available editors; click one to switch immediately
- **Row 2** — the current session name, enlarged.

### Settings: UI Features

A new **UI Features** page is registered in the DSH Settings panel:

- **Workspace quick buttons** — toggle whether the session-header row is shown (enabled by default).
- **Default editor** — a dropdown choosing the editor used by **Open in default editor**; applied instantly (no Save button).

Config is persisted to `~/.dsh/dsh-niao-quick-open.config.json`. If **Open in default editor** is clicked before a default editor is set, a hint directs you to Settings → UI Features → Workspace quick buttons.

## Editor discovery

Editors are scanned on the host:

- **Known brands** — Visual Studio Code, Cursor, Trae, Windsurf, Zed, Sublime Text, HBuilderX, the JetBrains family, Vim/Neovim CLI, … (brand icon shown).
- **Dynamic scan** — macOS scans `/Applications` + `/System/Applications`, Windows scans the Program Files / LocalAppData program directories, Linux probes common editor CLIs; any app matching editor keywords is offered with a letter icon.

Every listed editor is guaranteed to have a working open command for the workspace folder.

## Install

```sh
dsh plugin --profile web add dsh-niao-quick-open
```

Or add the package to your profile `package.json` `dependencies` and `dsh.profile.bundles`, then restart `dsh web`.

## Usage

1. Open any workspace session: the session header's first row shows the workspace folder name and four icon buttons:
   - Click 📋 to copy the workspace absolute path.
   - Click 📁 to reveal the folder in the file manager.
   - Click `</>` to open the folder in your default editor.
   - Click ⚙️ to choose the default editor in a floating card — click one to switch immediately.
2. The second row shows the current session name, enlarged.
3. In DSH Settings → **UI Features**, toggle **Workspace quick buttons** and choose the **Default editor**.

## Development

```sh
npm install
npm run build   # build the browser bundle into lib/client.js
npm run check   # syntax-check host + build script
```

## License

MIT
