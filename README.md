# dsh-niao-quick-open

[English](README.md) | [中文](README.zh.md)

Workspace quick actions inside the DeepSeek Harness **workspace row menu**.

Click the **⋯** button on any workspace row in the left sidebar and its menu
(Rename / Delete workspace) gains three extra actions:

- 📁 **Open in file manager** (Finder on macOS / Explorer on Windows / file manager on Linux)
- `</>` **Open in default editor** — opens the folder in your configured default editor
- ⚙️ **Set default editor** — expands an editor picker right inside the menu; click an editor to apply it instantly (no Cancel / Save buttons)

When **Set default editor** expands, a compact list of editors auto-discovered on
this machine is shown (with the currently selected one checked). Clicking a row
saves it immediately and collapses the picker. The first row, **Not set**, clears
the choice. If you use **Open in default editor** before setting one, the picker
opens automatically.

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

1. Click the **⋯** button on a workspace row to open its menu.
2. Click 📁 to reveal the folder in the file manager.
3. Click `</>` to open the folder in your default editor (opens the picker first if none is set).
4. Click ⚙️ to set the default editor — pick one to save instantly.

## Development

```sh
npm install
npm run build   # build the browser bundle into lib/client.js
npm run check   # syntax-check host + build script
```

## License

MIT
