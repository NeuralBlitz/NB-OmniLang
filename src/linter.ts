import type { Fence, LintRule, LintResult, LintConfig, FenceAttributes } from "./types.js";

export class Linter {
  private rules: Map<string, LintRule> = new Map();
  private config: LintConfig = {
    rules: {},
  };

  constructor(config: LintConfig = { rules: {} }) {
    this.config = config;
    this.registerBuiltInRules();
  }

  private registerBuiltInRules(): void {
    this.registerRule({
      id: "OM001",
      name: "no-unnamed-data",
      severity: "warning",
      description: "Data fences should have a name for easier reference",
      message: "Consider adding a name attribute to the data fence",
    });

    this.registerRule({
      id: "OM002",
      name: "no-unsafe-eval",
      severity: "error",
      description: "Avoid using eval in compute blocks",
      message: "Using eval() is a security risk. Consider rewriting without eval",
    });

    this.registerRule({
      id: "OM003",
      name: "no-missing-name",
      severity: "error",
      description: "Fences that store data should have a name",
      message: 'Missing required "name" attribute',
    });

    this.registerRule({
      id: "OM004",
      name: "no-empty-data",
      severity: "warning",
      description: "Data fence should not be empty",
      message: "Data fence has no content",
    });

    this.registerRule({
      id: "OM005",
      name: "no-invalid-json",
      severity: "error",
      description: "JSON data must be valid",
      message: "Invalid JSON syntax",
    });

    this.registerRule({
      id: "OM006",
      name: "no-undefined-data",
      severity: "error",
      description: "Reference to undefined data source",
      message: "Referenced data source '{{name}}' is not defined",
    });

    this.registerRule({
      id: "OM007",
      name: "no-suspicious-name",
      severity: "warning",
      description: "Suspicious fence name that might cause issues",
      message: "Fence name '{{name}}' may conflict with built-in functions",
    });

    this.registerRule({
      id: "OM008",
      name: "no-circular-dependency",
      severity: "error",
      description: "Circular dependency detected in data/computed blocks",
      message: "Circular dependency: {{chain}}",
    });

    this.registerRule({
      id: "OM009",
      name: "no-mixed-content",
      severity: "info",
      description: "Mixed content in fetch (http vs https)",
      message: "Use HTTPS for secure data fetching",
    });

    this.registerRule({
      id: "OM010",
      name: "no-hardcoded-credentials",
      severity: "error",
      description: "Potential hardcoded credentials detected",
      message: "Avoid hardcoding credentials in documents",
    });

    this.registerRule({
      id: "OM011",
      name: "no-unsafe-html",
      severity: "warning",
      description: "Potentially unsafe HTML content",
      message: "Content may contain unsafe HTML",
    });

    this.registerRule({
      id: "OM012",
      name: "no-missing-alt",
      severity: "warning",
      description: "Image without alt text",
      message: "Images should have alt text for accessibility",
    });

    this.registerRule({
      id: "OM013",
      name: "no-empty-compute",
      severity: "warning",
      description: "Compute block is empty",
      message: "Compute fence has no computation logic",
    });

    this.registerRule({
      id: "OM014",
      name: "no-deep-nesting",
      severity: "info",
      description: "Deep nesting of fences may reduce readability",
      message: "Consider reducing fence nesting depth",
    });

    this.registerRule({
      id: "OM015",
      name: "no-unsupported-chart-type",
      severity: "error",
      description: "Chart type is not supported",
      message: "Unsupported chart type: {{type}}",
    });
  }

  registerRule(rule: LintRule): void {
    this.rules.set(rule.id, rule);
  }

  lint(fences: Fence[], content: string): LintResult {
    const errors: LintRule[] = [];
    const warnings: LintRule[] = [];
    const info: LintRule[] = [];

    const dataNames = new Set<string>();
    const computedNames = new Set<string>();
    const definedNames = new Set<string>();

    for (const fence of fences) {
      if (fence.type === "data" && fence.attrs.name) {
        dataNames.add(fence.attrs.name);
        definedNames.add(fence.attrs.name);
      }
      if (fence.type === "compute" && fence.attrs.name) {
        computedNames.add(fence.attrs.name);
        definedNames.add(fence.attrs.name);
      }
      if (fence.type === "query" && fence.attrs.name) {
        computedNames.add(fence.attrs.name);
        definedNames.add(fence.attrs.name);
      }
    }

    for (const fence of fences) {
      const issues = this.lintFence(fence, definedNames, dataNames, content);
      for (const issue of issues) {
        if (issue.severity === "error") {
          errors.push(issue);
        } else if (issue.severity === "warning") {
          warnings.push(issue);
        } else {
          info.push(issue);
        }
      }
    }

    const circularDeps = this.checkCircularDependencies(fences, dataNames, computedNames);
    for (const dep of circularDeps) {
      errors.push({
        ...this.rules.get("OM008")!,
        message: `Circular dependency: ${dep}`,
        metadata: { chain: dep },
      });
    }

    return {
      filePath: "document.omd",
      errors,
      warnings,
      info,
      fixable: 0,
    };
  }

  private lintFence(
    fence: Fence,
    definedNames: Set<string>,
    dataNames: Set<string>,
    content: string
  ): LintRule[] {
    const issues: LintRule[] = [];

    if (fence.type === "data") {
      if (!fence.attrs.name) {
        if (this.isRuleEnabled("OM003")) {
          issues.push({
            ...this.rules.get("OM003")!,
            line: fence.line,
            column: fence.column,
          });
        }
      } else {
        if (this.isRuleEnabled("OM001") && fence.content.trim().length > 100) {
          issues.push({
            ...this.rules.get("OM001")!,
            line: fence.line,
            column: fence.column,
          });
        }

        const suspiciousNames = ["length", "prototype", "constructor", "toString"];
        if (
          this.isRuleEnabled("OM007") &&
          suspiciousNames.includes(fence.attrs.name)
        ) {
          issues.push({
            ...this.rules.get("OM007")!,
            message: `Fence name '${fence.attrs.name}' may conflict with built-in functions`,
            line: fence.line,
            column: fence.column,
            metadata: { name: fence.attrs.name },
          });
        }
      }

      if (this.isRuleEnabled("OM004") && !fence.content.trim()) {
        issues.push({
          ...this.rules.get("OM004")!,
          line: fence.line,
          column: fence.column,
        });
      }

      if (this.isRuleEnabled("OM005")) {
        try {
          JSON.parse(fence.content);
        } catch {
          issues.push({
            ...this.rules.get("OM005")!,
            line: fence.line,
            column: fence.column,
          });
        }
      }

      if (this.isRuleEnabled("OM010")) {
        const credPatterns = [
          /password\s*[:=]\s*["'][^"']+["']/i,
          /api[_-]?key\s*[:=]\s*["'][^"']+["']/i,
          /secret\s*[:=]\s*["'][^"']+["']/i,
          /token\s*[:=]\s*["'][^"']+["']/i,
        ];
        for (const pattern of credPatterns) {
          if (pattern.test(fence.content)) {
            issues.push({
              ...this.rules.get("OM010")!,
              line: fence.line,
              column: fence.column,
            });
            break;
          }
        }
      }
    }

    if (fence.type === "compute") {
      if (this.isRuleEnabled("OM002")) {
        if (fence.content.includes("eval(")) {
          issues.push({
            ...this.rules.get("OM002")!,
            line: fence.line,
            column: fence.column,
          });
        }
      }

      if (this.isRuleEnabled("OM013") && !fence.content.trim()) {
        issues.push({
          ...this.rules.get("OM013")!,
          line: fence.line,
          column: fence.column,
        });
      }

      const dataRefRegex = /data\.(\w+)/g;
      let match;
      while ((match = dataRefRegex.exec(fence.content)) !== null) {
        if (!dataNames.has(match[1])) {
          issues.push({
            ...this.rules.get("OM006")!,
            message: `Referenced data source '${match[1]}' is not defined`,
            line: fence.line,
            column: fence.column,
            metadata: { name: match[1] },
          });
        }
      }
    }

    if (fence.type === "chart") {
      const supportedTypes = ["bar", "line", "pie", "doughnut", "radar", "polarArea", "scatter", "bubble"];
      if (
        this.isRuleEnabled("OM015") &&
        fence.attrs.type &&
        !supportedTypes.includes(fence.attrs.type)
      ) {
        issues.push({
          ...this.rules.get("OM015")!,
          message: `Unsupported chart type: ${fence.attrs.type}`,
          line: fence.line,
          column: fence.column,
          metadata: { type: fence.attrs.type },
        });
      }

      if (this.isRuleEnabled("OM006") && fence.attrs.data && !definedNames.has(fence.attrs.data)) {
        issues.push({
          ...this.rules.get("OM006")!,
          message: `Referenced data source '${fence.attrs.data}' is not defined`,
          line: fence.line,
          column: fence.column,
          metadata: { name: fence.attrs.data },
        });
      }
    }

    if (fence.type === "fetch" || fence.type === "http") {
      if (this.isRuleEnabled("OM009")) {
        const url = fence.attrs.url || fence.attrs.src;
        if (url && url.startsWith("http://")) {
          issues.push({
            ...this.rules.get("OM009")!,
            line: fence.line,
            column: fence.column,
          });
        }
      }
    }

    return issues;
  }

  private checkCircularDependencies(
    fences: Fence[],
    dataNames: Set<string>,
    computedNames: Set<string>
  ): string[] {
    const deps = new Map<string, Set<string>>();

    for (const fence of fences) {
      if (fence.type === "compute" && fence.attrs.name) {
        const name = fence.attrs.name;
        const fenceDeps = new Set<string>();

        const dataRefRegex = /data\.(\w+)/g;
        let match;
        while ((match = dataRefRegex.exec(fence.content)) !== null) {
          fenceDeps.add(match[1]);
        }

        const computedRefRegex = /computed\.(\w+)/g;
        while ((match = computedRefRegex.exec(fence.content)) !== null) {
          fenceDeps.add(match[1]);
        }

        deps.set(name, fenceDeps);
      }
    }

    const circular: string[] = [];
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const visit = (node: string, path: string[]): void => {
      if (recursionStack.has(node)) {
        circular.push([...path, node].join(" -> "));
        return;
      }
      if (visited.has(node)) return;

      visited.add(node);
      recursionStack.add(node);

      const nodeDeps = deps.get(node);
      if (nodeDeps) {
        for (const dep of nodeDeps) {
          visit(dep, [...path, node]);
        }
      }

      recursionStack.delete(node);
    };

    for (const [name] of deps) {
      visit(name, []);
    }

    return circular;
  }

  private isRuleEnabled(ruleId: string): boolean {
    const rule = this.rules.get(ruleId);
    if (!rule) return false;

    const configRule = this.config.rules[ruleId] || this.config.rules[rule.name];
    if (configRule === "off") return false;
    if (configRule === "error" || configRule === "warning" || configRule === "info") {
      return true;
    }

    return rule.severity !== "info";
  }

  static getDefaultConfig(): LintConfig {
    return {
      rules: {
        OM001: "warning",
        OM002: "error",
        OM003: "error",
        OM004: "warning",
        OM005: "error",
        OM006: "error",
        OM007: "warning",
        OM008: "error",
        OM009: "info",
        OM010: "error",
        OM011: "warning",
        OM012: "warning",
        OM013: "warning",
        OM014: "info",
        OM015: "error",
      },
    };
  }
}

export default Linter;
