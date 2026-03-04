#!/usr/bin/env node

import { Command } from "commander";
import * as fs from "fs";
import { Linter } from "./linter.js";
import { OmniLang } from "./index.js";

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
    const linter = new Linter(Linter.getDefaultConfig());

    let hasErrors = false;

    for (const file of files) {
      if (!fs.existsSync(file)) {
        console.error(`File not found: ${file}`);
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
              console.log(`\n  Errors (${result.errors.length}):`);
              for (const err of result.errors) {
                console.log(`    ${err.id}: ${err.message}`);
                if (err.line) console.log(`      Line ${err.line}${err.column ? `:${err.column}` : ""}`);
              }
            }

            if (result.warnings.length > 0) {
              console.log(`\n  Warnings (${result.warnings.length}):`);
              for (const warn of result.warnings) {
                console.log(`    ${warn.id}: ${warn.message}`);
              }
            }

            if (result.info.length > 0) {
              console.log(`\n  Info (${result.info.length}):`);
              for (const info of result.info) {
                console.log(`    ${info.id}: ${info.message}`);
              }
            }

            hasErrors = hasErrors || result.errors.length > 0;
          }
        }
      } catch (error) {
        console.error(`Error linting ${file}: ${error instanceof Error ? error.message : String(error)}`);
        hasErrors = true;
      }
    }

    process.exit(hasErrors ? 1 : 0);
  });

program.parse();
