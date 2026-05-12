import { readdirSync, mkdirSync, renameSync, existsSync, createReadStream } from "node:fs";
import { join, resolve, basename } from "node:path";
import { createHash } from "node:crypto";
import type { Config, OrganizeResult, OrganizeDetail, Rule } from "./types.js";
import { classify } from "./classifier.js";
import type { ClassificationResult } from "./types.js";
import { beginBatch, recordMove, endBatch } from "./history.js";

const DOWNLOADING_EXTS = new Set([".crdownload", ".part", ".tmp"]);

function hashFile(filePath: string): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const hash = createHash("sha256");
    const stream = createReadStream(filePath);
    stream.on("data", (chunk: Buffer) => hash.update(chunk));
    stream.on("end", () => resolve(hash.digest("hex").slice(0, 16)));
    stream.on("error", reject);
  });
}

export function isDownloading(filePath: string): boolean {
  const lower = filePath.toLowerCase();
  for (const ext of DOWNLOADING_EXTS) {
    if (lower.endsWith(ext)) return true;
  }
  return false;
}

function matchesIgnorePattern(filename: string, pattern: string): boolean {
  if (!pattern.includes("*")) {
    return basename(filename) === pattern || filename.includes(pattern);
  }
  if (pattern.startsWith("*.")) {
    return filename.toLowerCase().endsWith(pattern.slice(1).toLowerCase());
  }
  if (pattern.startsWith("**/") && pattern.endsWith("/**")) {
    const dir = pattern.slice(3, -3);
    return filename.includes(dir);
  }
  return false;
}

function walkFiles(
  targetPath: string,
  recursive: boolean,
  ignorePatterns: string[],
): Array<{ name: string; path: string }> {
  const results: Array<{ name: string; path: string }> = [];
  const entries = readdirSync(targetPath, { withFileTypes: true, recursive });
  for (const entry of entries) {
    if (!entry.isFile()) continue;
    const parentPath = (entry as { parentPath?: string }).parentPath ?? targetPath;
    const relDir = parentPath.slice(targetPath.length + 1);
    const displayName = relDir ? `${relDir}/${entry.name}` : entry.name;
    if (ignorePatterns.some((p) => matchesIgnorePattern(displayName, p))) continue;
    results.push({ name: displayName, path: join(parentPath, entry.name) });
  }
  return results;
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
  const file = filePath.slice(targetPath.length + 1);
  const classification = await classify(filePath, rules, aiEnabled, aiClassify);
  const targetDir = join(targetPath, classification.category);
  const destName = basename(filePath);

  const detail: OrganizeDetail = {
    fileName: file,
    from: filePath,
    to: join(targetDir, destName),
    category: classification.category,
    success: false,
  };

  try {
    ensureDir(targetDir);
    const dest = resolveConflict(targetDir, destName);
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
  dedupe = false,
): Promise<OrganizeResult> {
  const targetPath = resolve(config.targetPath);
  const result: OrganizeResult = { total: 0, moved: 0, skipped: 0, errors: 0, details: [] };

  if (!dryRun) beginBatch();

  const files = walkFiles(targetPath, config.recursive, config.ignorePatterns);
  const seenDest = new Set<string>();
  const seenHash = new Map<string, string>(); // hash → filename

  for (const f of files) {
    result.total++;

    if (isDownloading(f.path)) {
      result.skipped++;
      result.details.push({ fileName: f.name, from: f.path, to: "", category: "Others", success: false, error: "下载中，跳过" });
      continue;
    }

    // Check same-name duplicate
    const destName = basename(f.path);
    const classification = await classify(f.path, rules, config.aiEnabled, aiClassify);
    const destKey = `${classification.category}/${destName}`;

    if (seenDest.has(destKey)) {
      result.skipped++;
      result.details.push({
        fileName: f.name, from: f.path, to: join(targetPath, classification.category, destName),
        category: classification.category, success: false, error: "同名文件，已存在", duplicate: true,
      });
      continue;
    }
    seenDest.add(destKey);

    // Check content duplicate (only when --dedupe)
    if (dedupe) {
      const hash = await hashFile(f.path);
      const existing = seenHash.get(hash);
      if (existing) {
        result.skipped++;
        result.details.push({
          fileName: f.name, from: f.path, to: "",
          category: classification.category, success: false, error: `内容重复: ${existing}`, duplicate: true, duplicateOf: existing,
        });
        continue;
      }
      seenHash.set(hash, f.name);
    }

    if (dryRun) {
      result.moved++;
      result.details.push({
        fileName: f.name, from: f.path,
        to: join(targetPath, classification.category, destName),
        category: classification.category, success: true,
      });
    } else {
      const detail = await organizeFile(f.path, targetPath, rules, config.aiEnabled, aiClassify);
      if (detail.success) result.moved++;
      else result.errors++;
      result.details.push(detail);
      if (detail.success) recordMove(detail);
    }
  }

  if (!dryRun) endBatch();
  return result;
}
