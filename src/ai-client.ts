import Anthropic from "@anthropic-ai/sdk";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import type { AICacheEntry, ClassificationResult } from "./types.js";
import { ALL_CATEGORIES } from "./types.js";
import { getCachePath } from "./config.js";

let memoryCache: Map<string, AICacheEntry> | null = null;

function loadCache(): Map<string, AICacheEntry> {
  if (memoryCache) return memoryCache;

  memoryCache = new Map();
  const cachePath = getCachePath();
  if (existsSync(cachePath)) {
    const entries: AICacheEntry[] = JSON.parse(readFileSync(cachePath, "utf-8"));
    for (const entry of entries) {
      memoryCache.set(entry.extension, entry);
    }
  }
  return memoryCache;
}

function saveCache(): void {
  if (!memoryCache) return;
  writeFileSync(getCachePath(), JSON.stringify([...memoryCache.values()], null, 2), "utf-8");
}

/** 注册进程退出时写入缓存 */
let _exitHookInstalled = false;
function ensureExitHook(): void {
  if (_exitHookInstalled) return;
  _exitHookInstalled = true;
  process.on("exit", saveCache);
  process.on("SIGINT", () => { saveCache(); process.exit(0); });
}

let _client: Anthropic | null | undefined = undefined;
function getClient(): Anthropic | null {
  if (_client !== undefined) return _client;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  _client = apiKey ? new Anthropic({ apiKey }) : null;
  return _client;
}

export async function aiClassify(
  filename: string,
  ext: string,
): Promise<ClassificationResult> {
  const cache = loadCache();

  const cached = cache.get(ext);
  if (cached) {
    return { category: cached.category, matchedRule: null, aiGenerated: true, reason: `缓存: ${cached.reason}` };
  }

  const client = getClient();
  if (!client) {
    return { category: "Others", matchedRule: null, aiGenerated: false, reason: "ANTHROPIC_API_KEY 未设置" };
  }

  try {
    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 128,
      system: `你是文件分类助手。根据文件名判断文件属于哪个类别。只返回 JSON，格式: {"category": "<类别>", "reason": "<简短理由>"}。

可用类别: ${ALL_CATEGORIES.join(", ")}。

判断规则:
- 中文文件名如"年度报告"、"会议纪要" → Documents
- 包含"截图"、"屏幕截图"、"Screenshot"、"Snipaste" → Screenshots
- 图片格式(.png/.jpg等)但文件名不像截图 → Images
- 安装程序(.exe/.msi等) → Installers
- 压缩包(.zip/.rar等) → Archives
- 代码文件 → Code
- 视频/音频 → Video/Audio
- 无法判断 → Others`,
      messages: [{ role: "user", content: `请分类这个文件: "${filename}" (扩展名: .${ext})` }],
    });

    const text = response.content
      .filter((c) => c.type === "text")
      .map((c) => c.text)
      .join("")
      .trim();

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return { category: "Others", matchedRule: null, aiGenerated: true, reason: "AI 响应解析失败" };
    }

    const parsed = JSON.parse(jsonMatch[0]);
    const category = ALL_CATEGORIES.includes(parsed.category) ? parsed.category : "Others";
    const reason: string = parsed.reason ?? "AI 分类";

    cache.set(ext, { extension: ext, fileNamePattern: "*", category, reason, createdAt: new Date().toISOString() });
    ensureExitHook();

    return { category, matchedRule: null, aiGenerated: true, reason };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { category: "Others", matchedRule: null, aiGenerated: true, reason: `AI 调用失败: ${msg}` };
  }
}
