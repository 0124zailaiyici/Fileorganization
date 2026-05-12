import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import type { Config, Rule } from "./types.js";

export const DEFAULT_RULES: Rule[] = [
  { extensions: ["pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "txt", "md", "csv", "odt", "ods", "rtf"], category: "Documents" },
  { extensions: ["png", "jpg", "jpeg", "gif", "webp", "bmp", "svg", "ico", "tiff", "tif", "heic", "heif", "raw"], category: "Images" },
  { extensions: ["exe", "msi", "dmg", "pkg", "deb", "rpm", "appx", "apk"], category: "Installers" },
  { extensions: ["zip", "rar", "7z", "tar", "gz", "bz2", "xz", "tgz", "tar.gz", "tar.bz2", "tar.xz", "iso"], category: "Archives" },
  { extensions: ["js", "ts", "jsx", "tsx", "py", "java", "go", "rs", "c", "cpp", "h", "hpp", "cs", "rb", "php", "swift", "kt", "json", "xml", "yaml", "yml", "toml", "ini", "cfg", "sh", "bat", "ps1"], category: "Code" },
  { extensions: ["mp4", "mov", "avi", "mkv", "wmv", "flv", "webm", "m4v", "3gp"], category: "Video" },
  { extensions: ["mp3", "wav", "flac", "aac", "ogg", "wma", "m4a", "opus"], category: "Audio" },
];

const CONFIG_FILENAME = ".download-organizer.json";
const CACHE_FILENAME = ".download-organizer-cache.json";

/** 缓存预计算的有效规则 */
let _cachedRules: Rule[] | null = null;
let _cachedCustomRuleCount = -1;

export function getConfigPath(): string {
  return resolve(process.cwd(), CONFIG_FILENAME);
}

export function getCachePath(): string {
  return resolve(process.cwd(), CACHE_FILENAME);
}

export function getDefaultConfig(): Config {
  return {
    targetPath: process.cwd(),
    customRules: [],
    aiEnabled: true,
    ignorePatterns: ["node_modules/**", ".git/**", "*.crdownload", "*.part", "*.tmp"],
    recursive: false,
    stabilityThreshold: 2000,
  };
}

export function loadConfig(): Config {
  const configPath = getConfigPath();
  if (!existsSync(configPath)) return getDefaultConfig();

  const raw = readFileSync(configPath, "utf-8");
  const userConfig = JSON.parse(raw) as Partial<Config>;
  return { ...getDefaultConfig(), ...userConfig };
}

export function saveConfig(config: Config): void {
  _cachedRules = null; // 失效缓存
  writeFileSync(getConfigPath(), JSON.stringify(config, null, 2), "utf-8");
}

/** 获取有效规则（合并自定义+内置），结果会被缓存 */
export function getEffectiveRules(config: Config): Rule[] {
  if (_cachedRules && _cachedCustomRuleCount === config.customRules.length) {
    return _cachedRules;
  }
  _cachedRules = [...config.customRules, ...DEFAULT_RULES];
  _cachedCustomRuleCount = config.customRules.length;
  return _cachedRules;
}
