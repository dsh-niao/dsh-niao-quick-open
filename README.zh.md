# dsh-niao-quick-open

[English](README.md) | [中文](README.zh.md)

DeepSeek Harness **工作区悬浮卡片**上的快捷操作。

鼠标悬停左侧任意工作区时，悬浮卡片会获得以下增强：

- **名称行 / 绝对路径行**各带一个复制按钮——点整行或复制按钮即可复制对应内容（有短暂「已复制」提示）。
- 路径下方三个**图标按钮**（悬停显示提示文字）：
  - 📁 **在文件管理器中打开**（macOS 为访达 / Windows 为资源管理器 / Linux 为文件管理器）
  - `</>` **在常用编辑器中打开**——用已设置的常用编辑器打开工作区文件夹
  - ⚙️ **设置常用编辑器**——下拉框列出本机自动发现的编辑器，点**保存**才生效

卡片原本「点击复制路径」的默认行为已去除。

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

1. 鼠标悬停左侧任意工作区。
2. 点复制按钮复制工作区名称或绝对路径。
3. 首次使用：点 ⚙️，在下拉框中选择常用编辑器，点**保存**。
4. 之后点 `</>` 用该编辑器打开工作区，或点 📁 在文件管理器中显示。

## 开发

```sh
npm install
npm run build   # 构建浏览器 bundle 到 lib/client.js
npm run check   # 语法检查宿主端与构建脚本
```

## 许可证

MIT
