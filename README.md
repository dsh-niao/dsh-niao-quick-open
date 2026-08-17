# dsh-niao-quick-open

[English](README.md) | [中文](README.zh.md)

Workspace quick actions on the DeepSeek Harness **workspace hover card**.

Hover any workspace in the left sidebar and its hover card gains:

- A **copy button** after the workspace name and after its absolute path — click the row or the button to copy that value (with a brief "copied" confirmation).
- Three **icon buttons** under the path (tooltip shown on hover):
  - 📁 **Open in file manager** (Finder on macOS / Explorer on Windows / file manager on Linux)
  - `</>` **Open in editor** — opens the folder in your configured default editor
  - ⚙️ **Configure default editor** — opens a dropdown of editors auto-discovered on this machine; changes apply only after **Save**

The default "click the card to copy the path" behavior is removed.

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

1. Hover a workspace in the left sidebar.
2. Click the copy buttons to copy the name or the absolute path.
3. First time: click ⚙️, pick your default editor in the dropdown, click **Save**.
4. Then click `</>` to open the folder in that editor, or 📁 to reveal it in the file manager.

## Development

```sh
npm install
npm run build   # build the browser bundle into lib/client.js
npm run check   # syntax-check host + build script
```

## License

MIT
