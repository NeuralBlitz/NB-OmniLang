import type { Fence, LintRule, LintResult, LintConfig } from "./types.js";
export declare class Linter {
    private rules;
    private config;
    constructor(config?: LintConfig);
    private registerBuiltInRules;
    registerRule(rule: LintRule): void;
    lint(fences: Fence[], content: string): LintResult;
    private lintFence;
    private checkCircularDependencies;
    private isRuleEnabled;
    static getDefaultConfig(): LintConfig;
}
export default Linter;
//# sourceMappingURL=linter.d.ts.map