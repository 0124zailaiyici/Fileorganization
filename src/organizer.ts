import { readdirSync, mkdirSync, renameSync, existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import type { Config, OrganizeResult, OrganizeDetail, Rule } from "./types.js";
import { classify } from "./classifier.js";
import type { ClassificationResult } from "./types.js";

const DOWNLOADING_EXTS = new Set([".crdownload", ".part", ".tmp"]);

export function isDownloading(filePath: string): boolean {
  const lower = filePath.toLowerCase();
  for (const ext of DOWNLOADING_EXTS) {
    if (lower.endsWith(ext)) return true;
  }
  return false;
}

export function ensureDir(dir: string): void {
  mkdirSync(dir, { recursive: true });
}

export function resolveConflict(targetDir: string, filename: string): string {
  let dest = join(targetDir, filename);
  if (!existsSync(dest)) return dest;

  const extIndex = filename.lastIndexOf(".");
  const base = extIndex > 0 ? filename.slice(0, extIndex) : filename;
  const ext = extIndex > 0 ? filename.slice(extIndex) : "";

  let counter = 1;
  do {
    dest = join(targetDir, `${base}_${counter}${ext}`);
    counter++;
  } while (existsSync(dest));

  return dest;
}

export async function organizeFile(
  filePath: string,
  targetPath: string,
  rules: Rule[],
  aiEnabled: boolean,
  aiClassify?: (filename: string, ext: string) => Promise<ClassificationResult>,
): Promise<OrganizeDetail> {
  const file = filePath.slice(targetPath.length + 1); // relative filename
  const classification = await classify(filePath, rules, aiEnabled, aiClassify);
  const targetDir = join(targetPath, classification.category);

  const detail: OrganizeDetail = {
    fileName: file,
    from: filePath,
    to: join(targetDir, file),
    category: classification.category,
    success: false,
  };

  try {
    ensureDir(targetDir);
    const dest = resolveConflict(targetDir, file);
    detail.to = dest;
    renameSync(filePath, dest);
    detail.success = true;
  } catch (err) {
    detail.error = err instanceof Error ? err.message : String(err);
  }

  return detail;
}

export async function organize(
  config: Config,
  rules: Rule[],
  aiClassify?: (filename: string, ext: string) => Promise<ClassificationResult>,
  dryRun = false,
): Promise<OrganizeResult> {
  const targetPath = resolve(config.targetPath);
  const result: OrganizeResult = { total: 0, moved: 0, skipped: 0, errors: 0, details: [] };

  const entries = readdirSync(targetPath, { withFileTypes: true });
  const files = entries.filter((e) => e.isFile()).map((e) => e.name);

  for (const file of files) {
    const filePath = join(targetPath, file);
    result.total++;

    if (isDownloading(filePath)) {
      result.skipped++;
      result.details.push({ fileName: file, from: filePath, to: "", category: "Others", success: false, error: "下载中，跳过" });
      continue;
    }

    if (dryRun) {
      const classification = await classify(filePath, rules, config.aiEnabled, aiClassify);
      result.moved++;
      result.details.push({
        fileName: file, from: filePath,
        to: join(targetPath, classification.category, file),
        category: classification.category, success: true,
      });
    } else {
      const detail = await organizeFile(filePath, targetPath, rules, config.aiEnabled, aiClassify);
      if (detail.success) result.moved++;
      else result.errors++;
      result.details.push(detail);
    }
  }

  return result;
}
