# dsh-niao-quick-open

[English](README.md) | [中文](README.zh.md)

Session-header quick actions for DeepSeek Harness.

### Session header

The top-left of the session area becomes two rows:

- **Row 1** — the current workspace folder name (small highlighted label) plus three icon buttons, with tooltips shown below each icon:
  - 📋 **Copy absolute path**
  - 📁 **Reveal in file manager** (Finder on macOS / Explorer on Windows / file manager on Linux)
  - `</>` **Open in default editor**
- **Row 2** — the current session name, enlarged.

### Restart button (bottom-left)

A **restart** icon sits to the right of the Settings button in the bottom-left corner (grey semi-transparent by default, turns red on hover), with the tooltip "硬性重启" (hard restart). Clicking it asks for confirmation; once confirmed:

- The host spawns a detached replacement process with the exact same command that started this one (waiting for the old process to exit and the port to free), then exits the current process completely;
- The page shows a "正在重启 DeepSeek Harness…" overlay, probes the service every 700 ms and **auto-reloads once it is back**; if it does not come back within 30 s, it prompts you to refresh manually.

### Settings: UI Features

A new **UI Features** page is registered in the DSH Settings panel:

- **Workspace quick buttons** — toggle whether the session-header row is shown (enabled by default), with its children:
  - **Default editor** — a dropdown choosing the editor used by **Open in default editor**; applied instantly (no Save button).
  - **Workspace menu quick actions** — toggle a row of quick buttons (copy path / reveal in file manager / open in default editor) inside each workspace's **⋯** menu (disabled by default).
- **Restart button** — toggle whether the bottom-left hard-restart button is shown (enabled by default).

After changing a config that needs a restart to take effect, a "重启以生效" (restart to apply) banner appears at the top of the page; clicking it confirms and hard-restarts the service.

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

1. Open any workspace session: the session header's first row shows the workspace folder name and three icon buttons:
   - Click 📋 to copy the workspace absolute path.
   - Click 📁 to reveal the folder in the file manager.
   - Click `</>` to open the folder in your default editor.
2. The second row shows the current session name, enlarged.
3. In DSH Settings → **UI Features**, toggle **Workspace quick buttons** and choose the **Default editor**.
4. Use the **restart** icon next to the bottom-left Settings button to hard-restart the DeepSeek Harness service (confirmation required; the page reloads automatically afterwards).

## Development

```sh
npm install
npm run build   # build the browser bundle into lib/client.js
npm run check   # syntax-check host + build script
```

## License

MIT
