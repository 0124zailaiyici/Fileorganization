import { Command } from "commander";
import { resolve } from "node:path";
import { loadConfig, saveConfig, DEFAULT_RULES } from "./config.js";
import type { Config } from "./types.js";
import { ALL_CATEGORIES } from "./types.js";
import { getExt } from "./classifier.js";

export function createCLI(
  onOrganize: (config: Config, dryRun: boolean, dedupe: boolean) => Promise<void>,
  onWatch: (config: Config, paths: string[]) => Promise<void>,
  getStatus: (config: Config) => string,
  onUndo: (config: Config, dryRun: boolean) => Promise<void>,
): Command {
  const program = new Command();

  program
    .name("download-organizer")
    .description("智能下载文件夹管家 — 自动归类文件，支持 AI 增强分类")
    .version("1.0.0");

  program
    .command("organize")
    .description("整理目标目录中的文件")
    .option("-p, --path <path>", "目标目录路径，默认当前目录")
    .option("-d, --dry-run", "预览模式，只显示计划不实际移动")
    .option("-r, --recursive", "递归扫描子目录")
    .option("-u, --undo", "撤销最近一次整理操作")
    .option("--dedupe", "基于内容哈希检测并跳过重复文件")
    .action(async (opts) => {
      const config = loadConfig();
      if (opts.path) config.targetPath = resolve(opts.path);
      if (opts.recursive) config.recursive = true;
      if (opts.undo) {
        await onUndo(config, opts.dryRun ?? false);
      } else {
        await onOrganize(config, opts.dryRun ?? false, opts.dedupe ?? false);
      }
    });

  program
    .command("watch")
    .description("启动后台文件监控，新文件自动归类")
    .option("-p, --path <path...>", "监控目录路径，默认当前目录")
    .action(async (opts) => {
      const config = loadConfig();
      const paths: string[] = (opts.path as string[] | undefined)?.map((p: string) => resolve(p)) ?? [config.targetPath];
      console.log(`👀 开始监控 ${paths.length} 个目录`);
      await onWatch(config, paths);
    });

  const ruleCmd = program.command("rule").description("管理自定义分类规则");

  ruleCmd
    .command("add <extension> <category>")
    .description("添加自定义规则")
    .action((extension: string, category: string) => {
      if (!ALL_CATEGORIES.includes(category as typeof ALL_CATEGORIES[number])) {
        console.error(`无效类别: ${category}。可选: ${ALL_CATEGORIES.join(", ")}`);
        process.exit(1);
      }
      const config = loadConfig();
      const ext = getExt(extension) || extension.toLowerCase();
      const existing = config.customRules.find((r) => r.category === category);
      if (existing) {
        if (!existing.extensions.includes(ext)) existing.extensions.push(ext);
      } else {
        config.customRules.push({ extensions: [ext], category: category as typeof ALL_CATEGORIES[number] });
      }
      saveConfig(config);
      console.log(`已添加规则: .${ext} → ${category}`);
    });

  ruleCmd
    .command("list")
    .description("列出所有规则")
    .action(() => printRules(loadConfig()));

  ruleCmd
    .command("remove <extension> <category>")
    .description("移除自定义规则")
    .action((extension: string, category: string) => {
      const config = loadConfig();
      const ext = getExt(extension) || extension.toLowerCase();
      const rule = config.customRules.find((r) => r.category === category);
      if (rule) {
        rule.extensions = rule.extensions.filter((e) => e !== ext);
        if (rule.extensions.length === 0) {
          config.customRules = config.customRules.filter((r) => r !== rule);
        }
        saveConfig(config);
        console.log(`已移除规则: .${ext} → ${category}`);
      } else {
        console.log("未找到该规则");
      }
    });

  program
    .command("status")
    .description("查看当前配置和监控状态")
    .action(() => console.log(getStatus(loadConfig())));

  return program;
}

function printRules(config: Config): void {
  console.log("\n📋 内置规则:");
  for (const rule of DEFAULT_RULES) {
    console.log(`  ${rule.category}: ${rule.extensions.map((e) => "." + e).join(", ")}`);
  }
  if (config.customRules.length > 0) {
    console.log("\n✏️  自定义规则:");
    for (const rule of config.customRules) {
      console.log(`  ${rule.category}: ${rule.extensions.map((e) => "." + e).join(", ")}`);
    }
  }
}
