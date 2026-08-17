# dsh-niao-quick-open

[English](README.md) | [中文](README.zh.md)

DeepSeek Harness **工作区行菜单**中的快捷操作。

点击左侧任意工作区行右侧的 **⋯** 按钮，在其菜单（重命名 / 删除工作区）中会追加三个操作：

- 📁 **在文件管理器中打开**（macOS 为访达 / Windows 为资源管理器 / Linux 为文件管理器）
- `</>` **在常用编辑器中打开**——用已设置的常用编辑器打开工作区文件夹
- ⚙️ **设置常用编辑器**——直接在菜单内展开编辑器选择列表，点击某个编辑器立即生效（无取消 / 确认按钮）

点开「设置常用编辑器」后，菜单内会展开本机自动发现编辑器的紧凑列表（当前已选中的带勾选标记）。点击任意一项即保存并收起列表；列表第一项「未设置」用于清除选择。若在未设置常用编辑器时点击「在常用编辑器中打开」，会自动展开该选择列表。

## 编辑器发现

编辑器由宿主端扫描：

- **已知品牌**——Visual Studio Code、Cursor、Trae、Windsurf、Zed、Sublime Text、HBuilderX、JetBrains 系列、Vim/Neovim CLI 等（显示品牌图标）。
- **动态扫描**——macOS 扫描 `/Applications` + `/System/Applications`，Windows 扫描 Program Files / LocalAppData 程序目录，Linux 探测常见编辑器 CLI；凡命中编辑器关键词的应用都会以字母图标形式列出。

列出的每个编辑器都保证能生成有效的打开命令来打开工作区文件夹。

## 安装

```sh
dsh plugin --profile web add dsh-niao-quick-open
```

或者把包加入你 profile 的 `package.json` 依赖与 `dsh.profile.bundles`，然后重启 `dsh web`。

## 使用

1. 点击工作区行右侧的 **⋯** 按钮打开菜单。
2. 点 📁 在文件管理器中显示该文件夹。
3. 点 `</>` 用常用编辑器打开该文件夹（未设置时会先弹出选择列表）。
4. 点 ⚙️ 设置常用编辑器——点选即保存。

## 开发

```sh
npm install
npm run build   # 构建浏览器 bundle 到 lib/client.js
npm run check   # 语法检查宿主端与构建脚本
```

## 许可证

MIT
