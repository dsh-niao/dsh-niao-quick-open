# dsh-niao-quick-open

[English](README.md) | [中文](README.zh.md)

DeepSeek Harness 会话区域顶部快捷操作插件。

### 会话区域顶部

会话区域顶部左上角改为两行：

- **第一行**：当前工作区文件夹名称（小字高亮标签）+ 四个图标按钮，悬停提示显示在图标下方：
  - 📋 复制绝对路径
  - 📁 在文件管理器中显示（macOS 访达 / Windows 资源管理器 / Linux 文件管理器）
  - `</>` 使用常用编辑器打开
  - ⚙️ 设置常用编辑器（弹出悬浮卡片列出可用编辑器，点击即切换完成）
- **第二行**：当前会话名称（放大字号）

### 设置：界面功能

在 DSH 设置面板左侧边新增「界面功能」页：

- **工作区快捷按钮**：开关控制会话顶部第一行是否显示（默认开启）。
- **常用编辑器**：下拉选择「常用编辑器中打开」使用的编辑器，选择后立即生效（无需保存）。

配置持久化到 `~/.dsh/dsh-niao-quick-open.config.json`。若未配置常用编辑器就点击「常用编辑器中打开」，会提示前往「设置-界面功能-工作区快捷按钮」进行配置。

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

1. 打开任意工作区会话，会话区域顶部第一行显示工作区文件夹名与四个图标按钮：
   - 点 📋 复制工作区绝对路径。
   - 点 📁 在文件管理器中显示该文件夹。
   - 点 `</>` 用常用编辑器打开该文件夹。
   - 点 ⚙️ 在悬浮卡片中选择常用编辑器——点选即切换完成。
2. 第二行显示当前会话名称（放大字号）。
3. 在 DSH 设置 → **界面功能** 中可开关「工作区快捷按钮」、配置「常用编辑器」。

## 开发

```sh
npm install
npm run build   # 构建浏览器 bundle 到 lib/client.js
npm run check   # 语法检查宿主端与构建脚本
```

## 许可证

MIT
