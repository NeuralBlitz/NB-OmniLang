export class OmniLangError extends Error {
    code;
    fence;
    constructor(message, code, fence) {
        super(message);
        this.code = code;
        this.fence = fence;
        this.name = "OmniLangError";
    }
}
export class ExecutionError extends OmniLangError {
    constructor(message, fence) {
        super(message, "EXECUTION_ERROR", fence);
        this.name = "ExecutionError";
    }
}
export class ParseError extends OmniLangError {
    constructor(message) {
        super(message, "PARSE_ERROR");
        this.name = "ParseError";
    }
}
export class ValidationError extends OmniLangError {
    constructor(message, fence) {
        super(message, "VALIDATION_ERROR", fence);
        this.name = "ValidationError";
    }
}
const FENCE_REGEX = /```omni:(\w+)(?:\s+(.+?))?\n([\s\S]*?)```/g;
const INLINE_REGEX = /```omni:inline\s+(.+?)```/g;
const ATTR_REGEX = /(\w+)="([^"]*)"|(\w+)=(\S+)/g;
const REF_REGEX = /\b(data|computed)\.(\w+)\b/g;
export class OmniLang {
    fences = [];
    inlineExpressions = [];
    markdown = "";
    dependencies = new Map();
    options;
    plugins = [];
    scope = {
        data: {},
        computed: {},
        charts: [],
        functions: {},
        variables: {},
    };
    constructor(options = {}) {
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
    registerPlugin(plugin) {
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
    getPlugins() {
        return [...this.plugins];
    }
    hasPlugin(name) {
        return this.plugins.some((p) => p.name === name);
    }
    parse(markdown) {
        this.fences = [];
        this.inlineExpressions = [];
        this.markdown = markdown;
        let match;
        while ((match = FENCE_REGEX.exec(markdown)) !== null) {
            const [, type, attrs, content] = match;
            if (type === "inline")
                continue;
            const fence = {
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
    parseAttributes(attrString) {
        const attrs = {};
        let match;
        while ((match = ATTR_REGEX.exec(attrString)) !== null) {
            const key = match[1] || match[3];
            const value = match[2] !== undefined ? match[2] : match[4];
            if (key)
                attrs[key] = value;
        }
        ATTR_REGEX.lastIndex = 0;
        return attrs;
    }
    analyzeDependencies() {
        this.dependencies.clear();
        for (const fence of this.fences) {
            const deps = new Set();
            let match;
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
    async execute() {
        this.analyzeDependencies();
        for (const fence of this.fences) {
            await this.executeFence(fence);
        }
        return this;
    }
    async executeFence(fence) {
        const handler = this[`execute_${fence.type}`];
        if (typeof handler !== "function") {
            fence.error = `Unknown fence type: ${fence.type}`;
            if (this.options.strict) {
                throw new ValidationError(fence.error, fence);
            }
            return;
        }
        try {
            fence.result = await handler.call(this, fence);
            fence.executed = true;
        }
        catch (error) {
            fence.error =
                error instanceof Error ? error.message : String(error);
            if (this.options.strict) {
                throw new ExecutionError(fence.error, fence);
            }
        }
    }
    createExecutionContext() {
        const context = {
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
            len: (arr) => (arr ? arr.length : 0),
            sum: (arr, key) => {
                if (!arr)
                    return 0;
                if (key)
                    return arr.reduce((sum, item) => sum + (Number(item[key]) || 0), 0);
                return arr.reduce((sum, val) => sum + Number(val), 0);
            },
            avg: (arr, key) => {
                const total = context.sum(arr, key);
                return total / context.len(arr);
            },
            max: (arr, key) => {
                if (!arr || arr.length === 0)
                    return null;
                if (key)
                    return Math.max(...arr.map((item) => Number(item[key]) || 0));
                return Math.max(...arr.map(Number));
            },
            min: (arr, key) => {
                if (!arr || arr.length === 0)
                    return null;
                if (key)
                    return Math.min(...arr.map((item) => Number(item[key]) || 0));
                return Math.min(...arr.map(Number));
            },
            filter: (arr, fn) => arr ? arr.filter(fn) : [],
            map: (arr, fn) => arr ? arr.map(fn) : [],
            groupBy: (arr, key) => {
                if (!arr)
                    return {};
                return arr.reduce((groups, item) => {
                    const groupKey = String(item[key]);
                    if (!groups[groupKey])
                        groups[groupKey] = [];
                    groups[groupKey].push(item);
                    return groups;
                }, {});
            },
            sort: (arr, key, direction = "asc") => {
                if (!arr)
                    return [];
                const sorted = [...arr].sort((a, b) => {
                    const aVal = key ? a[key] : a;
                    const bVal = key ? b[key] : b;
                    if (typeof aVal === "number" && typeof bVal === "number") {
                        return aVal - bVal;
                    }
                    return String(aVal).localeCompare(String(bVal), undefined, { numeric: true });
                });
                return direction === "desc" ? sorted.reverse() : sorted;
            },
            unique: (arr, key) => {
                if (!arr)
                    return [];
                if (!key)
                    return [...new Set(arr)];
                const seen = new Set();
                return arr.filter((item) => {
                    const val = item[key];
                    if (seen.has(val))
                        return false;
                    seen.add(val);
                    return true;
                });
            },
            flatten: (arr) => {
                if (!arr)
                    return [];
                return arr.flat(Infinity);
            },
            pick: (obj, keys) => {
                const result = {};
                for (const key of keys) {
                    if (key in obj)
                        result[key] = obj[key];
                }
                return result;
            },
            omit: (obj, keys) => {
                const result = { ...obj };
                for (const key of keys) {
                    delete result[key];
                }
                return result;
            },
            merge: (...objects) => {
                return Object.assign({}, ...objects);
            },
            debounce: (fn, _ms) => {
                let timeout = null;
                return ((...args) => {
                    if (timeout)
                        clearTimeout(timeout);
                    timeout = setTimeout(() => fn(...args), _ms);
                });
            },
            throttle: (fn, _ms) => {
                let lastCall = 0;
                return ((...args) => {
                    const now = Date.now();
                    if (now - lastCall >= _ms) {
                        lastCall = now;
                        fn(...args);
                    }
                });
            },
            sleep: (ms) => {
                return new Promise((resolve) => setTimeout(resolve, ms));
            },
        };
        return context;
    }
    execute_data(fence) {
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
        }
        catch (e) {
            const message = e instanceof Error ? e.message : String(e);
            throw new ExecutionError(`Invalid JSON in data fence: ${message}`, fence);
        }
    }
    execute_compute(fence) {
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
        }
        catch (e) {
            const message = e instanceof Error ? e.message : String(e);
            throw new ExecutionError(`Computation error: ${message}`, fence);
        }
    }
    execute_chart(fence) {
        const config = {
            type: fence.attrs.type || "bar",
            title: fence.attrs.title || "",
            data: null,
        };
        if (fence.attrs.data) {
            const dataSource = this.scope.data[fence.attrs.data] ||
                this.scope.computed[fence.attrs.data];
            if (!dataSource) {
                throw new ValidationError(`Data source "${fence.attrs.data}" not found`, fence);
            }
            config.data = dataSource;
        }
        else {
            try {
                config.data = JSON.parse(fence.content);
            }
            catch {
                throw new ValidationError("Chart requires either data attribute or valid JSON content", fence);
            }
        }
        config.x = fence.attrs.x;
        config.y = fence.attrs.y;
        const chartId = `chart-${this.scope.charts.length}`;
        this.scope.charts.push({ id: chartId, config });
        return { chartId, config };
    }
    async execute_yaml(fence) {
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
        }
        catch (e) {
            const message = e instanceof Error ? e.message : String(e);
            throw new ExecutionError(`Invalid YAML in yaml fence: ${message}`, fence);
        }
    }
    async execute_csv(fence) {
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
        }
        catch (e) {
            const message = e instanceof Error ? e.message : String(e);
            throw new ExecutionError(`Invalid CSV in csv fence: ${message}`, fence);
        }
    }
    execute_query(fence) {
        const name = fence.attrs.name;
        const source = fence.attrs.source || fence.attrs.data;
        if (!source) {
            throw new ValidationError('query fence requires a "source" or "data" attribute', fence);
        }
        const data = this.scope.data[source] || this.scope.computed[source];
        if (!data || !Array.isArray(data)) {
            throw new ValidationError(`Data source "${source}" not found or not an array`, fence);
        }
        const where = fence.attrs.where || "true";
        const select = fence.attrs.select;
        const orderBy = fence.attrs.order;
        const limit = fence.attrs.limit;
        const context = this.createExecutionContext();
        let result = [...data];
        if (where && where !== "true") {
            const whereFn = new Function(...Object.keys(context), `return (${where})`);
            result = result.filter((item) => whereFn(...Object.values(context).concat(item)));
        }
        if (orderBy) {
            const [field, direction = "asc"] = orderBy.split(":");
            result.sort((a, b) => {
                const aVal = a[field];
                const bVal = b[field];
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
                const record = item;
                const selected = {};
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
    execute_table(fence) {
        const dataAttr = fence.attrs.data;
        if (!dataAttr) {
            throw new ValidationError('table fence requires a "data" attribute', fence);
        }
        const source = this.scope.data[dataAttr] || this.scope.computed[dataAttr];
        if (!source || !Array.isArray(source) || source.length === 0) {
            throw new ValidationError(`Table data source "${dataAttr}" not found or empty`, fence);
        }
        const headers = fence.attrs.headers;
        let columns;
        if (headers) {
            columns = headers.split(",").map((h) => h.trim());
        }
        else {
            const firstRecord = source[0];
            columns = Object.keys(firstRecord);
        }
        let table = '<table class="omni-table">\n';
        table += "<thead><tr>";
        for (const col of columns) {
            table += `<th>${this.escapeHtml(col)}</th>`;
        }
        table += "</tr></thead>\n<tbody>\n";
        for (const row of source) {
            const record = row;
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
    async execute_fetch(fence) {
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
            }
            catch {
                // Invalid URL
            }
            if (!allowed) {
                throw new ValidationError(`Domain not allowed. Allowed: ${this.options.allowedDomains.join(", ")}`, fence);
            }
        }
        const method = fence.attrs.method || "GET";
        const timeout = this.options.fetchTimeout || 10000;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);
        try {
            const headers = {};
            if (fence.attrs.headers) {
                try {
                    Object.assign(headers, JSON.parse(fence.attrs.headers));
                }
                catch {
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
                throw new ExecutionError(`Fetch failed: ${response.status} ${response.statusText}`, fence);
            }
            const contentType = response.headers.get("content-type") || "";
            let data;
            if (contentType.includes("application/json")) {
                data = await response.json();
            }
            else if (contentType.includes("text/")) {
                data = await response.text();
            }
            else {
                data = await response.text();
            }
            this.scope.data[name] = data;
            return {
                stored: name,
                records: Array.isArray(data) ? data.length : 1,
            };
        }
        catch (e) {
            clearTimeout(timeoutId);
            const message = e instanceof Error ? e.message : String(e);
            if (message.includes("aborted")) {
                throw new ExecutionError(`Fetch timeout after ${timeout}ms`, fence);
            }
            throw new ExecutionError(`Fetch error: ${message}`, fence);
        }
    }
    execute_include(fence) {
        const name = fence.attrs.name;
        const src = fence.attrs.src || fence.attrs.file;
        if (!name && !src) {
            throw new ValidationError('include fence requires a "name" or "src" attribute', fence);
        }
        const filePath = src || name;
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
                }
                catch {
                    this.scope.data[name] = content;
                }
            }
            return {
                included: name || filePath,
                length: content.length,
            };
        }
        catch (e) {
            const message = e instanceof Error ? e.message : String(e);
            throw new ExecutionError(`Include error: ${message}`, fence);
        }
    }
    execute_http(fence) {
        const name = fence.attrs.name;
        const url = fence.attrs.url || fence.attrs.src;
        if (!url) {
            throw new ValidationError('http fence requires a "url" attribute', fence);
        }
        const method = (fence.attrs.method || "GET").toUpperCase();
        const context = this.createExecutionContext();
        let body;
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
            const result = {
                status: response.status,
                statusText: response.statusText,
                headers: Object.fromEntries(response.headers.entries()),
                data: null,
            };
            const contentType = response.headers.get("content-type") || "";
            if (contentType.includes("application/json")) {
                result.data = await response.json();
            }
            else {
                result.data = await response.text();
            }
            if (name) {
                this.scope.computed[name] = result;
            }
            return result;
        })
            .catch((e) => {
            throw new ExecutionError(`HTTP error: ${e.message}`, fence);
        });
    }
    escapeHtml(str) {
        if (str === null || str === undefined)
            return "";
        return str
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
    evaluateInline(expression) {
        const context = this.createExecutionContext();
        try {
            const contextKeys = Object.keys(context);
            const contextValues = Object.values(context);
            const fn = new Function(...contextKeys, `return ${expression}`);
            const result = fn(...contextValues);
            return result === null || result === undefined
                ? ""
                : String(result);
        }
        catch (e) {
            return `[Error: ${e instanceof Error ? e.message : String(e)}]`;
        }
    }
    render() {
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
    renderFence(fence) {
        if (fence.error) {
            return `<div class="omni-error">Error in ${fence.type} fence: ${this.escapeHtml(fence.error)}</div>`;
        }
        switch (fence.type) {
            case "data":
            case "yaml":
            case "csv":
                return `<div class="omni-data-loaded">✓ Data loaded: ${fence.result && typeof fence.result === 'object' ? fence.result.stored : fence.attrs.name} (${fence.result && typeof fence.result === 'object' ? fence.result.records : 0} records)</div>`;
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
                return fence.result;
            case "chart":
                return `<div class="omni-chart"><canvas id="${fence.result.chartId}" width="600" height="400"></canvas></div>`;
            default:
                return "";
        }
    }
    markdownToHtml(markdown) {
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
    toHtml(options = {}) {
        const body = this.render();
        const chartScripts = this.scope.charts
            .map((chart) => {
            const { id, config } = chart;
            return this.generateChartScript(id, config);
        })
            .join("\n");
        const themeStyles = options.theme === "dark" ? this.getDarkStyles() : "";
        const cspHeader = options.csp
            ? `<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self' https:;">`
            : "";
        return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  ${cspHeader}
  <title>OmniLang Document</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      max-width: 900px;
      margin: 40px auto;
      padding: 0 20px;
      line-height: 1.6;
      color: #333;
      background: #fff;
    }
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
    ${themeStyles}
  </style>
</head>
<body>
  ${body}

  <script>
    ${chartScripts}
  </script>
</body>
</html>`;
    }
    getDarkStyles() {
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
    generateChartScript(chartId, config) {
        let chartData;
        if (config.x &&
            config.y &&
            Array.isArray(config.data)) {
            chartData = {
                labels: config.data.map((item) => item[config.x]),
                datasets: [
                    {
                        label: config.y,
                        data: config.data.map((item) => item[config.y]),
                        backgroundColor: "rgba(54, 162, 235, 0.5)",
                        borderColor: "rgba(54, 162, 235, 1)",
                        borderWidth: 2,
                    },
                ],
            };
        }
        else if (Array.isArray(config.data) &&
            config.data[0]?.label) {
            chartData = {
                labels: config.data.map((item) => item.label),
                datasets: [
                    {
                        data: config.data.map((item) => item.value),
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
        }
        else {
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
          ${config.type === "bar" || config.type === "line"
            ? `
          scales: {
            y: {
              beginAtZero: true
            }
          }`
            : ""}
        }
      });
    })();
    `;
    }
    getFences() {
        return this.fences;
    }
    getInlineExpressions() {
        return this.inlineExpressions;
    }
    validate() {
        const errors = [];
        for (const fence of this.fences) {
            switch (fence.type) {
                case "data":
                    if (!fence.attrs.name) {
                        errors.push(`Data fence missing required "name" attribute`);
                    }
                    try {
                        JSON.parse(fence.content);
                    }
                    catch {
                        errors.push(`Invalid JSON in data fence: ${fence.attrs.name}`);
                    }
                    break;
                case "chart":
                    if (!fence.attrs.data && !fence.content.trim()) {
                        errors.push("Chart requires either data attribute or inline JSON");
                    }
                    if (fence.attrs.type &&
                        !["bar", "line", "pie", "doughnut", "radar", "polarArea"].includes(fence.attrs.type)) {
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
//# sourceMappingURL=index.js.map