import type { Fence, InlineExpression, Scope, OmniLangOptions, RenderOptions, Chart } from "./types.js";
export declare class OmniLangError extends Error {
    code?: string;
    fence?: Fence;
    constructor(message: string, code?: string, fence?: Fence);
}
export declare class ExecutionError extends OmniLangError {
    constructor(message: string, fence?: Fence);
}
export declare class ParseError extends OmniLangError {
    constructor(message: string);
}
export declare class ValidationError extends OmniLangError {
    constructor(message: string, fence?: Fence);
}
export declare class OmniLang {
    private fences;
    private inlineExpressions;
    private markdown;
    private dependencies;
    private options;
    private plugins;
    readonly scope: Scope;
    constructor(options?: OmniLangOptions);
    registerPlugin(plugin: import("./types.js").Plugin): this;
    getPlugins(): import("./types.js").Plugin[];
    hasPlugin(name: string): boolean;
    parse(markdown: string): this;
    private parseAttributes;
    private analyzeDependencies;
    execute(): Promise<this>;
    private executeFence;
    private createExecutionContext;
    execute_data(fence: Fence): {
        stored: string;
        records: number;
    };
    execute_compute(fence: Fence): unknown;
    execute_chart(fence: Fence): {
        chartId: string;
        config: Chart["config"];
    };
    execute_yaml(fence: Fence): Promise<{
        stored: string;
        records: number;
    }>;
    execute_csv(fence: Fence): Promise<{
        stored: string;
        records: number;
    }>;
    execute_query(fence: Fence): unknown;
    execute_table(fence: Fence): string;
    execute_fetch(fence: Fence): Promise<{
        stored: string;
        records: number;
    }>;
    execute_include(fence: Fence): {
        included: string;
        length: number;
    };
    execute_http(fence: Fence): unknown;
    private escapeHtml;
    private evaluateInline;
    render(): string;
    private renderFence;
    private markdownToHtml;
    toHtml(options?: RenderOptions): string;
    private getDarkStyles;
    private generateChartScript;
    getFences(): Fence[];
    getInlineExpressions(): InlineExpression[];
    validate(): {
        valid: boolean;
        errors: string[];
    };
}
export default OmniLang;
//# sourceMappingURL=index.d.ts.map