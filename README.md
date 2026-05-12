# download-organizer

智能下载文件夹管家 — 自动归类文件，规则 + AI 增强分类，支持后台监控、右键菜单、开机自启。

A smart file organizer for download folders — rule-based + AI classification, background watching, right-click context menu, and auto-start on Windows.

## 功能特性 / Features

- **规则分类** — 50+ 常见扩展名覆盖 7 大类别
- **AI 增强** — Claude API (Haiku) 智能分析未命中规则的文件，支持中文文件名语义识别
- **后台监控** — chokidar 实时监听目录，新文件自动归类，内置稳定性检测（下载中不处理）
- **递归扫描** — `--recursive` 提取子目录文件到顶层分类目录
- **去重检测** — `--dedupe` 基于 SHA256 内容哈希跳过重复文件
- **操作回滚** — `organize --undo` 一键撤销最近一次整理
- **预览模式** — `--dry-run` 查看计划而不实际移动
- **右键菜单** — Windows 文件夹右键 "智能整理此文件夹"
- **开机自启** — VBS 静默启动后台监控
- **多目录监控** — 同时监控多个下载目录
- **安全防护** — 路径穿越防护、符号链接禁用、API Key 隔离

## 安装 / Installation

```bash
git clone https://github.com/0124zailaiyici/Fileorganization.git
cd Fileorganization
npm install
npm run build
npm link
```

`npm link` 后即可在任意终端使用 `download-organizer` 命令。

## 配置 / Configuration

在项目根目录创建 `.env` 文件：

```
ANTHROPIC_API_KEY=sk-your-api-key
```

AI 分类需要 Claude API Key，不配置则仅使用规则匹配。

配置文件 `.download-organizer.json` 会在首次运行时自动生成，可自定义：

```json
{
  "targetPath": "D:/下载",
  "aiEnabled": true,
  "recursive": false,
  "stabilityThreshold": 2000,
  "customRules": [
    { "extensions": ["psd", "ai"], "category": "Images" }
  ],
  "ignorePatterns": [
    "node_modules/**",
    ".git/**",
    "*.crdownload",
    "*.part",
    "*.tmp",
    "desktop.ini",
    "Thumbs.db",
    ".DS_Store"
  ]
}
```

## 命令行使用 / CLI Usage

### organize — 整理文件

```bash
# 预览整理计划（不实际移动）
download-organizer organize --path D:/下载 --dry-run

# 执行整理
download-organizer organize --path D:/下载

# 递归扫描子目录文件
download-organizer organize --path D:/下载 --recursive

# 去重模式（跳过内容相同的文件）
download-organizer organize --path D:/下载 --dedupe

# 撤销最近一次整理
download-organizer organize --undo

# 预览撤销计划
download-organizer organize --undo --dry-run
```

### watch — 后台监控

```bash
# 监控单个目录
download-organizer watch --path D:/下载

# 监控多个目录
download-organizer watch --path D:/下载 --path C:/Users/wx/Downloads
```

### rule — 规则管理

```bash
# 添加自定义规则
download-organizer rule add psd Images
download-organizer rule add whl Archives

# 列出所有规则（内置 + 自定义）
download-organizer rule list

# 移除自定义规则
download-organizer rule remove whl Archives
```

### status — 查看状态

```bash
download-organizer status
```

## Windows 集成 / Windows Integration

### 右键菜单 / Right-click Context Menu

在任意文件夹上右键 → "智能整理此文件夹"，自动归类该文件夹内所有文件。

**安装：**

右键 `scripts\install-context-menu.bat` → **以管理员身份运行**

**卸载：**

右键 `scripts\uninstall-context-menu.bat` → **以管理员身份运行**

> **原理：** 注册表 `HKEY_CLASSES_ROOT\Folder\shell\DownloadOrganizer` 下写入命令，调用 `scripts\context-menu.bat` 执行整理。安装脚本使用 Node.js 直接操作注册表，避免编码问题。

### 开机自启 / Auto-start

系统启动时后台静默运行 `download-organizer watch`，无窗口。

**安装：**

双击 `scripts\install-startup.bat`（非管理员也可）

**卸载：**

双击 `scripts\uninstall-startup.bat`

> **自定义监控目录：** 编辑 `install-startup.bat` 中的 `PATH1`、`PATH2` 变量后重新运行。

## 分类规则 / Classification Rules

| 类别 / Category | 扩展名 / Extensions |
|---|---|
| **Documents** | pdf, doc, docx, xls, xlsx, ppt, pptx, txt, md, csv, html, htm, odt, ods, rtf |
| **Images** | png, jpg, jpeg, gif, webp, bmp, svg, ico, tiff, tif, heic, heif, raw |
| **Installers** | exe, msi, dmg, pkg, deb, rpm, appx, apk |
| **Archives** | zip, rar, 7z, tar, gz, bz2, xz, tgz, iso, jar |
| **Code** | js, ts, jsx, tsx, py, java, go, rs, c, cpp, cs, rb, php, swift, json, xml, yaml, sh, bat, ps1 |
| **Video** | mp4, mov, avi, mkv, wmv, flv, webm, m4v, 3gp |
| **Audio** | mp3, wav, flac, aac, ogg, wma, m4a, opus |

**特殊规则：**
- **Screenshots** — 文件名含 "截图" / "Screenshot" / "Snipaste" / "屏幕截图" 等模式自动识别
- **.ts 视频流** — 自动区分 TypeScript 代码文件与视频流 `.ts` 文件（基于文件名中的动漫/番剧/剧集关键词）
- 未命中规则的文件交给 **AI 分类**，结果缓存到本地

## 项目结构 / Project Structure

```
Fileorganization/
├── src/
│   ├── index.ts        # 入口，信号处理
│   ├── cli.ts          # CLI 命令定义 (commander)
│   ├── config.ts       # 配置加载、默认规则
│   ├── organizer.ts    # 核心整理逻辑
│   ├── classifier.ts   # 文件分类 (规则 + AI)
│   ├── ai-client.ts    # Claude API 客户端
│   ├── watcher.ts      # chokidar 文件监控
│   ├── history.ts      # 操作记录 & 回滚
│   └── types.ts        # 类型定义
├── scripts/
│   ├── context-menu.bat              # 右键菜单执行脚本
│   ├── install-context-menu.bat      # 安装右键菜单
│   ├── install-context-menu.cjs      # Node.js 注册表操作
│   ├── uninstall-context-menu.bat    # 卸载右键菜单
│   ├── install-startup.bat           # 安装开机自启
│   └── uninstall-startup.bat         # 卸载开机自启
├── dist/               # 编译输出 (npm run build)
├── package.json
├── tsconfig.json
├── CHANGELOG.md
└── README.md
```

## 技术栈 / Tech Stack

- TypeScript + Node.js (ESM)
- [chokidar](https://github.com/paulmillr/chokidar) — 文件系统监控
- [commander](https://github.com/tj/commander.js) — CLI 框架
- [Claude API](https://docs.anthropic.com/) (Haiku) — AI 文件分类
- 零外部依赖的 SHA256 哈希（`node:crypto`）

## 系统要求 / Requirements

- Node.js ≥ 20
- Windows / macOS / Linux
- Claude API Key（可选，启用 AI 分类时需要）

## License

MIT
