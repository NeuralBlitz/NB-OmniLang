#!/usr/bin/env node

import { Command } from "commander";
import * as fs from "fs";
import { Linter } from "./linter.js";
import { OmniLang } from "./index.js";

const loadConfig = (configPath?: string) => {
  if (!configPath) {
    return Linter.getDefaultConfig();
  }
  try {
    const configContent = fs.readFileSync(configPath, "utf-8");
    const config = JSON.parse(configContent);
    return { ...Linter.getDefaultConfig(), ...config };
  } catch (error) {
    console.error(`Error loading config: ${error instanceof Error ? error.message : String(error)}`);
    return Linter.getDefaultConfig();
  }
};

const applyFix = (content: string, fences: any[]): string => {
  let fixed = content;

  for (const fence of fences) {
    if (fence.type === "data" && fence.attrs.name === undefined) {
      console.log(`  💡 Consider adding a name attribute to data fence for easier reference`);
    }
  }

  return fixed;
};

const program = new Command();

program
  .name("omni-lint")
  .description("Lint OmniLang documents for issues and best practices")
  .version("1.0.0")
  .option("-c, --config <file>", "Lint config file")
  .option("--fix", "Automatically fix issues where possible")
  .option("--format <format>", "Output format: text, json", "text")
  .argument("<files...>", "Files to lint")
  .action(async (files: string[], options) => {
    const config = loadConfig(options.config);
    const linter = new Linter(config);

    let hasErrors = false;
    let fixedCount = 0;

    for (const file of files) {
      if (!fs.existsSync(file)) {
        console.error(`🔴 File not found: ${file}`);
        hasErrors = true;
        continue;
      }

      try {
        const content = fs.readFileSync(file, "utf-8");
        const omni = new OmniLang();
        omni.parse(content);
        const fences = omni.getFences();

        const result = linter.lint(fences, content);

        if (options.format === "json") {
          console.log(JSON.stringify({
            file,
            ...result,
          }, null, 2));
        } else {
          console.log(`\n${file}:`);
          console.log("─".repeat(50));

          if (result.errors.length === 0 && result.warnings.length === 0 && result.info.length === 0) {
            console.log("  ✓ No issues found");
          } else {
            if (result.errors.length > 0) {
              console.log(`\n🔴 Errors (${result.errors.length}):`);
              for (const err of result.errors) {
                console.log(`    ${err.id}: ${err.message}`);
                if (err.line) console.log(`      Line ${err.line}${err.column ? `:${err.column}` : ""}`);
              }
            }

            if (result.warnings.length > 0) {
              console.log(`\n🟡 Warnings (${result.warnings.length}):`);
              for (const warn of result.warnings) {
                console.log(`    ${warn.id}: ${warn.message}`);
              }
            }

            if (result.info.length > 0) {
              console.log(`\n💡 Info (${result.info.length}):`);
              for (const info of result.info) {
                console.log(`    ${info.id}: ${info.message}`);
              }
            }

            if (options.fix && result.fixable > 0) {
              const fixed = applyFix(content, fences);
              fs.writeFileSync(file, fixed, "utf-8");
              console.log(`\n  ✓ Applied ${result.fixable} fix(es)`);
              fixedCount += result.fixable;
            }

            hasErrors = hasErrors || result.errors.length > 0;
          }
        }
      } catch (error) {
        console.error(`Error linting ${file}: ${error instanceof Error ? error.message : String(error)}`);
        hasErrors = true;
      }
    }

    if (options.fix && fixedCount > 0) {
      console.log(`\n✓ Fixed ${fixedCount} issue(s) across ${files.length} file(s)`);
    }

    process.exit(hasErrors ? 1 : 0);
  });

program.parse();
