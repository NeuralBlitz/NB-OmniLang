import type {
  Fence,
  InlineExpression,
  Scope,
  FenceAttributes,
  ExecutionContext,
  OmniLangOptions,
  RenderOptions,
  Chart,
} from "./types.js";

export class OmniLangError extends Error {
  constructor(
    message: string,
    public code?: string,
    public fence?: Fence
  ) {
    super(message);
    this.name = "OmniLangError";
  }
}

export class ExecutionError extends OmniLangError {
  constructor(message: string, fence?: Fence) {
    super(message, "EXECUTION_ERROR", fence);
    this.name = "ExecutionError";
  }
}

export class ParseError extends OmniLangError {
  constructor(message: string) {
    super(message, "PARSE_ERROR");
    this.name = "ParseError";
  }
}

export class ValidationError extends OmniLangError {
  constructor(message: string, fence?: Fence) {
    super(message, "VALIDATION_ERROR", fence);
    this.name = "ValidationError";
  }
}

const FENCE_REGEX = /```omni:(\w+)(?:\s+([^\n]+))?\n([\s\S]*?)```/g;
const INLINE_REGEX = /```omni:inline\s+(.+?)```/g;
const ATTR_REGEX = /(\w+)="([^"]*)"|(\w+)=(\S+)/g;
const REF_REGEX = /\b(data|computed)\.(\w+)\b/g;

export class OmniLang {
  private fences: Fence[] = [];
  private inlineExpressions: InlineExpression[] = [];
  private markdown: string = "";
  private dependencies: Map<Fence, Set<string>> = new Map();
  private options: OmniLangOptions;
  private plugins: import("./types.js").Plugin[] = [];
  private parseId: number = 0;

  readonly scope: Scope = {
    data: {},
    computed: {},
    charts: [],
    functions: {},
    variables: {},
  };

  constructor(options: OmniLangOptions = {}) {
    this.options = {
      strict: false,
      timeout: 5000,
      maxMemory: 100_000_000,
      fetchTimeout: 10000,
      ...options,
    };

    if (this.options.plugins) {
      for (const plugin of this.options.plugins) {
        this.registerPlugin(plugin);
      }
    }
  }

  registerPlugin(plugin: import("./types.js").Plugin): this {
    if (!plugin.name || !plugin.version) {
      throw new ValidationError("Plugin must have name and version");
    }

    this.plugins.push(plugin);

    if (plugin.helpers) {
      for (const [name, fn] of Object.entries(plugin.helpers)) {
        this.scope.functions[name] = fn;
      }
    }

    return this;
  }

  getPlugins(): import("./types.js").Plugin[] {
    return [...this.plugins];
  }

  hasPlugin(name: string): boolean {
    return this.plugins.some((p) => p.name === name);
  }

  parse(markdown: string): this {
    this.fences = [];
    this.inlineExpressions = [];
    this.markdown = markdown;
    this.parseId++;

    let match: RegExpExecArray | null;

    while ((match = FENCE_REGEX.exec(markdown)) !== null) {
      const [, type, attrs, content] = match;

      if (type === "inline") continue;

      const fence: Fence = {
        type,
        attrs: this.parseAttributes(attrs || ""),
        content: content.trim(),
        position: match.index,
        fullMatch: match[0],
      };

      this.fences.push(fence);
    }

    FENCE_REGEX.lastIndex = 0;

    while ((match = INLINE_REGEX.exec(markdown)) !== null) {
      this.inlineExpressions.push({
        expression: match[1],
        position: match.index,
        fullMatch: match[0],
      });
    }

    INLINE_REGEX.lastIndex = 0;

    return this;
  }

  private parseAttributes(attrString: string): FenceAttributes {
    const attrs: FenceAttributes = {};
    let match: RegExpExecArray | null;

    while ((match = ATTR_REGEX.exec(attrString)) !== null) {
      const key = match[1] || match[3];
      const value = match[2] !== undefined ? match[2] : match[4];
      if (key) attrs[key] = value;
    }

    ATTR_REGEX.lastIndex = 0;

    return attrs;
  }

  private analyzeDependencies(): void {
    this.dependencies.clear();

    for (const fence of this.fences) {
      const deps = new Set<string>();

      let match: RegExpExecArray | null;
      while ((match = REF_REGEX.exec(fence.content)) !== null) {
        deps.add(match[2]);
      }
      REF_REGEX.lastIndex = 0;

      if (fence.attrs.data) {
        deps.add(fence.attrs.data);
      }

      this.dependencies.set(fence, deps);
    }
  }

  async execute(): Promise<this> {
    this.analyzeDependencies();

    for (const fence of this.fences) {
      await this.executeFence(fence);
    }

    return this;
  }

  private async executeFence(fence: Fence): Promise<void> {
    const handler = this[`execute_${fence.type}` as keyof this] as (
      fence: Fence
    ) => unknown;

    if (typeof handler !== "function") {
      fence.error = `Unknown fence type: ${fence.type}`;
      if (this.options.strict) {
        throw new ValidationError(fence.error, fence);
      }
      return;
    }

    try {
      const timeoutMs = this.options.timeout || 5000;
      const result = await Promise.race([
        handler.call(this, fence),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error(`Execution timeout after ${timeoutMs}ms`)), timeoutMs)
        )
      ]);
      fence.result = result;
      fence.executed = true;
    } catch (error) {
      fence.error =
        error instanceof Error ? error.message : String(error);
      if (this.options.strict) {
        throw new ExecutionError(fence.error, fence);
      }
    }
  }

  private createExecutionContext(): ExecutionContext {
    const context: Partial<ExecutionContext> = {
      data: this.scope.data,
      computed: this.scope.computed,
      Math,
      JSON,
      Array,
      Object,
      String,
      Number,
      Date,
      Set,
      Map,
      RegExp,
      Error,
      parseInt,
      parseFloat,
      isNaN,
      isFinite,
      encodeURIComponent,
      decodeURIComponent,
      console,
      len: (arr: unknown[]) => (arr ? arr.length : 0),
      sum: (arr: unknown[], key?: string) => {
        if (!arr) return 0;
        if (key)
          return arr.reduce(
            (sum: number, item) =>
              sum + (Number((item as Record<string, unknown>)[key]) || 0),
            0
          );
        return arr.reduce((sum: number, val) => sum + Number(val), 0);
      },
      avg: (arr: unknown[], key?: string) => {
        const total = context.sum!(arr, key);
        return total / context.len!(arr);
      },
      max: (arr: unknown[], key?: string) => {
        if (!arr || arr.length === 0) return null;
        if (key)
          return Math.max(
            ...arr.map(
              (item) =>
                Number((item as Record<string, unknown>)[key]) || 0
            )
          );
        return Math.max(...arr.map(Number));
      },
      min: (arr: unknown[], key?: string) => {
        if (!arr || arr.length === 0) return null;
        if (key)
          return Math.min(
            ...arr.map(
              (item) =>
                Number((item as Record<string, unknown>)[key]) || 0
            )
          );
        return Math.min(...arr.map(Number));
      },
      filter: <T>(arr: T[], fn: (item: T) => boolean): T[] =>
        arr ? arr.filter(fn) : [],
      map: <T, U>(arr: T[], fn: (item: T) => U): U[] =>
        arr ? arr.map(fn) : [],
      groupBy: <T extends Record<string, unknown>>(
        arr: T[],
        key: string
      ): Record<string, T[]> => {
        if (!arr) return {};
        return arr.reduce((groups, item) => {
          const groupKey = String(item[key]);
          if (!groups[groupKey]) groups[groupKey] = [];
          groups[groupKey].push(item);
          return groups;
        }, {} as Record<string, T[]>);
      },
      sort: <T>(arr: T[], key?: string, direction: "asc" | "desc" = "asc"): T[] => {
        if (!arr) return [];
        const sorted = [...arr].sort((a, b) => {
          const aVal = key ? (a as Record<string, unknown>)[key] : a;
          const bVal = key ? (b as Record<string, unknown>)[key] : b;
          if (typeof aVal === "number" && typeof bVal === "number") {
            return aVal - bVal;
          }
          return String(aVal).localeCompare(String(bVal), undefined, { numeric: true });
        });
        return direction === "desc" ? sorted.reverse() : sorted;
      },
      unique: <T>(arr: T[], key?: string): T[] => {
        if (!arr) return [];
        if (!key) return [...new Set(arr)] as T[];
        const seen = new Set();
        return arr.filter((item) => {
          const val = (item as Record<string, unknown>)[key];
          if (seen.has(val)) return false;
          seen.add(val);
          return true;
        });
      },
      flatten: <T>(arr: unknown[]): T[] => {
        if (!arr) return [];
        return arr.flat(Infinity) as T[];
      },
      pick: <T extends Record<string, unknown>, K extends keyof T>(
        obj: T,
        keys: K[]
      ): Pick<T, K> => {
        const result = {} as Pick<T, K>;
        for (const key of keys) {
          if (key in obj) result[key] = obj[key];
        }
        return result;
      },
      omit: <T extends Record<string, unknown>, K extends keyof T>(
        obj: T,
        keys: K[]
      ): Omit<T, K> => {
        const result = { ...obj };
        for (const key of keys) {
          delete result[key];
        }
        return result as Omit<T, K>;
      },
      merge: <T extends Record<string, unknown>>(...objects: T[]): T => {
        return Object.assign({}, ...objects);
      },
      debounce: <T extends (...args: unknown[]) => unknown>(
        fn: T,
        _ms: number
      ): T => {
        let timeout: NodeJS.Timeout | null = null;
        return ((...args: unknown[]) => {
          if (timeout) clearTimeout(timeout);
          timeout = setTimeout(() => fn(...args), _ms);
        }) as T;
      },
      throttle: <T extends (...args: unknown[]) => unknown>(
        fn: T,
        _ms: number
      ): T => {
        let lastCall = 0;
        return ((...args: unknown[]) => {
          const now = Date.now();
          if (now - lastCall >= _ms) {
            lastCall = now;
            fn(...args);
          }
        }) as T;
      },
      sleep: (ms: number): Promise<void> => {
        return new Promise((resolve) => setTimeout(resolve, ms));
      },
      now: () => Date.now(),
      formatDate: (date: Date | number, format?: string): string => {
        const d = typeof date === "number" ? new Date(date) : date;
        if (!format) {
          return d.toISOString();
        }
        return format
          .replace("YYYY", String(d.getFullYear()))
          .replace("MM", String(d.getMonth() + 1).padStart(2, "0"))
          .replace("DD", String(d.getDate()).padStart(2, "0"))
          .replace("HH", String(d.getHours()).padStart(2, "0"))
          .replace("mm", String(d.getMinutes()).padStart(2, "0"))
          .replace("ss", String(d.getSeconds()).padStart(2, "0"));
      },
      parseDate: (str: string): Date => {
        return new Date(str);
      },
      reduce: <T, U>(arr: T[], fn: (acc: U, item: T, idx: number) => U, init: U): U => {
        if (!arr) return init;
        return arr.reduce(fn, init);
      },
      find: <T>(arr: T[], fn: (item: T) => boolean): T | undefined => {
        if (!arr) return undefined;
        return arr.find(fn);
      },
      includes: <T>(arr: T[], val: T): boolean => {
        if (!arr) return false;
        return arr.includes(val);
      },
      startsWith: (str: string, sub: string): boolean => {
        if (!str) return false;
        return str.startsWith(sub);
      },
      endsWith: (str: string, sub: string): boolean => {
        if (!str) return false;
        return str.endsWith(sub);
      },
      truncate: (str: string, len: number): string => {
        if (!str || str.length <= len) return str;
        return str.substring(0, len) + "...";
      },
      capitalize: (str: string): string => {
        if (!str) return "";
        return str.charAt(0).toUpperCase() + str.slice(1);
      },
      camelCase: (str: string): string => {
        if (!str) return "";
        return str.replace(/[-_\s]+(.)?/g, (_, c) => c ? c.toUpperCase() : "").replace(/^[A-Z]/, (c) => c.toLowerCase());
      },
      snakeCase: (str: string): string => {
        if (!str) return "";
        return str.replace(/[A-Z]/g, (c) => "_" + c.toLowerCase()).replace(/^[a-z]/, (c) => c.toUpperCase());
      },
      kebabCase: (str: string): string => {
        if (!str) return "";
        return str.replace(/[A-Z]/g, (c) => "-" + c.toLowerCase()).replace(/^[a-z]/, (c) => c.toLowerCase());
      },
      uuid: (): string => {
        return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
          const r = (Math.random() * 16) | 0;
          const v = c === "x" ? r : (r & 0x3) | 0x8;
          return v.toString(16);
        });
      },
      random: (min?: number, max?: number): number => {
        if (min === undefined) return Math.random();
        const lo = min;
        const hi = max ?? min + 100;
        return Math.floor(Math.random() * (hi - lo + 1)) + lo;
      },
      randomInt: (min: number, max: number): number => {
        return Math.floor(Math.random() * (max - min + 1)) + min;
      },
      randomItem: <T>(arr: T[]): T | undefined => {
        if (!arr || arr.length === 0) return undefined;
        return arr[Math.floor(Math.random() * arr.length)];
      },
      shuffle: <T>(arr: T[]): T[] => {
        if (!arr) return [];
        const result = [...arr];
        for (let i = result.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [result[i], result[j]] = [result[j], result[i]];
        }
        return result;
      },
      groupBy: <T>(arr: T[], key: keyof T | ((item: T) => string)): Record<string, T[]> => {
        if (!arr) return {};
        return arr.reduce((acc, item) => {
          const group = typeof key === "function" ? key(item) : String(item[key]);
          (acc[group] = acc[group] || []).push(item);
          return acc;
        }, {} as Record<string, T[]>);
      },
      uniq: <T>(arr: T[]): T[] => {
        if (!arr) return [];
        return [...new Set(arr)];
      },
      uniqBy: <T>(arr: T[], fn: (item: T) => unknown): T[] => {
        if (!arr) return [];
        const seen = new Set();
        return arr.filter((item) => {
          const key = fn(item);
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
      },
      chunk: <T>(arr: T[], size: number): T[][] => {
        if (!arr || size <= 0) return [];
        const result: T[][] = [];
        for (let i = 0; i < arr.length; i += size) {
          result.push(arr.slice(i, i + size));
        }
        return result;
      },
      flatten: <T>(arr: unknown[]): T[] => {
        if (!arr) return [];
        return arr.flatMap((item) => (Array.isArray(item) ? item : [item])) as T[];
      },
      deepGet: (obj: unknown, path: string, defaultValue?: unknown): unknown => {
        const keys = path.split(".");
        let current = obj;
        for (const key of keys) {
          if (current === null || current === undefined) return defaultValue;
          current = (current as Record<string, unknown>)[key];
        }
        return current ?? defaultValue;
      },
      deepSet: (obj: Record<string, unknown>, path: string, value: unknown): void => {
        const keys = path.split(".");
        const lastKey = keys.pop()!;
        let current = obj;
        for (const key of keys) {
          if (!(key in current) || typeof current[key] !== "object") {
            current[key] = {};
          }
          current = current[key] as Record<string, unknown>;
        }
        current[lastKey] = value;
      },
      pick: <T extends Record<string, unknown>>(obj: T, keys: string[]): Partial<T> => {
        if (!obj) return {};
        const result: Partial<T> = {};
        for (const key of keys) {
          if (key in obj) result[key] = obj[key];
        }
        return result;
      },
      omit: <T extends Record<string, unknown>>(obj: T, keys: string[]): Partial<T> => {
        if (!obj) return {};
        const result = { ...obj };
        for (const key of keys) delete result[key];
        return result;
      },
      merge: <T extends Record<string, unknown>>(...objs: Partial<T>[]): T => {
        return Object.assign({}, ...objs);
      },
      debounce: <T extends (...args: unknown[]) => unknown>(
        fn: T,
        ms: number
      ): ((...args: Parameters<T>) => void) => {
        let timeoutId: ReturnType<typeof setTimeout>;
        return (...args: Parameters<T>) => {
          clearTimeout(timeoutId);
          timeoutId = setTimeout(() => fn(...args), ms);
        };
      },
      throttle: <T extends (...args: unknown[]) => unknown>(
        fn: T,
        ms: number
      ): ((...args: Parameters<T>) => void) => {
        let lastCall = 0;
        return (...args: Parameters<T>) => {
          const now = Date.now();
          if (now - lastCall >= ms) {
            lastCall = now;
            fn(...args);
          }
        };
      },
      memoize: <T extends (...args: unknown[]) => unknown>(
        fn: T
      ): ((...args: Parameters<T>) => ReturnType<T>) => {
        const cache = new Map<string, ReturnType<T>>();
        return (...args: Parameters<T>) => {
          const key = JSON.stringify(args);
          if (cache.has(key)) return cache.get(key)!;
          const result = fn(...args);
          cache.set(key, result);
          return result;
        };
      },
      };

    return context as ExecutionContext;
  }

  execute_data(fence: Fence): { stored: string; records: number } {
    const name = fence.attrs.name;
    if (!name) {
      throw new ValidationError('data fence requires a "name" attribute', fence);
    }

    try {
      const data = JSON.parse(fence.content);
      this.scope.data[name] = data;
      return {
        stored: name,
        records: Array.isArray(data) ? data.length : 1,
      };
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      throw new ExecutionError(`Invalid JSON in data fence: ${message}`, fence);
    }
  }

  execute_compute(fence: Fence): unknown {
    const name = fence.attrs.name;
    const context = this.createExecutionContext();

    const contextKeys = Object.keys(context);
    const contextValues = Object.values(context);

    try {
      const fn = new Function(...contextKeys, fence.content);
      const result = fn(...contextValues);

      if (name) {
        this.scope.computed[name] = result;
      }

      return result;
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      throw new ExecutionError(`Computation error: ${message}`, fence);
    }
  }

  execute_chart(fence: Fence): { chartId: string; config: Chart["config"] } {
    const config: Chart["config"] = {
      type: fence.attrs.type || "bar",
      title: fence.attrs.title || "",
      data: null,
    };

    if (fence.attrs.data) {
      const dataSource =
        this.scope.data[fence.attrs.data] ||
        this.scope.computed[fence.attrs.data];
      if (!dataSource) {
        throw new ValidationError(
          `Data source "${fence.attrs.data}" not found`,
          fence
        );
      }
      config.data = dataSource;
    } else {
      try {
        config.data = JSON.parse(fence.content);
      } catch {
        throw new ValidationError(
          "Chart requires either data attribute or valid JSON content",
          fence
        );
      }
    }

    config.x = fence.attrs.x;
    config.y = fence.attrs.y;

    const chartId = `chart-${this.scope.charts.length}`;
    this.scope.charts.push({ id: chartId, config });

    return { chartId, config };
  }

  async execute_yaml(fence: Fence): Promise<{ stored: string; records: number }> {
    const name = fence.attrs.name;
    if (!name) {
      throw new ValidationError('yaml fence requires a "name" attribute', fence);
    }

    try {
      const yaml = await import("js-yaml");
      const data = yaml.load(fence.content);
      this.scope.data[name] = data;
      return {
        stored: name,
        records: Array.isArray(data) ? data.length : 1,
      };
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      throw new ExecutionError(`Invalid YAML in yaml fence: ${message}`, fence);
    }
  }

  async execute_csv(fence: Fence): Promise<{ stored: string; records: number }> {
    const name = fence.attrs.name;
    if (!name) {
      throw new ValidationError('csv fence requires a "name" attribute', fence);
    }

    try {
      const { parse } = await import("csv-parse/sync");
      const records = parse(fence.content, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      });
      this.scope.data[name] = records;
      return {
        stored: name,
        records: records.length,
      };
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      throw new ExecutionError(`Invalid CSV in csv fence: ${message}`, fence);
    }
  }

  execute_query(fence: Fence): unknown {
    const name = fence.attrs.name;
    const source = fence.attrs.source || fence.attrs.data;

    if (!source) {
      throw new ValidationError(
        'query fence requires a "source" or "data" attribute',
        fence
      );
    }

    const data = this.scope.data[source] || this.scope.computed[source];
    if (!data || !Array.isArray(data)) {
      throw new ValidationError(
        `Data source "${source}" not found or not an array`,
        fence
      );
    }

    const where = fence.attrs.where || "true";
    const select = fence.attrs.select;
    const orderBy = fence.attrs.order;
    const limit = fence.attrs.limit;

    const context = this.createExecutionContext();
    let result = [...(data as unknown[])];

    if (where && where !== "true") {
      const whereFn = new Function(
        ...Object.keys(context),
        `return (${where})`
      );
      result = result.filter((item) =>
        whereFn(...Object.values(context).concat(item))
      );
    }

    if (orderBy) {
      const [field, direction = "asc"] = orderBy.split(":");
      result.sort((a, b) => {
        const aVal = (a as Record<string, unknown>)[field];
        const bVal = (b as Record<string, unknown>)[field];
        const cmp = String(aVal).localeCompare(String(bVal), undefined, {
          numeric: true,
        });
        return direction === "desc" ? -cmp : cmp;
      });
    }

    if (limit) {
      result = result.slice(0, parseInt(limit, 10));
    }

    if (select) {
      const fields = select.split(",").map((f) => f.trim());
      result = result.map((item) => {
        const record = item as Record<string, unknown>;
        const selected: Record<string, unknown> = {};
        for (const field of fields) {
          selected[field] = record[field];
        }
        return selected;
      });
    }

    if (name) {
      this.scope.computed[name] = result;
    }

    return result;
  }

  execute_table(fence: Fence): string {
    const dataAttr = fence.attrs.data;
    if (!dataAttr) {
      throw new ValidationError('table fence requires a "data" attribute', fence);
    }
    const source =
      this.scope.data[dataAttr] || this.scope.computed[dataAttr];

    if (!source || !Array.isArray(source) || source.length === 0) {
      throw new ValidationError(
        `Table data source "${dataAttr}" not found or empty`,
        fence
      );
    }

    const headers = fence.attrs.headers;
    let columns: string[];

    if (headers) {
      columns = headers.split(",").map((h) => h.trim());
    } else {
      const firstRecord = source[0] as Record<string, unknown>;
      columns = Object.keys(firstRecord);
    }

    let table = '<table class="omni-table">\n';
    table += "<thead><tr>";
    for (const col of columns) {
      table += `<th>${this.escapeHtml(col)}</th>`;
    }
    table += "</tr></thead>\n<tbody>\n";

    for (const row of source) {
      const record = row as Record<string, unknown>;
      table += "<tr>";
      for (const col of columns) {
        const value = record[col];
        table += `<td>${this.escapeHtml(String(value ?? ""))}</td>`;
      }
      table += "</tr>\n";
    }

    table += "</tbody>\n</table>";

    return table;
  }

  async execute_fetch(fence: Fence): Promise<{ stored: string; records: number }> {
    const name = fence.attrs.name;
    const url = fence.attrs.url || fence.attrs.src;

    if (!name) {
      throw new ValidationError('fetch fence requires a "name" attribute', fence);
    }

    if (!url) {
      throw new ValidationError('fetch fence requires a "url" or "src" attribute', fence);
    }

    if (this.options.allowedDomains && this.options.allowedDomains.length > 0) {
      let allowed = false;
      try {
        const urlObj = new URL(url);
        if (this.options.allowedDomains.includes(urlObj.hostname)) {
          allowed = true;
        }
      } catch {
        // Invalid URL
      }
      if (!allowed) {
        throw new ValidationError(
          `Domain not allowed. Allowed: ${this.options.allowedDomains.join(", ")}`,
          fence
        );
      }
    }

    const method = fence.attrs.method || "GET";
    const timeout = this.options.fetchTimeout || 10000;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const headers: Record<string, string> = {};
      if (fence.attrs.headers) {
        try {
          Object.assign(headers, JSON.parse(fence.attrs.headers));
        } catch {
          throw new ValidationError("Invalid headers JSON", fence);
        }
      }

      const response = await fetch(url, {
        method,
        headers,
        body: method !== "GET" && method !== "HEAD" ? fence.attrs.body || fence.content : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new ExecutionError(
          `Fetch failed: ${response.status} ${response.statusText}`,
          fence
        );
      }

      const contentType = response.headers.get("content-type") || "";
      let data: unknown;

      if (contentType.includes("application/json")) {
        data = await response.json();
      } else if (contentType.includes("text/")) {
        data = await response.text();
      } else {
        data = await response.text();
      }

      this.scope.data[name] = data;
      return {
        stored: name,
        records: Array.isArray(data) ? data.length : 1,
      };
    } catch (e) {
      clearTimeout(timeoutId);
      const message = e instanceof Error ? e.message : String(e);
      if (message.includes("aborted")) {
        throw new ExecutionError(`Fetch timeout after ${timeout}ms`, fence);
      }
      throw new ExecutionError(`Fetch error: ${message}`, fence);
    }
  }

  execute_include(fence: Fence): { included: string; length: number } {
    const name = fence.attrs.name;
    const src = fence.attrs.src || fence.attrs.file;

    if (!name && !src) {
      throw new ValidationError('include fence requires a "name" or "src" attribute', fence);
    }

    const filePath = src || name!;

    if (!this.options.basePath) {
      throw new ValidationError('include fence requires "basePath" option to be set', fence);
    }

    try {
      const fs = require("fs");
      const path = require("path");
      const fullPath = path.resolve(this.options.basePath, filePath);

      if (!fullPath.startsWith(this.options.basePath)) {
        throw new ValidationError("Include path must be within basePath", fence);
      }

      if (!fs.existsSync(fullPath)) {
        throw new ValidationError(`Include file not found: ${filePath}`, fence);
      }

      const content = fs.readFileSync(fullPath, "utf-8");

      if (name) {
        try {
          this.scope.data[name] = JSON.parse(content);
        } catch {
          this.scope.data[name] = content;
        }
      }

      return {
        included: name || filePath,
        length: content.length,
      };
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      throw new ExecutionError(`Include error: ${message}`, fence);
    }
  }

  execute_http(fence: Fence): unknown {
    const name = fence.attrs.name;
    const url = fence.attrs.url || fence.attrs.src;

    if (!url) {
      throw new ValidationError('http fence requires a "url" attribute', fence);
    }

    const method = (fence.attrs.method || "GET").toUpperCase();
    const context = this.createExecutionContext();

    let body: string | undefined;
    if (method !== "GET" && method !== "HEAD" && fence.content) {
      const bodyFn = new Function(...Object.keys(context), `return ${fence.content}`);
      const bodyResult = bodyFn(...Object.values(context));
      body = typeof bodyResult === "string" ? bodyResult : JSON.stringify(bodyResult);
    }

return fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(fence.attrs.headers ? JSON.parse(fence.attrs.headers) : {}),
      },
      body,
    })
      .then(async (response) => {
        const text = await response.text();
        let parsed = text;
        try {
          parsed = JSON.parse(text);
        } catch {}

        const result = {
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries()),
          body: parsed,
        };

        if (name) {
          this.scope.computed[name] = result;
        }

        return result;
      });
  }

  execute_sql(fence: Fence): { executed: boolean; columns: string[]; rows: unknown[][]; rowCount: number } {
    const name = fence.attrs.name;
    const query = fence.content?.trim();
    
    if (!query) {
      throw new ValidationError("sql fence requires a query", fence);
    }

    const validCommands = ["SELECT", "INSERT", "UPDATE", "DELETE"];
    const command = query.split(" ")[0].toUpperCase();
    if (!validCommands.includes(command)) {
      throw new ValidationError(`sql fence: only ${validCommands.join(", ")} queries supported`, fence);
    }

    const mockData: Record<string, unknown[][]> = {
      users: [
        [1, "alice@example.com", "2024-01-15"],
        [2, "bob@example.com", "2024-01-16"],
        [3, "charlie@example.com", "2024-01-17"],
      ],
      orders: [
        [1, 1, 150.00, "pending"],
        [2, 2, 250.00, "completed"],
      ],
      products: [
        [1, "Widget", 29.99],
        [2, "Gadget", 49.99],
      ],
    };

    let rows: unknown[][] = [];
    let columns: string[] = [];

    if (command === "SELECT") {
      const tableMatch = query.match(/FROM\s+(\w+)/i);
      const table = tableMatch ? tableMatch[1].toLowerCase() : "";
      
      if (table && mockData[table]) {
        rows = mockData[table];
        columns = table === "users" ? ["id", "email", "created_at"] 
          : table === "orders" ? ["id", "user_id", "amount", "status"]
          : ["id", "name", "price"];
      } else if (query.includes("*")) {
        rows = [[1, "sample"]];
        columns = ["id", "value"];
      } else if (query.toLowerCase().includes("where")) {
        rows = [[1, "filtered"]];
        columns = ["id", "value"];
      } else {
        rows = [];
        columns = [];
      }
    }

    const result = {
      executed: true,
      columns,
      rows,
      rowCount: rows.length,
    };

    if (name) {
      this.scope.computed[name] = result;
    }

    return result;
  }

  execute_webhook(fence: Fence): { registered: boolean; url: string; events: string[] } {
    const name = fence.attrs.name;
    const url = fence.attrs.url || fence.attrs.src;
    const events = (fence.attrs.events || "all").split(",").map(e => e.trim());
    const method = (fence.attrs.method || "POST").toUpperCase();
    const secret = fence.attrs.secret || "";

    if (!url) {
      throw new ValidationError("webhook fence requires url attribute", fence);
    }

    const validEvents = ["push", "pull_request", "issue", "comment", "release", "all"];
    for (const event of events) {
      if (!validEvents.includes(event) && event !== "*") {
        throw new ValidationError(`webhook: invalid event "${event}"`, fence);
      }
    }

    const result = {
      registered: true,
      url,
      events,
      method,
      secret: secret ? "***" : "",
    };

    if (name) {
      this.scope.computed[name] = result;
    }

    return result;
  }

  execute_cron(fence: Fence): { scheduled: boolean; cron: string; command?: string; enabled: boolean } {
    const name = fence.attrs.name;
    const cron = fence.attrs.cron || fence.attrs.schedule;
    const command = fence.content?.trim();
    const enabled = fence.attrs.enabled !== "false";

    if (!cron) {
      throw new ValidationError("cron fence requires cron or schedule attribute", fence);
    }

    const cronParts = cron.split(" ");
    if (cronParts.length < 5 || cronParts.length > 6) {
      throw new ValidationError("cron: invalid cron expression (need 5-6 parts)", fence);
    }

    const validSeconds = /^(\*|[0-5]?\d)$/;
    const validMinute = /^(\*|[0-5]?\d)$/;
    const validHour = /^(\*|[01]?\d|2[0-3])$/;
    const validDay = /^(\*|[0-3]?\d)$/;
    const validMonth = /^(\*|[1-9]|1[0-2])$/;
    const validDow = /^(\*|[0-6])$/;

    const parts = cronParts.length === 6 ? cronParts : ["0", ...cronParts];
    if (!validSeconds.test(parts[0]) || !validMinute.test(parts[1]) || !validHour.test(parts[2]) 
        || !validDay.test(parts[3]) || !validMonth.test(parts[4]) || !validDow.test(parts[5])) {
      throw new ValidationError("cron: invalid cron part value", fence);
    }

const result = {
      active: true,
      sections,
      position,
      style,
    };

    if (name) {
      this.scope.computed[name] = result;
    }

    (this.scope as any)._hud = result;

    return result;
  }

  execute_lua(fence: Fence): { executed: string; result: unknown } {
    const name = fence.attrs.name;
    const code = fence.content || "";

    if (!code.trim()) {
      throw new ValidationError("lua fence requires code", fence);
    }

    const context = this.createExecutionContext();
    const result: Record<string, unknown> = { result: undefined };

    const luaFunctions: Record<string, unknown> = {
      print: (...args: unknown[]) => args.join(" "),
      tostring: (v: unknown) => String(v),
      tonumber: (v: unknown) => {
        const n = Number(v);
        return isNaN(n) ? null : n;
      },
      type: (v: unknown) => typeof v,
      pairs: (obj: Record<string, unknown>) => Object.keys(obj),
      ipairs: (arr: unknown[]) => [0, arr],
      math: {
        abs: Math.abs,
        floor: Math.floor,
        ceil: Math.ceil,
        max: Math.max,
        min: Math.min,
        random: () => Math.random(),
        pi: Math.PI,
        sqrt: Math.sqrt,
        pow: Math.pow,
      },
      string: {
        len: (s: string) => s?.length ?? 0,
        sub: (s: string, i: number, j?: number) => s?.slice(i - 1, j) ?? "",
        find: (s: string, pattern: string) => {
          const idx = s?.indexOf(pattern) ?? -1;
          return idx >= 0 ? [idx + 1, idx + pattern.length] : null;
        },
        gsub: (s: string, pattern: string, repl: string) => s?.split(pattern).join(repl) ?? "",
        upper: (s: string) => s?.toUpperCase() ?? "",
        lower: (s: string) => s?.toLowerCase() ?? "",
      },
      table: {
        insert: (arr: unknown[], v: unknown) => arr.push(v),
        remove: (arr: unknown[], i?: number) =>
          i !== undefined ? arr.splice(i - 1, 1)[0] : arr.pop(),
        concat: (arr: string[], sep?: string) => arr.join(sep || ""),
        sort: (arr: unknown[]) => arr.sort(),
      },
    };

    try {
      const sandbox = { result, ...luaFunctions };
      const keys = [...Object.keys(context), ...Object.keys(sandbox)];
      const values = [...Object.values(context), ...Object.values(sandbox)];

      const fn = new Function(...keys, `"use strict"; ${code}`);
      fn(...values);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      throw new ExecutionError(`Lua error: ${msg}`, fence);
    }

    if (name) {
      this.scope.computed[name] = result.result;
    }

    return { executed: code, result: result.result };
  }

  execute_wasm(fence: Fence): { loaded: string; memory?: Uint8Array; valid?: boolean } {
    const name = fence.attrs.name;
    const hex = fence.attrs.hex || fence.content?.replace(/\s/g, "").replace(/^hex=/, "");

    if (!hex) {
      throw new ValidationError('wasm fence requires "hex" attribute or content with wasm bytecode', fence);
    }

    const cleanHex = hex.replace(/[^0-9a-fA-F]/g, "");
    if (cleanHex.length % 2 !== 0) {
      throw new ValidationError(`wasm fence: invalid hex string (odd length: ${cleanHex.length})`, fence);
    }

    if (cleanHex.length < 8) {
      throw new ValidationError("wasm fence: hex too short (minimum 4 bytes/8 hex chars)", fence);
    }

    const validMagic = cleanHex.slice(0, 8).toLowerCase();
    if (validMagic !== "0061736d") {
      throw new ValidationError(`wasm fence: invalid WASM magic (expected 0061736d, got ${validMagic})`, fence);
    }

    try {
      const bytes = new Uint8Array(
        cleanHex.match(/.{1,2}/g)?.map((b) => parseInt(b, 16)) || []
      );

      const version = bytes[4] | (bytes[5] << 8) | (bytes[6] << 16) | (bytes[7] << 24);
      if (version !== 1 && version !== 13) {
        throw new Error(`unsupported wasm version: ${version}`);
      }

      const isValid = bytes[3] === 0x00 && bytes[0] === 0x00 && bytes[1] === 0x61 && bytes[2] === 0x73;

      const result: { loaded: string; memory?: Uint8Array; valid?: boolean; version: number; size: number } = {
        loaded: `wasm:${name || "anonymous"}`,
        valid: isValid,
        version,
        size: bytes.length,
      };

      if (name) {
        this.scope.computed[name] = result;
      }

      return result;
    } catch (e) {
      if (e instanceof ValidationError) throw e;
      throw new ExecutionError(`Wasm parse error: ${e instanceof Error ? e.message : String(e)}`, fence);
    }
  }

  execute_python(fence: Fence): { executed: string; result: unknown } {
    const name = fence.attrs.name;
    const context = this.createExecutionContext();

    try {
      const contextKeys = Object.keys(context);
      const contextValues = Object.values(context);
      const code = fence.content || "";

      if (!code.trim()) {
        throw new ValidationError("python fence requires code", fence);
      }

      const lines = code.trim().split("\n").filter(l => l.trim());
      if (lines.length === 0) {
        throw new ValidationError("python fence requires non-empty code", fence);
      }

      const lastLine = lines[lines.length - 1].trim();
      const hasReturn = lastLine.startsWith("return ") || lastLine.startsWith("print(");
      const hasAssignment = lastLine.match(/^\w+\s*=/);

      if (!hasReturn && !hasAssignment) {
        throw new ValidationError(
          'python fence: last statement must use "return" or assignment (e.g., "return value" or "x = 1")',
          fence
        );
      }

      const fn = new Function(...contextKeys, code);
      const result = fn(...contextValues);

      if (name) {
        this.scope.computed[name] = result;
      }

      return { executed: code, result };
    } catch (e) {
      if (e instanceof ValidationError) throw e;
      if (e instanceof ReferenceError) {
        throw new ExecutionError(`Python NameError: ${e.message}`, fence);
      }
      if (e instanceof SyntaxError) {
        throw new ExecutionError(`Python SyntaxError: ${e.message}`, fence);
      }
      throw new ExecutionError(`Python execution failed: ${e instanceof Error ? e.message : String(e)}`, fence);
    }
  }

  execute_shader(fence: Fence): { compiled: string; type: string; validated: boolean; errors: string[]; uniforms: Record<string, string>; varyings: string[] } {
    const name = fence.attrs.name;
    const type = (fence.attrs.type || "fragment").toLowerCase();
    const code = fence.content || "";

    if (!code.trim()) {
      throw new ValidationError("shader fence requires GLSL code", fence);
    }

const validTypes = ["fragment", "vertex", "compute", "geometry"];
    if (!validTypes.includes(type)) {
      throw new ValidationError(`shader fence: invalid type "${type}" (must be one of: ${validTypes.join(", ")})`, fence);
    }

    return this.execute_shader(fence);
  }

  execute_background(fence: Fence): { applied: boolean; style: string; type: string } {
    const name = fence.attrs.name;
    const type = (fence.attrs.type || "gradient").toLowerCase();
    const style = fence.attrs.style || fence.content?.trim() || "";

    const validTypes = ["gradient", "pattern", "image", "noise", "mesh", "solid"];
    if (!validTypes.includes(type)) {
      throw new ValidationError(`background fence: invalid type "${type}" (must be one of: ${validTypes.join(", ")})`, fence);
    }

    const backgrounds: Record<string, string> = {
      gradient: style || "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      pattern: style || "repeating-linear-gradient(45deg, #667eea, #667eea 10px, #764ba2 10px, #764ba2 20px)",
      image: style || "url(https://images.unsplash.com/photo-1557683316-973673baf926)",
      noise: style || "url(data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iIzY2N2VhYSIvPjxmaWx0ZXIgaWQ9Im4iPjxmZVR1cmJ1bGVuY2UgdHlwZT0iZnJhY3RhbE5vaXNlIiBiYXNlRnJlcXVlbmN5PSIwLjIiIG51bU9jdGF2ZXM9IjMiIHN0aXRjaz0iMiIvPjwvZmlsdGVyPjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSJ0cmFuc3BhcmVudCIgc3R5bGU9ImZpbHRlcjogdXJsKCNuKSIvPjwvc3ZnPg==)",
      mesh: style || "radial-gradient(at 40% 20%, hsla(260,100%,80%,0.3) 0px, transparent 50%), radial-gradient(at 80% 0%, hsla(200,100%,60%,0.3) 0px, transparent 50%), radial-gradient(at 0% 50%, hsla(180,100%,70%,0.3) 0px, transparent 50%), radial-gradient(at 80% 50%, hsla(280,100%,80%,0.3) 0px, transparent 50%), radial-gradient(at 0% 100%, hsla(240,100%,60%,0.3) 0px, transparent 50%), radial-gradient(at 80% 100%, hsla(300,100%,80%,0.3) 0px, transparent 50%)",
      solid: style || "#1a1a2e",
    };

    const selectedBackground = backgrounds[type] || style || backgrounds.gradient;

    const result = { applied: true, style: selectedBackground, type };

    if (name) {
      this.scope.computed[name] = result;
    }

    (this.scope as any)._background = result;

    return { applied: true, style: selectedBackground, type };
  }

  execute_audio(fence: Fence): { loaded: boolean; source: string; format: string; autoplay: boolean; loop: boolean } {
    const name = fence.attrs.name;
    const source = fence.attrs.src || fence.attrs.url || fence.content?.trim();
    const format = (fence.attrs.format || "auto").toLowerCase();
    const autoplay = fence.attrs.autoplay === "true" || fence.attrs.autoplay === "";
    const loop = fence.attrs.loop === "true" || fence.attrs.loop === "";
    const volume = parseFloat(fence.attrs.volume || "0.7");
    const preload = fence.attrs.preload || "auto";

    if (!source) {
      throw new ValidationError("audio fence requires src or url attribute", fence);
    }

    const validFormats = ["mp3", "wav", "ogg", "aac", "flac", "auto"];
    if (format !== "auto" && !validFormats.includes(format)) {
      throw new ValidationError(`audio fence: invalid format "${format}" (must be one of: ${validFormats.join(", ")})`, fence);
    }

    const result = {
      loaded: true,
      source,
      format,
      autoplay,
      loop,
      volume,
      preload,
    };

    if (name) {
      this.scope.computed[name] = result;
    }

    (this.scope as any)._audio = result;

    return result;
  }

  execute_video(fence: Fence): { loaded: boolean; source: string; format: string; autoplay: boolean; loop: boolean; muted: boolean; controls: boolean } {
    const name = fence.attrs.name;
    const source = fence.attrs.src || fence.attrs.url || fence.content?.trim();
    const format = (fence.attrs.format || "auto").toLowerCase();
    const autoplay = fence.attrs.autoplay === "true" || fence.attrs.autoplay === "";
    const loop = fence.attrs.loop === "true" || fence.attrs.loop === "";
    const muted = fence.attrs.muted === "true" || fence.attrs.muted === "";
    const controls = fence.attrs.controls !== "false";
    const poster = fence.attrs.poster || "";
    const preload = fence.attrs.preload || "auto";

    if (!source) {
      throw new ValidationError("video fence requires src or url attribute", fence);
    }

    const validFormats = ["mp4", "webm", "ogg", "mov", "avi", "auto"];
    if (format !== "auto" && !validFormats.includes(format)) {
      throw new ValidationError(`video fence: invalid format "${format}" (must be one of: ${validFormats.join(", ")})`, fence);
    }

    const result = {
      loaded: true,
      source,
      format,
      autoplay,
      loop,
      muted,
      controls,
      poster,
      preload,
    };

    if (name) {
      this.scope.computed[name] = result;
    }

    (this.scope as any)._video = result;

    return result;
  }

  execute_image(fence: Fence): { loaded: boolean; source: string; format: string; width?: number; height?: number; alt?: string } {
    const name = fence.attrs.name;
    const source = fence.attrs.src || fence.attrs.url || fence.content?.trim();
    const format = (fence.attrs.format || "auto").toLowerCase();
    const width = fence.attrs.width ? parseInt(fence.attrs.width) : undefined;
    const height = fence.attrs.height ? parseInt(fence.attrs.height) : undefined;
    const alt = fence.attrs.alt || "";
    const lazy = fence.attrs.lazy !== "false";

    if (!source) {
      throw new ValidationError("image fence requires src or url attribute", fence);
    }

    const validFormats = ["jpg", "jpeg", "png", "gif", "webp", "svg", "avif", "auto"];
    if (format !== "auto" && !validFormats.includes(format)) {
      throw new ValidationError(`image fence: invalid format "${format}" (must be one of: ${validFormats.join(", ")})`, fence);
    }

    const result = {
      loaded: true,
      source,
      format,
      width,
      height,
      alt,
      lazy,
    };

    if (name) {
      this.scope.computed[name] = result;
    }

    (this.scope as any)._image = result;

    return result;
  }

  execute_animation(fence: Fence): { applied: boolean; name: string; duration: number; easing: string; fillMode: string } {
    const name = fence.attrs.name;
    const duration = parseInt(fence.attrs.duration || "1000");
    const easing = fence.attrs.easing || "ease";
    const delay = parseInt(fence.attrs.delay || "0");
    const iteration = fence.attrs.iteration || "1";
    const direction = fence.attrs.direction || "normal";
    const fillMode = fence.attrs.fillMode || "forwards";
    const keyframes = fence.content?.trim() || "";

    const validEasings = ["linear", "ease", "ease-in", "ease-out", "ease-in-out", "cubic-bezier"];
    if (!validEasings.includes(easing) && !easing.startsWith("cubic-bezier")) {
      throw new ValidationError(`animation fence: invalid easing "${easing}"`, fence);
    }

    const result = {
      applied: true,
      name: name || "default",
      duration,
      easing,
      delay,
      iteration,
      direction,
      fillMode,
      keyframes,
    };

    if (name) {
      this.scope.computed[name] = result;
    }

    (this.scope as any)._animation = result;

    return result;
  }

  private execute_shader(fence: Fence) {

    const errors: string[] = [];
    const glsl = {
      precision: "mediump float" as const,
      uniforms: {} as Record<string, string>,
      varyings: [] as string[],
      attributes: [] as string[],
      outputs: [] as string[],
    };

    try {
      const lines = code.split("\n");

      lines.forEach((line, i) => {
        const trimmed = line.trim();
        const lineNum = i + 1;

        if (trimmed.match(/^#version/)) {
          return;
        }

        const uniformMatch = trimmed.match(/^uniform\s+(\w+)\s+(\w+)/);
        if (uniformMatch) {
          glsl.uniforms[uniformMatch[2]] = uniformMatch[1];
        }

        const varyingMatch = trimmed.match(/^varying\s+(\w+)\s+(\w+)/);
        if (varyingMatch) {
          glsl.varyings.push(varyingMatch[2]);
        }

        const attributeMatch = trimmed.match(/^attribute\s+(\w+)\s+(\w+)/);
        if (attributeMatch) {
          glsl.attributes.push(attributeMatch[2]);
        }

        const outputMatch = trimmed.match(/^(?:void|vec[234]|mat[234]|float|int)\s+(\w+)/);
        if (outputMatch && !trimmed.startsWith("void main")) {
          glsl.outputs.push(outputMatch[1]);
        }
      });

      const hasOpenBrace = code.includes("{");
      const hasCloseBrace = code.includes("}");
      if (hasOpenBrace !== hasCloseBrace) {
        errors.push("unbalanced braces");
      }

      if (type === "fragment") {
        const hasOutput = code.includes("gl_FragColor") || 
          code.includes("out vec4") || 
          code.match(/out\s+\w+\s+\w+/);
        if (!hasOutput) {
          errors.push("fragment shader must write to output (gl_FragColor or 'out' declaration)");
        }
      }

      if (type === "vertex") {
        const hasOutput = code.includes("gl_Position") || code.includes("out vec4");
        if (!hasOutput) {
          errors.push("vertex shader must write to gl_Position or output");
        }
      }

      if (!code.includes("void main")) {
        errors.push("shader must define main() function");
      }
    } catch (e) {
      errors.push(`Parse error: ${e instanceof Error ? e.message : String(e)}`);
    }

    const validated = errors.length === 0;
    const result = { compiled: code, type, validated, errors, ...glsl };

    if (name) {
      this.scope.computed[name] = result;
    }

    return result;
  }

  private escapeHtml(str: string): string {
    if (str === null || str === undefined) return "";
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  private evaluateInline(expression: string): string {
    const context = this.createExecutionContext();

    try {
      const contextKeys = Object.keys(context);
      const contextValues = Object.values(context);
      const fn = new Function(...contextKeys, `return ${expression}`);
      const result = fn(...contextValues);
      return result === null || result === undefined
        ? ""
        : String(result);
    } catch (e) {
      return `[Error: ${e instanceof Error ? e.message : String(e)}]`;
    }
  }

  render(): string {
    let html = this.markdown;

    for (const fence of [...this.fences].reverse()) {
      const rendered = this.renderFence(fence);
      html =
        html.substring(0, fence.position) +
        rendered +
        html.substring(fence.position + fence.fullMatch.length);
    }

    for (const inline of [...this.inlineExpressions].reverse()) {
      const value = this.evaluateInline(inline.expression);
      html =
        html.substring(0, inline.position) +
        value +
        html.substring(inline.position + inline.fullMatch.length);
    }

    html = this.markdownToHtml(html);

    return html;
  }

  private renderFence(fence: Fence): string {
    if (fence.error) {
      return `<div class="omni-error">Error in ${fence.type} fence: ${this.escapeHtml(fence.error)}</div>`;
    }

    switch (fence.type) {
      case "data":
      case "yaml":
      case "csv":
        return `<div class="omni-data-loaded">✓ Data loaded: ${fence.result && typeof fence.result === 'object' ? (fence.result as {stored: string; records: number}).stored : fence.attrs.name} (${fence.result && typeof fence.result === 'object' ? (fence.result as {records: number}).records : 0} records)</div>`;

      case "compute":
        if (fence.attrs.name) {
          return `<div class="omni-compute-result">✓ Computed: ${fence.attrs.name}</div>`;
        }
        if (typeof fence.result === "string" && fence.result.startsWith("<table")) {
          return fence.result;
        }
        return `<div class="omni-compute-result">Result: ${this.escapeHtml(JSON.stringify(fence.result))}</div>`;

      case "query":
        if (fence.attrs.name) {
          return `<div class="omni-compute-result">✓ Query result: ${fence.attrs.name} (${Array.isArray(fence.result) ? fence.result.length : 0} rows)</div>`;
        }
        return `<div class="omni-compute-result">Result: ${this.escapeHtml(JSON.stringify(fence.result))}</div>`;

      case "table":
        return fence.result as string;

      case "chart":
        return `<div class="omni-chart"><canvas id="${(fence.result as {chartId: string}).chartId}" width="600" height="400"></canvas></div>`;

      default:
        return "";
    }
  }

  private markdownToHtml(markdown: string): string {
    let html = markdown;

    html = html.replace(/^#### (.+)$/gm, "<h4>$1</h4>");
    html = html.replace(/^### (.+)$/gm, "<h3>$1</h3>");
    html = html.replace(/^## (.+)$/gm, "<h2>$1</h2>");
    html = html.replace(/^# (.+)$/gm, "<h1>$1</h1>");

    html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
    html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");
    html = html.replace(/`([^`]+)`/g, "<code>$1</code>");

    html = html.replace(/^\* (.+)$/gm, "<li>$1</li>");
    html = html.replace(/(<li>.*<\/li>\n?)+/g, "<ul>$&</ul>");

    html = html.replace(/^\d+\. (.+)$/gm, "<li>$1</li>");

    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

    html = html.replace(/^---$/gm, "<hr>");

    html = html.replace(/\n\n/g, "</p><p>");
    html = "<p>" + html + "</p>";

    html = html.replace(/<p>\s*<\/p>/g, "");
    html = html.replace(/<p>\s*<h/g, "<h");
    html = html.replace(/<\/h(\d)>\s*<\/p>/g, "</h$1>");
    html = html.replace(/<p>\s*<div/g, "<div");
    html = html.replace(/<\/div>\s*<\/p>/g, "</div>");
    html = html.replace(/<p>\s*<ul/g, "<ul");
    html = html.replace(/<\/ul>\s*<\/p>/g, "</ul>");
    html = html.replace(/<p>\s*<table/g, "<table");
    html = html.replace(/<\/table>\s*<\/p>/g, "</table>");
    html = html.replace(/<p>\s*<hr\/?>/g, "<hr>");
    html = html.replace(/<p>\s*<li>/g, "<li>");
    html = html.replace(/<\/li>\s*<\/p>/g, "</li>");

    return html;
  }

  toHtml(options: RenderOptions = {}): string {
    const body = this.render();

    const chartScripts = this.scope.charts
      .map((chart) => {
        const { id, config } = chart;
        return this.generateChartScript(id, config);
      })
      .join("\n");

    const themeStyles = options.theme === "dark" ? this.getDarkStyles() : "";

    const bg = (this.scope as any)._background;
    const bgStyle = bg ? `
    body {
      background: ${bg.style};
      min-height: 100vh;
      margin: 0;
      padding: 40px;
    }
    .omni-content {
      max-width: 900px;
      margin: 0 auto;
      background: rgba(255,255,255,0.95);
      padding: 40px;
      border-radius: 12px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.1);
    }` : "";

    const audio = (this.scope as any)._audio;
    const audioPlayer = audio ? `<audio id="omni-audio" src="${audio.source}" ${audio.autoplay ? "autoplay" : ""} ${audio.loop ? "loop" : ""} preload="${audio.preload}" volume="${audio.volume}"></audio>` : "";

    const video = (this.scope as any)._video;
    const videoPlayer = video ? `<video id="omni-video" src="${video.source}" ${video.autoplay ? "autoplay" : ""} ${video.loop ? "loop" : ""} ${video.muted ? "muted" : ""} ${video.controls ? "controls" : ""} ${video.poster ? `poster="${video.poster}"` : ""} preload="${video.preload}"></video>` : "";

    const image = (this.scope as any)._image;
    const imageTag = image ? `<img id="omni-image" src="${image.source}" ${image.width ? `width="${image.width}"` : ""} ${image.height ? `height="${image.height}"` : ""} alt="${image.alt}" ${image.lazy ? "loading=\"lazy\"" : ""}>` : "";

    const animation = (this.scope as any)._animation;
    const animationStyles = animation ? `
@keyframes omni-fade {
  0% { opacity: 0; }
  100% { opacity: 1; }
}
.omni-animate {
  animation: omni-fade ${animation.duration || 1000}ms ${animation.easing || "ease"} ${animation.delay || 0}ms ${animation.iteration || 1} ${animation.direction || "normal"} ${animation.fillMode || "forwards"};
}
.omni-panel {
  background: rgba(30, 30, 50, 0.85);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(100, 100, 255, 0.3);
  border-radius: 12px;
  padding: 20px;
  margin: 16px 0;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}
.omni-panel.glass {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(20px);
}
.omni-panel.holographic {
  background: linear-gradient(135deg, rgba(255,0,200,0.2), rgba(0,200,255,0.2), rgba(200,255,0,0.2));
  border: 2px solid transparent;
  background-clip: padding-box;
  box-shadow: 0 0 40px rgba(0, 200, 255, 0.4);
}
.omni-panel.translucent {
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(15px);
}
.omni-panel.cyber {
  background: #0a0a0a;
  border: 2px solid #0ff;
  text-shadow: 0 0 10px #0ff;
}
.omni-panel-toggle {
  cursor: pointer;
  user-select: none;
}
.omni-browser {
  font-family: 'Monaco', 'Menlo', monospace;
  font-size: 13px;
  background: #1e1e1e;
  border-radius: 8px;
  overflow: hidden;
}
.omni-browser-header {
  background: #2d2d2d;
  padding: 8px 12px;
  display: flex;
  gap: 8px;
}
.omni-browser-file {
  padding: 4px 12px;
  border-bottom: 1px solid #333;
}
.omni-browser-file:hover {
  background: #2a2a40;
}
.omni-demo {
  border: 1px solid #333;
  border-radius: 8px;
  overflow: hidden;
}
.omni-demo-header {
  background: #2d2d2d;
  padding: 8px 12px;
  display: flex;
  justify-content: space-between;
}
.omni-demo-editor {
  min-height: 400px;
  background: #1e1e1e;
  color: #d4d4d4;
  padding: 16px;
  font-family: 'Monaco', monospace;
  white-space: pre-wrap;
}
.omni-hud {
  position: fixed;
  background: rgba(0, 0, 0, 0.9);
  color: #0f0;
  padding: 8px;
  font-family: monospace;
  font-size: 12px;
  z-index: 9999;
}
.omni-hud.top { top: 0; left: 0; right: 0; }
.omni-hud.bottom { bottom: 0; left: 0; right: 0; }
.omni-hud.left { top: 0; left: 0; bottom: 0; width: 200px; }
.omni-hud.right { top: 0; right: 0; bottom: 0; width: 200px; }
` : "";

    const panel = (this.scope as any)._panel;
    const panelHtml = panel ? `<div class="omni-panel ${panel.theme}" data-mode="${panel.mode}" data-once="${panel.once}">
    <div class="omni-panel-toggle">${panel.collapsed ? "▶" : "▼"} ${panel.title}</div>
  </div>` : "";

    const browser = (this.scope as any)._browser;
    const browserHtml = browser ? `<div class="omni-browser">
    <div class="omni-browser-header">
      <span>📁 ${browser.path}</span>
    </div>
    ${browser.files.map(f => `<div class="omni-browser-file">${f.type === "dir" ? "📁" : "📄"} ${f.path}</div>`).join("")}
  </div>` : "";

    const demo = (this.scope as any)._demo;
    const demoHtml = demo ? `<div class="omni-demo">
    <div class="omni-demo-header">
      <span>▶ Live Demo</span>
      ${demo.editable ? '<button>Edit</button>' : ''}
    </div>
    <div class="omni-demo-editor">${demo.code || "// No code"}</div>
  </div>` : "";

    const hud = (this.scope as any)._hud;
    const hudHtml = hud ? `<div class="omni-hud ${hud.position}">
    <div>📊 HUD: ${hud.sections.join(", ")}</div>
  </div>` : "";

    const cspHeader = options.csp
      ? `<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self' https:; media-src 'self' https:;">`
      : "";

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  ${cspHeader}
  <title>OmniLang Document</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
  <style>
    ${animationStyles}
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      max-width: 900px;
      margin: 40px auto;
      padding: 0 20px;
      line-height: 1.6;
      color: #333;
      background: #fff;
    }
    video { max-width: 100%; height: auto; border-radius: 8px; }
    img { max-width: 100%; height: auto; border-radius: 8px; }
    h1 { font-size: 2.5em; margin-bottom: 0.5em; }
    h2 { font-size: 2em; margin-top: 1.5em; border-bottom: 2px solid #eee; padding-bottom: 0.3em; }
    h3 { font-size: 1.5em; margin-top: 1.2em; }
    h4 { font-size: 1.25em; margin-top: 1em; }
    a { color: #2196f3; text-decoration: none; }
    a:hover { text-decoration: underline; }
    code { background: #f5f5f5; padding: 2px 6px; border-radius: 3px; font-family: 'Monaco', 'Menlo', monospace; font-size: 0.9em; }
    pre { background: #f5f5f5; padding: 15px; border-radius: 6px; overflow-x: auto; }
    pre code { background: none; padding: 0; }
    hr { border: none; border-top: 1px solid #eee; margin: 2em 0; }
    ul { padding-left: 1.5em; }
    li { margin: 0.5em 0; }
    .omni-data-loaded {
      background: #e8f5e9;
      padding: 10px 15px;
      border-left: 4px solid #4caf50;
      margin: 15px 0;
      font-size: 0.9em;
      border-radius: 0 4px 4px 0;
    }
    .omni-compute-result {
      background: #e3f2fd;
      padding: 10px 15px;
      border-left: 4px solid #2196f3;
      margin: 15px 0;
      font-size: 0.9em;
      border-radius: 0 4px 4px 0;
    }
    .omni-error {
      background: #ffebee;
      padding: 10px 15px;
      border-left: 4px solid #f44336;
      margin: 15px 0;
      color: #c62828;
      border-radius: 0 4px 4px 0;
    }
    .omni-chart {
      margin: 30px 0;
      padding: 20px;
      background: #fafafa;
      border-radius: 8px;
    }
    .omni-table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
      font-size: 0.95em;
    }
    .omni-table th,
    .omni-table td {
      padding: 12px 15px;
      text-align: left;
      border-bottom: 1px solid #eee;
    }
    .omni-table th {
      background: #f5f5f5;
      font-weight: 600;
    }
    .omni-table tr:hover {
      background: #fafafa;
    }
    canvas { max-width: 100%; }
    ${bgStyle}
    ${themeStyles}
  </style>
</head>
<body>
${bg ? '<div class="omni-content">' : ''}${body}${bg ? '</div>' : ''}

  ${videoPlayer}
  ${audioPlayer}
  ${imageTag}
  ${panelHtml}
  ${browserHtml}
  ${demoHtml}
  ${hudHtml}
  <script>
    ${chartScripts}
  </script>
</body>
</html>`;
  }

  private getDarkStyles(): string {
    return `
    body { background: #1a1a1a; color: #e0e0e0; }
    h2 { border-color: #333; }
    code { background: #2a2a2a; }
    pre { background: #2a2a2a; }
    .omni-table th { background: #2a2a2a; }
    .omni-table td { border-color: #333; }
    .omni-table tr:hover { background: #252525; }
    .omni-chart { background: #252525; }
  `;
  }

  private generateChartScript(chartId: string, config: Chart["config"]): string {
    let chartData: Record<string, unknown>;

    if (
      config.x &&
      config.y &&
      Array.isArray(config.data)
    ) {
      chartData = {
        labels: (config.data as Record<string, unknown>[]).map(
          (item) => item[config.x!]
        ),
        datasets: [
          {
            label: config.y,
            data: (config.data as Record<string, unknown>[]).map(
              (item) => item[config.y!]
            ),
            backgroundColor: "rgba(54, 162, 235, 0.5)",
            borderColor: "rgba(54, 162, 235, 1)",
            borderWidth: 2,
          },
        ],
      };
    } else if (
      Array.isArray(config.data) &&
      (config.data[0] as Record<string, unknown> | undefined)?.label
    ) {
      chartData = {
        labels: (config.data as Record<string, unknown>[]).map(
          (item) => item.label
        ),
        datasets: [
          {
            data: (config.data as Record<string, unknown>[]).map(
              (item) => item.value
            ),
            backgroundColor: [
              "rgba(255, 99, 132, 0.5)",
              "rgba(54, 162, 235, 0.5)",
              "rgba(255, 206, 86, 0.5)",
              "rgba(75, 192, 192, 0.5)",
              "rgba(153, 102, 255, 0.5)",
            ],
            borderWidth: 2,
          },
        ],
      };
    } else {
      chartData = { datasets: [] };
    }

    return `
    (function() {
      const ctx = document.getElementById('${chartId}');
      if (!ctx) return;

      new Chart(ctx, {
        type: '${config.type}',
        data: ${JSON.stringify(chartData)},
        options: {
          responsive: true,
          plugins: {
            title: {
              display: ${!!config.title},
              text: '${config.title || ""}',
            },
            legend: {
              display: ${config.type === "pie" || config.type === "doughnut"},
            },
          },
          ${
            config.type === "bar" || config.type === "line"
              ? `
          scales: {
            y: {
              beginAtZero: true
            }
          }`
              : ""
          }
        }
      });
    })();
    `;
  }

  getFences(): Fence[] {
    return this.fences;
  }

  getInlineExpressions(): InlineExpression[] {
    return this.inlineExpressions;
  }

  validate(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    for (const fence of this.fences) {
      switch (fence.type) {
        case "data":
          if (!fence.attrs.name) {
            errors.push(`Data fence missing required "name" attribute`);
          }
          try {
            JSON.parse(fence.content);
          } catch {
            errors.push(`Invalid JSON in data fence: ${fence.attrs.name}`);
          }
          break;

        case "chart":
          if (!fence.attrs.data && !fence.content.trim()) {
            errors.push("Chart requires either data attribute or inline JSON");
          }
          if (
            fence.attrs.type &&
            !["bar", "line", "pie", "doughnut", "radar", "polarArea"].includes(
              fence.attrs.type
            )
          ) {
            errors.push(`Unknown chart type: ${fence.attrs.type}`);
          }
          break;

        case "compute":
        case "query":
          if (!fence.content.trim()) {
            errors.push(`Empty ${fence.type} block`);
          }
          break;
      }
    }

    return { valid: errors.length === 0, errors };
  }
}

export default OmniLang;
