#!/usr/bin/env node

import { Command } from "commander";
import * as fs from "fs";
import * as path from "path";
import * as chokidar from "chokidar";
import { OmniLang } from "./index.js";

const program = new Command();

program
  .name("omni")
  .description("OmniLang CLI - Executable Markdown processor")
  .version("1.0.0");

program
  .command("build")
  .description("Build an OmniLang document")
  .argument("<input>", "Input .omd file")
  .option("-o, --output <file>", "Output file path", "")
  .option("-f, --format <format>", "Output format: html, json", "html")
  .option("-v, --verbose", "Verbose output", false)
  .option("-t, --theme <theme>", "Theme: light, dark", "light")
  .option("--no-styles", "Exclude inline styles")
  .option("--csp", "Enable Content Security Policy")
  .option("--base-path <path>", "Base path for include directives")
  .option("--allowed-domain <domain>", "Allowed domain for fetch (can be repeated)", (val, list: string[]) => { list.push(val); return list; }, [])
  .action(async (input: string, options) => {
    const verbose = options.verbose ?? false;
    const output = options.output || input.replace(/\.omd$/, ".html");
    const format = options.format;
    const theme = options.theme;
    const csp = options.csp ?? false;
    const basePath = options.basePath || path.dirname(path.resolve(input));
    const allowedDomains = options.allowedDomain || [];

    if (!fs.existsSync(input)) {
      console.error(`Error: Input file not found: ${input}`);
      process.exit(1);
    }

    try {
      if (verbose) console.log(`Reading: ${input}`);

      const content = fs.readFileSync(input, "utf-8");

      if (verbose) console.log("Parsing OmniLang document...");
      const omni = new OmniLang({
        basePath,
        allowedDomains: allowedDomains.length > 0 ? allowedDomains : undefined,
      });
      omni.parse(content);

      if (verbose) {
        console.log(`Found ${omni.getFences().length} fence blocks:`);
        omni.getFences().forEach((fence, i) => {
          console.log(
            `  ${i + 1}. ${fence.type}${
              fence.attrs.name ? ` (${fence.attrs.name})` : ""
            }`
          );
        });
      }

      if (verbose) console.log("Executing fences...");
      await omni.execute();

      if (verbose) console.log("Rendering output...");

      let result: string;
      if (format === "json") {
        result = JSON.stringify(
          {
            data: omni.scope.data,
            computed: omni.scope.computed,
            charts: omni.scope.charts,
          },
          null,
          2
        );
      } else {
        result = omni.toHtml({ theme: theme as "light" | "dark", csp });
      }

      if (verbose) console.log(`Writing: ${output}`);
      fs.writeFileSync(output, result, "utf-8");

      console.log(`✓ Successfully built: ${output}`);

      if (verbose) {
        console.log("\nExecution Summary:");
        console.log(`  Data blocks: ${Object.keys(omni.scope.data).length}`);
        console.log(
          `  Computed values: ${Object.keys(omni.scope.computed).length}`
        );
        console.log(`  Charts: ${omni.scope.charts.length}`);

        const errors = omni.getFences().filter((f) => f.error);
        if (errors.length > 0) {
          console.log(`  Errors: ${errors.length}`);
          errors.forEach((f) => {
            console.log(`    - ${f.type}: ${f.error}`);
          });
        }
      }
    } catch (error) {
      console.error(
        "Error building document:",
        error instanceof Error ? error.message : String(error)
      );
      if (verbose && error instanceof Error) console.error(error.stack);
      process.exit(1);
    }
  });

program
  .command("watch")
  .description("Watch and rebuild on changes")
  .argument("<input>", "Input .omd file")
  .option("-o, --output <file>", "Output file path", "")
  .option("-v, --verbose", "Verbose output", false)
  .option("-t, --theme <theme>", "Theme: light, dark", "light")
  .option("--csp", "Enable Content Security Policy")
  .option("--base-path <path>", "Base path for include directives")
  .option("--allowed-domain <domain>", "Allowed domain for fetch (can be repeated)", (val, list: string[]) => { list.push(val); return list; }, [])
  .action(async (input: string, options) => {
    const verbose = options.verbose ?? false;
    const output = options.output || input.replace(/\.omd$/, ".html");
    const theme = options.theme;
    const csp = options.csp ?? false;

    if (!fs.existsSync(input)) {
      console.error(`Error: Input file not found: ${input}`);
      process.exit(1);
    }

    let watcher: chokidar.FSWatcher | null = null;
    let buildTimeout: NodeJS.Timeout | null = null;

    const build = async () => {
      if (buildTimeout) {
        clearTimeout(buildTimeout);
      }

      buildTimeout = setTimeout(async () => {
        try {
          if (verbose) console.log(`\n🔄 Building: ${input}`);

          const content = fs.readFileSync(input, "utf-8");
          const omni = new OmniLang({
            basePath: options.basePath || path.dirname(path.resolve(input)),
            allowedDomains: options.allowedDomain || [],
          });
          omni.parse(content);
          await omni.execute();

          const result = omni.toHtml({ theme: theme as "light" | "dark", csp: options.csp ?? false });
          fs.writeFileSync(output, result, "utf-8");

          console.log(`✓ Rebuilt: ${output}`);

          if (verbose) {
            const errors = omni.getFences().filter((f) => f.error);
            if (errors.length > 0) {
              errors.forEach((f) => {
                console.log(`  ⚠ ${f.type}: ${f.error}`);
              });
            }
          }
        } catch (error) {
          console.error(
            "Build error:",
            error instanceof Error ? error.message : String(error)
          );
        }
      }, 100);
    };

    console.log(`👀 Watching: ${input}`);
    console.log("Press Ctrl+C to stop\n");

    await build();

    watcher = chokidar.watch(input, {
      persistent: true,
      ignoreInitial: true,
    });

    watcher.on("change", async () => {
      console.log(`\n📝 File changed: ${input}`);
      await build();
    });

    watcher.on("error", (error) => {
      console.error("Watcher error:", error);
    });

    process.on("SIGINT", () => {
      console.log("\n\n👋 Stopping watcher...");
      if (watcher) {
        watcher.close();
      }
      process.exit(0);
    });
  });

program
  .command("validate")
  .description("Validate an OmniLang document")
  .argument("<input>", "Input .omd file")
  .option("-v, --verbose", "Verbose output", false)
  .action(async (input: string, options) => {
    const verbose = options.verbose ?? false;

    if (!fs.existsSync(input)) {
      console.error(`Error: Input file not found: ${input}`);
      process.exit(1);
    }

    try {
      const content = fs.readFileSync(input, "utf-8");
      const omni = new OmniLang();
      omni.parse(content);

      console.log(`Validating: ${input}\n`);

      let hasErrors = false;

      omni.getFences().forEach((fence, i) => {
        const issues: string[] = [];

        switch (fence.type) {
          case "data":
            if (!fence.attrs.name) {
              issues.push('Missing required attribute: name');
            }
            try {
              JSON.parse(fence.content);
            } catch (e) {
              issues.push(`Invalid JSON: ${e instanceof Error ? e.message : String(e)}`);
            }
            break;

          case "chart":
            if (!fence.attrs.data && !fence.content) {
              issues.push("Chart requires either data attribute or inline JSON");
            }
            if (
              fence.attrs.type &&
              !["bar", "line", "pie", "doughnut", "radar", "polarArea"].includes(
                fence.attrs.type
              )
            ) {
              issues.push(`Unknown chart type: ${fence.attrs.type}`);
            }
            break;

          case "compute":
          case "query":
            if (!fence.content.trim()) {
              issues.push(`Empty ${fence.type} block`);
            }
            break;
        }

        if (issues.length > 0) {
          hasErrors = true;
          console.log(`Fence ${i + 1} (${fence.type}):`);
          issues.forEach((issue) => console.log(`  ⚠ ${issue}`));
        } else if (verbose) {
          console.log(`Fence ${i + 1} (${fence.type}): ✓`);
        }
      });

      if (!hasErrors) {
        console.log("\n✓ Document is valid");
      } else {
        console.log("\n✗ Document has validation errors");
        process.exit(1);
      }
    } catch (error) {
      console.error(
        "Validation error:",
        error instanceof Error ? error.message : String(error)
      );
      process.exit(1);
    }
  });

program
  .command("init")
  .description("Create a new OmniLang project")
  .argument("[name]", "Project name", "my-project")
  .action(async (name: string) => {
    const projectDir = path.resolve(name);

    if (fs.existsSync(projectDir)) {
      console.error(`Error: Directory already exists: ${name}`);
      process.exit(1);
    }

    fs.mkdirSync(projectDir, { recursive: true });
    fs.mkdirSync(path.join(projectDir, "examples"), { recursive: true });
    fs.mkdirSync(path.join(projectDir, "data"), { recursive: true });

    const exampleContent = `# My Report

## Data

\`\`\`omni:data name="sales"
[
  {"product": "Widget A", "revenue": 1000, "region": "North"},
  {"product": "Widget B", "revenue": 1500, "region": "South"},
  {"product": "Widget C", "revenue": 800, "region": "North"}
]
\`\`\`

## Summary

Total Revenue: $\`omni:inline sum(data.sales, 'revenue')\`

## Charts

\`\`\`omni:chart type="bar" data="sales" x="product" y="revenue" title="Revenue by Product"
\`\`\`

---

*Generated with OmniLang*
`;

    fs.writeFileSync(
      path.join(projectDir, "examples", "example.omd"),
      exampleContent
    );

    console.log(`✓ Created OmniLang project: ${name}`);
    console.log(`\nNext steps:`);
    console.log(`  cd ${name}`);
    console.log(`  npm install`);
    console.log(`  omni build examples/example.omd`);
  });

program.parse();
