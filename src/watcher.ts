import { watch, type FSWatcher } from "chokidar";
import { basename } from "node:path";
import { statSync } from "node:fs";
import type { Config, ClassificationResult, Rule } from "./types.js";
import { organizeFile, isDownloading } from "./organizer.js";

const pendingTimers = new Map<string, NodeJS.Timeout>();

export function startWatcher(
  config: Config,
  rules: Rule[],
  aiClassify?: (filename: string, ext: string) => Promise<ClassificationResult>,
): FSWatcher {
  const watcher = watch(config.targetPath, {
    ignored: config.ignorePatterns,
    depth: config.recursive ? undefined : 0,
    ignoreInitial: true,
  });

  watcher.on("add", (filePath: string) => {
    handleFileChange(filePath, config, rules, aiClassify);
  });

  watcher.on("change", (filePath: string) => {
    handleFileChange(filePath, config, rules, aiClassify);
  });

  watcher.on("ready", () => {
    console.log(`✅ 监控已就绪: ${config.targetPath}`);
  });

  return watcher;
}

function handleFileChange(
  filePath: string,
  config: Config,
  rules: Rule[],
  aiClassify?: (filename: string, ext: string) => Promise<ClassificationResult>,
): void {
  const existing = pendingTimers.get(filePath);
  if (existing) clearTimeout(existing);

  const timer = setTimeout(() => {
    pendingTimers.delete(filePath);
    if (!isFileStable(filePath, config.stabilityThreshold)) return;
    processOne(filePath, config, rules, aiClassify);
  }, config.stabilityThreshold);

  pendingTimers.set(filePath, timer);
}

/** 两次取样比较文件大小，确认写入已完成 */
function isFileStable(filePath: string, waitMs: number): boolean {
  try {
    const a = statSync(filePath);
    if (a.size === 0) return false;

    // 同步等待不够理想，但对"下载完成"场景足够
    const start = Date.now();
    while (Date.now() - start < Math.min(waitMs / 2, 1000)) {
      // busy-wait briefly — only used for tiny download-completion windows
    }
    const b = statSync(filePath);
    return a.size === b.size && a.mtimeMs === b.mtimeMs;
  } catch {
    return false;
  }
}

async function processOne(
  filePath: string,
  config: Config,
  rules: Rule[],
  aiClassify?: (filename: string, ext: string) => Promise<ClassificationResult>,
): Promise<void> {
  try {
    if (isDownloading(filePath)) return;
    const result = await organizeFile(filePath, config.targetPath, rules, config.aiEnabled, aiClassify);
    if (result.success) {
      console.log(`📁 ${result.category}/${result.fileName}${result.category ? "" : ""}`);
    } else {
      console.error(`❌ ${result.fileName} — ${result.error}`);
    }
  } catch (err) {
    console.error(`❌ 处理失败: ${basename(filePath)} — ${err instanceof Error ? err.message : err}`);
  }
}
