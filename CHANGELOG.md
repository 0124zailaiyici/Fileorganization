# Changelog

All notable changes to this project will be documented in this file.

## [2.1.0] - 2026-05-12

### Added
- **Windows 右键菜单**：文件夹右键 "智能整理此文件夹"，一键整理当前目录
- **多目录监控**：`watch --path A --path B` 同时监控多个下载目录
- **开机自启**：VBS 静默脚本实现 Windows 开机自动启动后台监控

### Fixed
- 修复右键菜单中文显示乱码（`.reg` UTF-16 LE 编码问题）
- 修复 `chcp 65001` 导致批处理重定向解析失败
- 最终方案：Node.js 脚本直接操作注册表，彻底绕过所有编码环节

## [2.0.0] - 2026-05-12

### Added
- **AI 智能分类**：Claude API (Haiku) 分析未知扩展名文件，支持中文文件名语义识别
- **后台监控**：chokidar 实时监控目录，新文件出现自动归类
- **CLI 完整命令**：`organize` / `watch` / `rule` / `status` 四大子命令
- **操作回滚**：`organize --undo` 一键撤销最近一次整理
- **递归模式**：`--recursive` 深度扫描子目录文件并提取到分类目录
- **去重检测**：`--dedupe` 基于 SHA256 内容哈希跳过重复文件
- **智能识别**：截图命名模式自动归入 Screenshots，.ts 视频流与 TypeScript 自动区分
- **系统文件忽略**：`desktop.ini`、`Thumbs.db`、`.DS_Store` 等默认跳过
- **预览模式**：`--dry-run` 查看计划而不实际移动文件
- **规则管理**：`rule add/remove/list` 自定义扩展名分类规则
- **全球安装**：`npm link` 后全局可用 `download-organizer` 命令

### Fixed
- 修复 `.htm` 文件未正确归类到 Documents
- 修复 `.ts` 视频流文件被误判为 Code
- 修复递归模式下子目录路径叠加到目标路径

### Security
- 路径穿越防护：确保被操作文件在目标目录内
- 符号链接禁用：`followSymlinks: false`
- 防抖加载：下载中的文件 (.crdownload/.part/.tmp) 不处理
- API Key 隔离：通过 dotenv 管理，不提交至仓库

[2.1.0]: https://github.com/0124zailaiyici/Fileorganization/compare/v2.0.0...v2.1.0
[2.0.0]: https://github.com/0124zailaiyici/Fileorganization/releases/tag/v2.0.0
