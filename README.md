# download-organizer

智能下载文件夹管家 — 自动归类文件，AI 增强分类，后台实时监控。

## 安装

```bash
git clone <repo-url>
cd download-organizer
npm install
npm run build
npm link
```

## 配置

在项目根目录创建 `.env` 文件：

```
ANTHROPIC_API_KEY=sk-your-api-key
```

AI 分类需要 Claude API Key，不配置则仅使用规则匹配。

## 使用

```bash
# 预览整理计划
download-organizer organize --path ~/Downloads --dry-run

# 执行整理
download-organizer organize --path ~/Downloads

# 递归扫描子目录
download-organizer organize --path ~/Downloads --recursive

# 去重模式
download-organizer organize --path ~/Downloads --dedupe

# 撤销最近一次整理
download-organizer organize --undo

# 后台监控新文件
download-organizer watch --path ~/Downloads

# 自定义规则
download-organizer rule add psd Images
download-organizer rule list

# 查看状态
download-organizer status
```

## 分类规则

| 类别 | 扩展名 |
|------|--------|
| Documents | pdf, doc, docx, xls, xlsx, ppt, pptx, txt, md, csv, html, htm |
| Images | png, jpg, jpeg, gif, webp, bmp, svg, ico, heic |
| Screenshots | 文件名含"截图"/"Screenshot"/"Snipaste"模式 |
| Installers | exe, msi, dmg, pkg, deb, rpm, apk |
| Archives | zip, rar, 7z, tar, gz, bz2, iso, jar |
| Code | js, ts, py, java, go, rs, json, xml, yaml, sh |
| Video | mp4, mov, avi, mkv, wmv, flv, webm |
| Audio | mp3, wav, flac, aac, ogg, wma, m4a |
| Others | 无法归类的文件 |

未命中规则的扩展名会通过 Claude AI 智能分类，结果会缓存到本地。

## 技术栈

- TypeScript + Node.js (ESM)
- chokidar 文件监控
- commander CLI 框架
- Claude API (Haiku) AI 分类
