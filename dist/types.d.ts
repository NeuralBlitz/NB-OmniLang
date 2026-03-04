export interface OmniLangOptions {
    strict?: boolean;
    timeout?: number;
    maxMemory?: number;
    basePath?: string;
    fetchTimeout?: number;
    allowedDomains?: string[];
    plugins?: Plugin[];
    maxExecutionTime?: number;
    maxDataSize?: number;
    enableSandbox?: boolean;
}
export interface FenceAttributes {
    name?: string;
    type?: string;
    data?: string;
    x?: string;
    y?: string;
    title?: string;
    src?: string;
    url?: string;
    method?: string;
    headers?: string;
    body?: string;
    timeout?: string;
    retries?: string;
    [key: string]: string | undefined;
}
export interface Fence {
    type: string;
    attrs: FenceAttributes;
    content: string;
    position: number;
    fullMatch: string;
    result?: unknown;
    executed?: boolean;
    error?: string;
    line?: number;
    column?: number;
    warnings?: string[];
}
export interface InlineExpression {
    expression: string;
    position: number;
    fullMatch: string;
    line?: number;
    column?: number;
}
export interface ChartConfig {
    type: string;
    title: string;
    data: unknown;
    x?: string;
    y?: string;
}
export interface Chart {
    id: string;
    config: ChartConfig;
}
export interface Scope {
    data: Record<string, unknown>;
    computed: Record<string, unknown>;
    charts: Chart[];
    functions: Record<string, CallableFunction>;
    variables: Record<string, unknown>;
}
export interface ExecutionContext {
    data: Record<string, any>;
    computed: Record<string, any>;
    Math: any;
    JSON: any;
    Array: any;
    Object: any;
    String: any;
    Number: any;
    Date: any;
    Set: any;
    Map: any;
    RegExp: any;
    Error: any;
    parseInt: any;
    parseFloat: any;
    isNaN: any;
    isFinite: any;
    encodeURIComponent: any;
    decodeURIComponent: any;
    console: any;
    len: any;
    sum: any;
    avg: any;
    max: any;
    min: any;
    filter: any;
    map: any;
    groupBy: any;
    sort: any;
    unique: any;
    flatten: any;
    pick: any;
    omit: any;
    merge: any;
    debounce: any;
    throttle: any;
    sleep: any;
    reduce: any;
    find: any;
    includes: any;
    startsWith: any;
    endsWith: any;
    truncate: any;
    capitalize: any;
    camelCase: any;
    snakeCase: any;
    kebabCase: any;
    uuid: any;
    now: any;
    formatDate: any;
    parseDate: any;
}
export interface ParseResult {
    fences: Fence[];
    inlineExpressions: InlineExpression[];
    markdown: string;
    ast?: ASTNode[];
}
export interface ExecutionResult {
    scope: Scope;
    fences: Fence[];
    errors: Fence[];
    warnings: string[];
    executionTime: number;
}
export interface RenderOptions {
    includeStyles?: boolean;
    includeScripts?: boolean;
    theme?: "light" | "dark";
    csp?: boolean;
    minify?: boolean;
    sourceMap?: boolean;
}
export type FenceHandler = (fence: Fence) => Promise<unknown> | unknown;
export type DataFormat = "json" | "yaml" | "csv" | "toml";
export interface DataFormatParser {
    parse(content: string): unknown;
    stringify(data: unknown): string;
}
export interface Plugin {
    name: string;
    version: string;
    description?: string;
    author?: string;
    hooks?: {
        beforeParse?: (markdown: string) => string | Promise<string>;
        afterParse?: (ast: {
            fences: Fence[];
            inlineExpressions: InlineExpression[];
        }) => void;
        beforeExecute?: (fence: Fence) => Fence | Promise<Fence>;
        afterExecute?: (fence: Fence) => void;
        beforeRender?: (html: string) => string | Promise<string>;
        afterRender?: (html: string) => string | Promise<string>;
    };
    fences?: {
        [key: string]: FenceHandler;
    };
    helpers?: {
        [key: string]: (...args: unknown[]) => unknown;
    };
}
export interface FetchOptions {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
    timeout?: number;
    retries?: number;
}
export interface CacheEntry<T> {
    data: T;
    expires: number;
}
export interface BuildCache {
    get<T>(key: string): T | undefined;
    set<T>(key: string, data: T, ttl: number): void;
    clear(): void;
    has(key: string): boolean;
}
export interface LintRule {
    id: string;
    name: string;
    severity: "error" | "warning" | "info" | "off";
    description: string;
    message?: string;
    line?: number;
    column?: number;
    endLine?: number;
    endColumn?: number;
    fix?: () => string;
    metadata?: Record<string, unknown>;
}
export interface LintConfig {
    rules: Record<string, any>;
    plugins?: string[];
    extends?: string[];
}
export interface LintResult {
    filePath: string;
    errors: LintRule[];
    warnings: LintRule[];
    info: LintRule[];
    fixable: number;
    fixed?: string;
}
export interface ASTNode {
    type: string;
    value?: string;
    name?: string;
    body?: ASTNode[];
    params?: ASTNode[];
    arguments?: ASTNode[];
    left?: ASTNode;
    right?: ASTNode;
    operator?: string;
    callee?: ASTNode;
    raw?: string;
    start: number;
    end: number;
    loc?: {
        start: {
            line: number;
            column: number;
        };
        end: {
            line: number;
            column: number;
        };
    };
}
export interface Token {
    type: string;
    value: string;
    start: number;
    end: number;
    loc?: {
        start: {
            line: number;
            column: number;
        };
        end: {
            line: number;
            column: number;
        };
    };
}
export interface TokenizerOptions {
    tokens?: boolean;
    comments?: boolean;
    regex?: boolean;
}
export interface ParserOptions {
    sourceType?: "script" | "module";
    ecmaVersion?: number;
    allowReserved?: boolean;
    allowImportExportEverywhere?: boolean;
}
export interface CompilerOptions {
    sourceMap?: boolean;
    minify?: boolean;
    target?: "es5" | "es2015" | "es2020" | "esnext";
    format?: "cjs" | "esm" | "iife";
    externals?: string[];
}
export interface CompilerResult {
    code: string;
    map?: string;
    ast?: ASTNode;
    tokens?: Token[];
}
export interface RuntimeValue {
    type: string;
    value: unknown;
    scope?: string;
}
export interface Breakpoint {
    id: string;
    line: number;
    column?: number;
    condition?: string;
    enabled: boolean;
}
export interface DebugSession {
    id: string;
    breakpoints: Breakpoint[];
    variables: Map<string, RuntimeValue>;
    callStack: Array<{
        name: string;
        line: number;
    }>;
    currentLine?: number;
}
export interface NLPIntent {
    name: string;
    confidence: number;
    entities: Record<string, string>;
    raw: string;
}
export interface NLPEntity {
    type: string;
    value: string;
    start: number;
    end: number;
    confidence: number;
}
export interface NLPResult {
    intents: NLPIntent[];
    entities: NLPEntity[];
    sentiment?: "positive" | "negative" | "neutral";
    action?: string;
    code?: string;
    explanation?: string;
}
export interface PackageManifest {
    name: string;
    version: string;
    description?: string;
    main?: string;
    module?: string;
    types?: string;
    exports?: Record<string, string>;
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
    scripts?: Record<string, string>;
    omnilang?: {
        fences?: Record<string, string>;
        helpers?: Record<string, string>;
        hooks?: string[];
    };
}
export interface InstallResult {
    success: boolean;
    packages: string[];
    errors: string[];
    warnings: string[];
}
//# sourceMappingURL=types.d.ts.map