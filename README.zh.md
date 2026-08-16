# dsh-niao-quick-open

[English](README.md) | [中文](README.zh.md)

DeepSeek Harness 会话标题栏的一键工作区快捷操作。

当你在某个会话中时，标题栏（Session log 下载按钮左侧）会多出几个图标按钮，它们作用于**当前会话所在的工作区目录**：

| 图标 | 悬浮提示 | 功能 |
| --- | --- | --- |
| ⚙️ | 配置常用编辑器 | 弹出设置菜单，内含编辑器下拉框——选择后需点击**保存**才生效；点击菜单外或**取消**则放弃修改 |
| `</>` | 编辑器打开 | 用你配置的常用编辑器打开工作区文件夹 |
| 📂 | 在文件管理器中打开 | 在文件管理器中显示工作区文件夹（macOS 为访达 / Windows 为资源管理器 / Linux 为文件管理器） |
| 📋 | 复制文件夹名称 | 把工作区文件夹名称复制到剪贴板（提示会短暂显示"已复制"1 秒） |

按钮仅在打开会话时出现（注册在 `conversation.session.header.utilities` 插槽）。

## 特性

- **自动检测编辑器** — 自动检索本机已安装的编辑器（Visual Studio Code、Cursor、Trae、Windsurf、Zed、Sublime Text、HBuilderX、JetBrains 系列、Vim/Neovim 命令行等），支持 macOS / Windows / Linux。
- **按平台显示文案** — 文件管理器按钮的提示文字随系统自动切换。
- **草稿 + 保存** — 菜单里选择编辑器只是草稿，点「保存」才真正生效。
- **复制反馈** — 复制按钮提示会短暂显示"已复制"。
- **无工作区自动禁用** — 不属于任何工作区的会话，编辑器/文件管理器按钮置灰。

## 安装

```sh
dsh plugin --profile web add dsh-niao-quick-open
```

或者把包加入你 profile 的 `package.json` 依赖与 `dsh.profile.bundles`，然后重启 `dsh web`。

## 使用

1. 打开任意会话（该会话需属于某个工作区）。
2. 在标题栏 Session log 下载按钮左侧找到这几个图标按钮。
3. 首次使用：点 ⚙️，在下拉框中选择常用编辑器，点**保存**。
4. 之后点 `</>` 用该编辑器打开工作区，点 📂 在文件管理器中显示，或点 📋 复制文件夹名称。

## 开发

```sh
npm install
npm run build   # 构建 host + client 产物
npm test        # 运行测试（添加后）
```

## 许可证

MIT
