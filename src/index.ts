import "dotenv/config";
import { createCLI } from "./cli.js";
import { organize } from "./organizer.js";
import { startWatcher } from "./watcher.js";
import { getEffectiveRules } from "./config.js";
import type { Config } from "./types.js";
import { aiClassify, saveCache } from "./ai-client.js";
import { undoLastBatch, saveHistory } from "./history.js";

function getStatus(config: Config): string {
  return `
📊 当前状态
─────────────────────
监控路径 : ${config.targetPath}
AI 分类  : ${config.aiEnabled ? "✅ 启用" : "❌ 关闭"}
递归处理 : ${config.recursive ? "✅ 是" : "❌ 否"}
防抖时间 : ${config.stabilityThreshold}ms
自定义规则: ${config.customRules.length} 条
忽略模式 : ${config.ignorePatterns.join(", ") || "(无)"}
`;
}

async function handleOrganize(config: Config, dryRun: boolean, dedupe: boolean): Promise<void> {
  const rules = getEffectiveRules(config);
  const classifyFn = config.aiEnabled ? aiClassify : undefined;

  if (dryRun) {
    console.log("🔍 预览模式 — 不会实际移动文件\n");
  }

  const result = await organize(config, rules, classifyFn, dryRun, dedupe);

  console.log(`\n📊 整理完成: 共 ${result.total} 个文件`);
  console.log(`   移动: ${result.moved}  跳过: ${result.skipped}  错误: ${result.errors}`);

  for (const d of result.details) {
    const icon = d.success ? "✅" : "⏭️";
    const flag = d.error ? ` (${d.error})` : "";
    console.log(`   ${icon} ${d.fileName} → ${d.category}${flag}`);
  }

  saveCache();
  saveHistory();
}

async function handleUndo(config: Config, dryRun: boolean): Promise<void> {
  if (dryRun) console.log("🔍 预览模式 — 不会实际撤销\n");

  const result = undoLastBatch(dryRun);
  if (result.total === 0) {
    console.log("没有可撤销的操作记录");
    return;
  }

  console.log(`\n📊 撤销批次: ${result.batchId}`);
  console.log(`   共 ${result.total} 个操作，成功恢复 ${result.reverted} 个，失败 ${result.errors} 个`);

  for (const d of result.details) {
    const icon = d.success ? "↩️" : "❌";
    const flag = d.error ? ` (${d.error})` : "";
    console.log(`   ${icon} ${d.fileName}${flag}`);
  }

  if (!dryRun) saveHistory();
}

async function handleWatch(config: Config): Promise<void> {
  const rules = getEffectiveRules(config);
  const classifyFn = config.aiEnabled ? aiClassify : undefined;
  const watcher = startWatcher(config, rules, classifyFn);

  const shutdown = () => {
    saveCache();
    saveHistory();
    watcher.close();
    process.exit(0);
  };
  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);
  process.stdin.resume();
}

const program = createCLI(handleOrganize, handleWatch, getStatus, handleUndo);
program.parse();
