import { extname, basename } from "node:path";
import type { ClassificationResult, Rule } from "./types.js";

const SCREENSHOT_PATTERNS = [
  /^屏幕截图/i, /^screenshot/i, /^snipaste/i,
  /^截图/i, /^capture/i, /^screen/i,
  /^clipboard/i, /^剪贴板/i,
  /screenshot/i, /_screenshot/i,
];

function isScreenshot(filename: string): boolean {
  return SCREENSHOT_PATTERNS.some((p) => p.test(filename));
}

/** 从文件名提取扩展名（小写，无前导点号） */
export function getExt(filename: string): string {
  const ext = extname(filename).toLowerCase();
  return ext.startsWith(".") ? ext.slice(1) : ext;
}

function matchRule(ext: string, rules: Rule[]): Rule | null {
  return rules.find((r) => r.extensions.includes(ext)) ?? null;
}

export async function classify(
  filePath: string,
  rules: Rule[],
  aiEnabled: boolean,
  aiClassify?: (filename: string, ext: string) => Promise<ClassificationResult>,
): Promise<ClassificationResult> {
  const filename = basename(filePath);
  const ext = getExt(filename);

  if (isScreenshot(filename)) {
    return { category: "Screenshots", matchedRule: null, aiGenerated: false, reason: "文件名匹配截图模式" };
  }

  const rule = matchRule(ext, rules);
  if (rule) {
    return { category: rule.category, matchedRule: rule, aiGenerated: false, reason: null };
  }

  if (aiEnabled && aiClassify) {
    return aiClassify(filename, ext);
  }

  return { category: "Others", matchedRule: null, aiGenerated: false, reason: null };
}
