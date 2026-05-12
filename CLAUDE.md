# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # 直接运行入口 (tsx src/index.ts)
npm run build        # TypeScript 编译
npm run organize     # 手动整理当前目录的文件
npm run watch        # 启动后台文件监控
npm run organize -- --dry-run    # 预览模式，不实际移动
npm run organize -- --path /some/dir   # 指定目录
```

## Architecture

**下载文件夹智能管家** — 后台常驻 + CLI 的 AI 驱动文件归类工具。

```
src/
├── index.ts        # 入口：解析 CLI → 启动监控或执行单次整理
├── cli.ts          # Commander CLI 命令定义
├── watcher.ts      # chokidar 文件监控 + 防抖 + 下载中文件过滤
├── classifier.ts   # 分类引擎：规则匹配(快速路径) → AI分类(回退路径)
├── organizer.ts    # 文件移动/归类执行，dry-run 支持，冲突处理
├── config.ts       # 规则配置读写
├── ai-client.ts    # Claude API 封装 + 结果缓存
└── types.ts        # 共享类型定义
```

**数据流**: chokidar 事件 → watcher 防抖/过滤 → classifier 分类 → organizer 执行移动

**分类双路径**: 已知扩展名走内置规则表(极快) → 未知/模糊扩展名走 Claude API(智能,带缓存)

**配置存储**: 自定义规则写入本地 JSON 文件，AI 缓存独立文件。

## Key Dependencies

- `chokidar` — 跨平台文件系统监控
- `commander` — CLI 框架
- `@anthropic-ai/sdk` — Claude API 客户端
- `tsx` — TypeScript 执行器(开发用，无需编译)
