import { watch, type FSWatcher } from "chokidar";
import { basename, resolve as resolvePath, sep } from "node:path";
import { statSync } from "node:fs";
import type { Config, ClassificationResult, Rule } from "./types.js";
import { organizeFile, isDownloading } from "./organizer.js";

const pendingTimers = new Map<string, NodeJS.Timeout>();

export function startWatcher(
  config: Config,
  rules: Rule[],
  aiClassify?: (filename: string, ext: string) => Promise<ClassificationResult>,
): FSWatcher {
  const targetPath = resolvePath(config.targetPath);

  const watcher = watch(targetPath, {
    ignored: config.ignorePatterns,
    depth: config.recursive ? undefined : 0,
    ignoreInitial: true,
    followSymlinks: false,
  });

  watcher.on("add", (filePath: string) => {
    handleFileChange(filePath, targetPath, config, rules, aiClassify);
  });

  watcher.on("change", (filePath: string) => {
    handleFileChange(filePath, targetPath, config, rules, aiClassify);
  });

  watcher.on("ready", () => {
    console.log(`✅ 监控已就绪: ${targetPath}`);
  });

  return watcher;
}

function handleFileChange(
  filePath: string,
  targetPath: string,
  config: Config,
  rules: Rule[],
  aiClassify?: (filename: string, ext: string) => Promise<ClassificationResult>,
): void {
  const existing = pendingTimers.get(filePath);
  if (existing) clearTimeout(existing);

  const timer = setTimeout(async () => {
    pendingTimers.delete(filePath);
    const stable = await isFileStable(filePath, config.stabilityThreshold);
    if (!stable) return;
    processOne(filePath, targetPath, rules, config.aiEnabled, aiClassify);
  }, config.stabilityThreshold);

  pendingTimers.set(filePath, timer);
}

async function isFileStable(filePath: string, waitMs: number): Promise<boolean> {
  try {
    const a = statSync(filePath);
    if (a.size === 0) return false;
    await new Promise((r) => setTimeout(r, Math.min(waitMs / 2, 1000)));
    const b = statSync(filePath);
    return a.size === b.size && a.mtimeMs === b.mtimeMs;
  } catch {
    return false;
  }
}

async function processOne(
  filePath: string,
  targetPath: string,
  rules: Rule[],
  aiEnabled: boolean,
  aiClassify?: (filename: string, ext: string) => Promise<ClassificationResult>,
): Promise<void> {
  try {
    // 防御：确保文件在目标目录内
    const resolvedFile = resolvePath(filePath);
    const resolvedTarget = resolvePath(targetPath);
    if (!resolvedFile.startsWith(resolvedTarget + sep) && resolvedFile !== resolvedTarget) {
      console.error(`⚠️ 跳过外部文件: ${basename(filePath)}`);
      return;
    }

    if (isDownloading(filePath)) return;
    const result = await organizeFile(filePath, resolvedTarget, rules, aiEnabled, aiClassify);
    if (result.success) {
      console.log(`📁 ${result.category}/${result.fileName}`);
    } else {
      console.error(`❌ ${result.fileName} — ${result.error}`);
    }
  } catch (err) {
    console.error(`❌ 处理失败: ${basename(filePath)} — ${err instanceof Error ? err.message : err}`);
  }
}
