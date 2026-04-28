# Omni Compiler - The Ultimate Programmable Development Environment

**Version:** 1.1.0  
**Status:** Production Ready  
**Vision:** The last compiler you'll ever need - executable documents, NLP code generation, and a complete programming language in one.

---

## Table of Contents

1. [What's New in 1.1.0](#whats-new-in-110)
2. [What is Omni?](#what-is-omni)
3. [Quick Start](#quick-start)
4. [Core Concepts](#core-concepts)
5. [Fence Types Reference](#fence-types-reference)
6. [Programming Languages](#programming-languages)
7. [Data Manipulation](#data-manipulation)
8. [Visualizations](#visualizations)
9. [CLI Commands](#cli-commands)
10. [Lint System](#lint-system)
11. [Security Features](#security-features)
12. [Plugin System](#plugin-system)
13. [API Reference](#api-reference)
14. [Advanced Topics](#advanced-topics)
15. [Troubleshooting](#troubleshooting)
16. [Migration Guide](#migration-guide)

---

## What's New in 1.1.0

This major release introduces four new programming language runtimes and comprehensive error handling:

### New Programming Fence Types

| Fence Type | Description | Status |
|-----------|-------------|--------|
| `omni:lua` | Lua scripting with math, string, table helpers | ✅ New |
| `omni:wasm` | WebAssembly module loading from hex | ✅ New |
| `omni:python` | Python code execution | ✅ New |
| `omni:shader` | GLSL shader compilation | ✅ New |
| `omni:background` | CSS backgrounds: gradient, pattern, noise, mesh, solid | ✅ New |
| `omni:audio` | Audio playback with autoplay, loop, volume | ✅ New |
| `omni:video` | Video playback with controls, poster | ✅ New |
| `omni:image` | Image rendering with lazy loading | ✅ New |
| `omni:animation` | CSS animations with easing | ✅ New |

### Enhanced Error Handling

- **Empty code validation** - Clear error messages for empty fence content
- **WASM magic validation** - Validates `0061736d` WASM magic number
- **Shader type validation** - Supports `fragment`, `vertex`, `compute`, `geometry`
- **Python statement validation** - Requires `return` or assignment

### Bug Fixes

- Fixed FENCE_REGEX to properly capture content across multiple fences
- Changed from greedy `[\s\S]+` to non-greedy `[\s\S]*?`
- Thread-safe regex parsing with `lastIndex` reset

### Helper Functions Added

- `now()` - Current timestamp
- `formatDate(date, format)` - Format dates with custom patterns
- `parseDate(string)` - Parse date strings
- `reduce(array, fn, init)` - Reduce array to single value
- `find(array, predicate)` - Find element by predicate
- `includes(array, value)` - Check array includes value
- `startsWith(string, sub)` - Check string starts with
- `endsWith(string, sub)` - Check string ends with
- `truncate(string, length)` - Truncate string
- `capitalize(string)` - Capitalize first letter
- `camelCase(string)` - Convert to camelCase
- `snakeCase(string)` - Convert to snake_case
- `kebabCase(string)` - Convert to kebab-case
- `uuid()` - Generate UUID

---

## What is Omni?

Omni is a revolutionary development platform that combines:

- 📝 **Executable Markdown** - Documents that execute code
- 🧠 **NLP Code Generation** - Write in natural language, get code
- ⚙️ **Multi-Language Support** - Lua, Python, WASM, GLSL
- 🔌 **Plugin System** - Extend everything
- 🛡️ **Security First** - CSP, sandboxing, linting

### Key Features

1. **Executable Documents** - Code runs wherever the document is viewed
2. **Multiple Languages** - Write in Lua, Python, JavaScript, or GLSL
3. **Interactive Charts** - Built-in visualization engine
4. **NLP Assistant** - Convert English to code
5. **Comprehensive Linting** - 15+ built-in rules

---

## Quick Start

### Installation

```bash
# Install from npm
npm install omni-lang

# Or build from source
git clone https://github.com/your-repo/omni-lang
cd omni-lang
npm install
npm run build
```

### Basic Usage

```bash
# Build a document
omni build my-report.omd

# Build with options
omni build my-report.omd -o output.html --csp --theme dark

# Start interactive REPL
omni-repl

# Lint documents
omni-lint docs/

# Validate documents
omni validate my-report.omd
```

### As a Library

```typescript
import { OmniLang } from 'omni-lang';

const omni = new OmniLang();
omni.parse(`
# My Report

\`\`\`omni:data name="sales"
[{"product": "Widget A", "revenue": 1000}]
\`\`\`

Total: \`omni:inline sum(data.sales, 'revenue')\`
`);

await omni.execute();
const html = omni.toHtml();
```

---

## Core Concepts

### Fence Syntax

Omni uses fenced code blocks with `omni:` prefix:

```markdown
```omni:type attributes
content
```
```

### Types of Fences

| Type | Purpose |
|-----|---------|
| `data` | Define data |
| `compute` | Execute JavaScript |
| `lua` | Execute Lua-like code |
| `python` | Execute Python code |
| `wasm` | Load WebAssembly |
| `shader` | Compile GLSL |
| `chart` | Render charts |
| `table` | Render tables |
| `yaml` | YAML data |
| `csv` | CSV data |
| `fetch` | HTTP data |
| `include` | Include files |
| `http` | HTTP requests |
| `query` | SQL-like queries |

### Inline Expressions

Execute code inline:

```markdown
The total is `omni:inline sum(data.items, 'amount')`.

Hello, `omni:inline "World".toUpperCase()`!
```

---

## Fence Types Reference

### Data Fences

#### JSON Data

```markdown
```omni:data name="users"
[
  {"name": "Alice", "age": 30, "role": "admin"},
  {"name": "Bob", "age": 25, "role": "user"},
  {"name": "Charlie", "age": 35, "role": "user"}
]
```
```

#### YAML Data

```markdown
```omni:yaml name="config"
version: "1.0"
database:
  host: "localhost"
  port: 5432
  ssl: true
```
```

#### CSV Data

```markdown
```omni:csv name="sales"
product,revenue,region
Widget A,1000,North
Widget B,1500,South
Widget C,2000,East
```
```

#### Remote Data

```markdown
```omni:fetch name="api-data"
url="https://api.example.com/data"
method="GET"
```
```

### Execution Fences

#### JavaScript Compute

```markdown
```omni:compute name="total"
const total = sum(data.sales, 'revenue');
const average = total / data.sales.length;
return { total, average, count: data.sales.length };
```
```

See [Built-in Helpers](#built-in-helpers) for available functions.

#### Lua Fence

The Lua fence provides Lua-like scripting with JavaScript execution:

```markdown
```omni:lua name="result"
result = {}
result.value = 42
result.status = "ok"
result.items = {1, 2, 3}
result.data = { name: "test", value: 100 }
```
```

**Lua Features:**
- `result` variable for return value
- `math.*` functions (abs, floor, ceil, max, min, sqrt, pow)
- `string.*` functions (len, sub, upper, lower, find, gsub)
- `table.*` functions (insert, remove, concat, sort)

**Example:**

```markdown
```omni:lua name="math-result"
result = {}
result.abs = math.abs(-5)
result.floor = math.floor(3.7)
result.max = math.max(1, 5, 3)
result.sqrt = math.sqrt(16)
```
```

#### Python Fence

The Python fence executes Python-like code:

```markdown
```omni:python name="result"
return 42
```
```

**Requirements:**
- Last statement must use `return` or assignment
- Returns the result of the last expression

**Example:**

```markdown
```omni:python name="calculation"
x = 10
y = 5
result = x + y
return result
```
```

#### WebAssembly Fence

Load WebAssembly modules from hex-encoded bytes:

```markdown
```omni:audio name="bgm" src="https://example.com/music.mp3" autoplay="true" loop volume="0.5"
```
```

### Video Fence

Embed video playback in your document:

| Attribute | Type | Description |
|-----------|------|-------------|
| `src` | string | Video URL (required) |
| `url` | string | Alternative to src |
| `autoplay` | boolean | Auto-play on load |
| `loop` | boolean | Loop video |
| `muted` | boolean | Muted playback |
| `controls` | boolean | Show controls (default: true) |
| `poster` | string | Thumbnail image URL |
| `preload` | string | Preload mode: `auto`, `metadata`, `none` |
| `format` | string | Video format: `mp4`, `webm`, `ogg`, `mov`, `auto` |
| `name` | string | Store as named variable |

```markdown
```omni:video src="https://example.com/video.mp4"
```
```omni:video name="intro" src="video.mp4" autoplay="true" muted loop
```
```

### Image Fence

Embed images with lazy loading:

| Attribute | Type | Description |
|-----------|------|-------------|
| `src` | string | Image URL (required) |
| `url` | string | Alternative to src |
| `width` | number | Display width |
| `height` | number | Display height |
| `alt` | string | Alt text |
| `lazy` | boolean | Lazy load (default: true) |
| `format` | string | Image format: `jpg`, `png`, `gif`, `webp`, `svg`, `auto` |
| `name` | string | Store as named variable |

```markdown
```omni:image src="https://example.com/photo.png" alt="Description"
```
```omni:image name="pic" src="photo.jpg" width="400" alt="Photo"
```
```

### Animation Fence

Add CSS animations to elements:

| Attribute | Type | Description |
|-----------|------|-------------|
| `name` | string | Animation name |
| `duration` | number | Duration in ms (default: 1000) |
| `easing` | string | Timing function |
| `delay` | number | Delay in ms |
| `iteration` | number | Iterations (default: 1) |
| `direction` | string | Direction: `normal`, `reverse`, `alternate` |
| `fillMode` | string | Fill mode: `forwards`, `backwards`, `both` |

```markdown
```omni:animation name="fade-in" duration="500" easing="ease-in-out"
```
```omni:animation duration="300" delay="100" iteration="infinite"
```
```

---

## Programming Languages

### JavaScript (compute)

```javascript
// Variables
const total = 100;
let count = data.items.length;

// Arrays
const sum = data.items.reduce((a, b) => a + b.amount, 0);
const filtered = data.items.filter(item => item.amount > 100);
const mapped = data.items.map(item => item.name);

// Objects
const keys = Object.keys(obj);
const values = Object.values(obj);
const entries = Object.entries(obj);

// Return values
return { total, count, average: sum / count };
```

### Lua

```lua
-- Basic assignment
result = 42

-- Tables/Objects
result = {}
result.value = 100
result.items = {1, 2, 3}

-- Math operations
result = math.abs(-5)
result = math.floor(3.7)
result = math.max(1, 2, 3)

-- String operations
result = string.upper("hello")
result = string.len("test")
```

### Python

```python
# Return statement (required)
return 42

# Variables
x = 10
y = 5
result = x + y
```

---

## Data Manipulation

### Built-in Helpers

#### Array Helpers

```javascript
len(arr)                    // Length of array
sum(arr, field?)            // Sum numbers
avg(arr, field?)           // Average
max(arr, field?)            // Maximum
min(arr, field?)           // Minimum
filter(arr, fn)            // Filter by function
map(arr, fn)              // Map array
sort(arr, field?)          // Sort by field
unique(arr)               // Unique values
flatten(arr)               // Flatten nested
reduce(arr, fn, init)     // Reduce to value
find(arr, fn)             // Find element
includes(arr, value)      // Check includes
```

#### Object Helpers

```javascript
pick(obj, 'field1,field2')  // Pick fields
omit(obj, 'field1')          // Omit fields
merge(obj1, obj2)           // Merge objects
```

#### String Helpers

```javascript
capitalize(str)       // Capitalize first letter
camelCase(str)       // Convert to camelCase
snakeCase(str)       // Convert to snake_case
kebabCase(str)      // Convert to kebab-case
truncate(str, len)  // Truncate string
startsWith(str, sub) // Check prefix
endsWith(str, sub)   // Check suffix
```

#### Date Helpers

```javascript
now()                      // Current timestamp
formatDate(date, format)   // Format with YYYY-MM-DD HH:mm:ss
parseDate(str)             // Parse date string
```

#### Utility Helpers

```javascript
uuid()       // Generate UUID
sleep(ms)    // Async sleep
debounce(fn) // Debounce function
throttle(fn) // Throttle function
```

### Aggregation Functions

```javascript
// Group by field
groupBy(data.items, 'category')

// Pivot data
pivot(data.items, 'row', 'col', 'value')

// Rolling calculations
rolling(data.items, 'amount', 'sum', 7)
```

### Filtering

```javascript
// Filter by condition
filter(data.items, item => item.amount > 100)

// Filter by field
filterBy(data.items, 'category', 'electronics')

// Filter by range
filterRange(data.items, 'amount', 100, 200)
```

---

## Visualizations

### Chart Types

| Type | Description |
|------|-------------|
| `line` | Line chart |
| `bar` | Bar chart |
| `pie` | Pie chart |
| `doughnut` | Doughnut chart |
| `radar` | Radar chart |
| `scatter` | Scatter plot |
| `bubble` | Bubble chart |
| `polarArea` | Polar area |

### Chart Code

```markdown
```omni:chart type="bar" data="sales" x="product" y="revenue"
title="Sales by Product"
colors='["#ff6384", "#36a2eb", "#ffcd56"]'
```
```

### Table Code

```markdown
```omni:table data="users" columns="name,email,role"
sortable="true"
pageSize="10"
```
```

### Inline Charts

```markdown
`omni:inline chart(data.sales, 'bar')`
```

---

## CLI Commands

### Build Command

```bash
# Basic build
omni build <file.omd>

# With output
omni build <file.omd> -o output.html

# With options
omni build <file.omd> --csp --theme dark

# Watch mode
omni watch <file.omd>
```

### Options

| Option | Description | Default |
|--------|-------------|---------|
| `-o, --output` | Output file path | Inferred from input |
| `-t, --theme` | Theme: light, dark | light |
| `--csp` | Enable CSP header | false |
| `--base-path` | Base path for includes | . |
| `--allowed-domain` | Allowed domains | All |
| `-v, --verbose` | Verbose output | false |

### Validate Command

```bash
omni validate <file.omd>

# JSON output
omni validate --format json <file.omd>
```

### Lint Command

```bash
# Basic lint
omni-lint <files...>

# With config
omni-lint -c .omnilintrc <files...>

# Auto-fix
omni-lint --fix <files...>

# JSON output
omni-lint --format json <files...>
```

### REPL Commands

```bash
# Start REPL
omni-repl

# Commands inside REPL
.help           Show this help
.load <file>    Load and execute file
.save <file>     Save session
.clear          Clear screen
.history        Show history
.ast <expr>     Show AST
.tokens <expr>  Show tokens
.compile <code> Compile code
.nlp <prompt>   Process NLP
.data <name>    Show data
.quit/.exit    Exit
```

---

## Lint System

### Built-in Rules

| Rule | Description | Severity |
|------|-------------|----------|
| OM001 | Unnamed data blocks | warning |
| OM002 | Use of eval() | error |
| OM003 | Missing name attribute | error |
| OM004 | Empty data blocks | warning |
| OM005 | Invalid JSON | error |
| OM006 | Undefined data reference | error |
| OM007 | Suspicious names | warning |
| OM008 | Circular dependencies | error |
| OM009 | HTTP (not HTTPS) | info |
| OM010 | Hardcoded credentials | error |
| OM011 | Unsafe HTML | warning |
| OM012 | Missing alt text | warning |
| OM013 | Empty compute blocks | warning |
| OM014 | Deep nesting | info |
| OM015 | Unsupported chart type | error |

### Configuration

```json
{
  "rules": {
    "OM001": "warning",
    "OM002": "error",
    "OM003": "off"
  },
  "exclude": ["node_modules/", "dist/"]
}
```

---

## Security Features

### Timeout Enforcement

```typescript
const omni = new OmniLang({
  timeout: 5000  // 5 second limit
});
```

### Domain Allowlist

```typescript
const omni = new OmniLang({
  allowedDomains: ['api.example.com', 'cdn.example.com']
});
```

### CSP Headers

```typescript
const html = omni.toHtml({
  csp: true
});
```

Output includes:
```
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';
```

### Path Validation

- Prevents directory traversal (`../`)
- Validates include paths
- Resolves relative to base path

### HTML Escaping

All user content is escaped to prevent XSS:
- `<` → `&lt;`
- `>` → `&gt;`
- `"` → `&quot;`
- `'` → `&#039;`

---

## Plugin System

### Creating Plugins

```typescript
import { OmniLang, Plugin } from 'omni-lang';

const myPlugin: Plugin = {
  name: 'my-plugin',
  version: '1.0.0',
  helpers: {
    myHelper: (input: unknown) => {
      return input;
    },
    processData: (data: unknown[], options: Options) => {
      return data.filter(item => item.active);
    }
  },
  hooks: {
    beforeExecute: (fence) => {
      console.log(`Executing: ${fence.type}`);
    },
    afterExecute: (fence) => {
      console.log(`Completed: ${fence.type}`);
    }
  }
};

const omni = new OmniLang({
  plugins: [myPlugin]
});
```

### Helper Context

Helpers have access to:

```typescript
// In helpers
helpers.myHelper(input)  // Other helpers
data.users              // Data scope
computed.total         // Computed values
```

### Hook Types

| Hook | Timing | Access |
|------|--------|---------|
| `beforeParse` | Before parsing | markdown |
| `afterParse` | After parsing | fences |
| `beforeExecute` | Before fence execution | fence |
| `afterExecute` | After fence execution | fence, result |
| `beforeRender` | Before HTML render | markdown |
| `afterRender` | After HTML render | html |

---

## API Reference

### OmniLang Class

```typescript
interface OmniLangOptions {
  strict?: boolean;           // Throw on errors
  timeout?: number;           // Execution timeout (ms)
  basePath?: string;         // Base path for includes
  allowedDomains?: string[]; // Allowed domains
  fetchTimeout?: number;     // Fetch timeout (ms)
  maxMemory?: number;        // Memory limit (bytes)
  plugins?: Plugin[];       // Plugin array
}

interface RenderOptions {
  theme?: 'light' | 'dark';
  csp?: boolean;
  basePath?: string;
}
```

#### Methods

```typescript
// Parse markdown
parse(markdown: string): OmniLang

// Execute all fences
execute(): Promise<OmniLang>

// Render to HTML
toHtml(options?: RenderOptions): string

// Get fences
getFences(): Fence[]

// Access scope
scope: {
  data: Record<string, unknown>;
  computed: Record<string, unknown>;
  charts: Chart[];
  functions: Record<string, Function>;
  variables: Record<string, unknown>;
}
```

### Fence Interface

```typescript
interface Fence {
  type: string;
  attrs: Record<string, string>;
  content: string;
  position: number;
  fullMatch: string;
  result?: unknown;
  executed?: boolean;
  error?: string;
  dependencies?: string[];
}
```

### Compiler Class

```typescript
import { Compiler } from 'omni-lang/compiler';

const compiler = new Compiler();

// Single compilation
const { code, ast, tokens } = compiler.compile(sourceCode);

// Incremental compilation
compiler.parse(sourceCode);
const tokens = compiler.tokens;
const ast = compiler.ast;
```

### Linter Class

```typescript
import { Linter } from 'omni-lang/linter';

const linter = new Linter();

// With config
const result = linter.lint(fences, content, config);

// Get issues
for (const issue of result.issues) {
  console.log(`${issue.rule}: ${issue.message}`);
}
```

### NLPEngine Class

```typescript
import { NLPEngine } from 'omni-lang/nlp';

const nlp = new NLPEngine();

// Process natural language
const result = nlp.process('create a chart of sales by region');
// result.code    -> Generated code
// result.type    -> Fence type
// result.intents -> Detected intents
// result.entities -> Extracted entities
```

---

## Advanced Topics

### Performance Optimization

#### Caching Results

```typescript
const omni = new OmniLang({
  plugins: [{
    name: 'cache',
    hooks: {
      afterExecute: (fence) => {
        if (fence.type === 'data' && fence.attrs.name) {
          cache.set(fence.attrs.name, fence.result);
        }
      }
    }
  }]
});
```

#### Lazy Evaluation

```typescript
// Use compute only when needed
`omni:inline shouldCompute && sum(data.items, 'amount')`
```

### Custom Fence Types

```typescript
// Extend via plugin
const customPlugin: Plugin = {
  name: 'custom',
  hooks: {
    beforeExecute: (fence) => {
      if (fence.type === 'custom') {
        fence.result = processCustomFence(fence.content);
      }
    }
  }
};
```

### Error Handling

```typescript
// Strict mode throws
const omni = new OmniLang({ strict: true });
try {
  omni.parse(markdown);
  await omni.execute();
} catch (e) {
  console.error(e.message);
}

// Non-strict mode collects errors
const omni = new OmniLang({ strict: false });
await omni.execute();
for (const fence of omni.getFences()) {
  if (fence.error) {
    console.error(`${fence.type}: ${fence.error}`);
  }
}
```

### Debugging

```bash
# Verbose output
omni build my-report.omd --verbose

# Lint with details
omni-lint -v my-report.omd

# REPL debugging
omni-repl
> .tokens my code
> .ast my expression
> .compile my code
```

---

## Troubleshooting

### Common Issues

#### Empty Fence Content

**Error:** "X fence requires code"

**Solution:** Add content to the fence:
```markdown
```omni:python
return 42
```
```

#### Python Last Statement

**Error:** 'python fence: last statement must use "return"'

**Solution:** Use explicit return:
```markdown
```omni:python
x = 10
return x
```
```

#### Invalid WASM Hex

**Error:** 'invalid WASM magic'

**Solution:** Use valid WASM bytes starting with `0061736d`:
```markdown
```omni:wasm hex="0061736d01000000"
```
```

#### Shader Type

**Error:** 'invalid type "X"'

**Solution:** Use valid type:
```
fragment, vertex, compute, geometry
```

#### Multiple Fences Not Parsing

**Issue:** Only first fence is parsed

**Solution:** Ensure code block closes properly:
```markdown
```omni:data
[1]
```

```omni:compute
return 1
```
```
Note: Each code block must close with ```

```

### Debugging Steps

1. **Check fence syntax**
   ```bash
   omni validate my-report.omd
   ```

2. **Enable verbose output**
   ```bash
   omni build my-report.omd --verbose
   ```

3. **Run lint**
   ```bash
   omni-lint my-report.omd
   ```

4. **Test simple cases**
   ```bash
   # Test data
   echo '```omni:data
   [1]
   ```' | omni build -
   
   # Test compute
   echo '```omni:compute
   return 1
   ```' | omni build -
   ```

---

## Migration Guide

### From 1.0.x to 1.1.0

#### New Fence Types

Existing code works unchanged. New fences require different syntax:

**Lua:**
```markdown
# Old (not valid in lua fence)
result = 42

# New fence
```omni:lua
result = 42
```
```

**Python:**
```markdown
# Old (compute fence)
```omni:compute
return 42
```

# New (python fence)
```omni:python
return 42
```
```

#### Regex Changes

FENCE_REGEX was updated for multi-fence support. If you experience parsing issues:
- Ensure code blocks close properly
- Don't use nested backticks in content

### Configuration Changes

New options in 1.1.0:

```typescript
const omni = new OmniLang({
  timeout: 5000,           // Compute timeout
  allowedDomains: [],      // Domain allowlist
  fetchTimeout: 10000       // Fetch timeout
});
```

---

## Examples

### Example 1: Sales Report

```markdown
# Q4 Sales Report

\`\`\`omni:data name="sales"
[
  {"product": "Widget A", "revenue": 12500, "region": "North", "quarter": "Q4"},
  {"product": "Widget B", "revenue": 8200, "region": "South", "quarter": "Q4"},
  {"product": "Widget C", "revenue": 15700, "region": "East", "quarter": "Q4"},
  {"product": "Widget D", "revenue": 9100, "region": "West", "quarter": "Q4"}
]
```
\`\`\`

## Summary

Total Revenue: \`omni:inline sum(data.sales, 'revenue')\`

Average: \`omni:inline avg(data.sales, 'revenue')\`

## By Region

\`\`\`omni:chart type="bar" data="sales" x="region" y="revenue"
title="Sales by Region"
colors='["#0066cc", "#ff6600", "#66cc00", "#cc0066"]'
```
\`\`\`

## Top Products

\`\`\`omni:compute name="top"
const sorted = sort(data.sales, 'revenue', 'desc');
return sorted.slice(0, 3);
```
\`\`\`

### Example 2: Custom Analysis

```markdown
# Custom Analysis

\`\`\`omni:compute name="analysis"
const total = sum(data.sales, 'revenue');
const byRegion = groupBy(data.sales, 'region');
const byProduct = groupBy(data.sales, 'product');

const regionTotals = Object.entries(byRegion).map(([region, items]) => ({
  region,
  total: sum(items, 'revenue'),
  count: len(items)
}));

return {
  total,
  byRegion: regionTotals,
  topRegions: sort(regionTotals, 'total', 'desc').slice(0, 5)
};
```
\`\`\`

### Example 3: Lua Scripting

```markdown
# Lua Processing

\`\`\`omni:lua name="math-demo"
result = {
  abs: math.abs(-42),
  floor: math.floor(3.14),
  ceil: math.ceil(3.14),
  max: math.max(1, 5, 10),
  min: math.min(1, 5, 10),
  sqrt: math.sqrt(16),
  pow: math.pow(2, 8)
}
```
\`\`\`

### Example 4: GLSL Shader

```markdown
# Shader Visualization

\`\`\`omni:shader name="gradient" type="fragment"
precision mediump float;
uniform float time;
varying vec2 vUv;

void main() {
  float r = sin(time + vUv.x * 3.14159) * 0.5 + 0.5;
  float g = cos(time + vUv.y * 3.14159) * 0.5 + 0.5;
  float b = sin(time + (vUv.x + vUv.y) * 3.14159) * 0.5 + 0.5;
  gl_FragColor = vec4(r, g, b, 1.0);
}
```
\`\`\`

---

## Appendix

### File Extensions

| Extension | Description |
|-----------|-------------|
| `.omd` | Omni Markdown |
| `.oml` | Omni Lang (legacy) |
| `.omli` | Omni Lang Include |

### MIME Types

| Type | Description |
|------|-------------|
| `text/x-omni` | Omni Markdown |

### Related Projects

- [omni-lang](https://github.com/omni-lang/omni-lang) - Main repository
- [omni-vscode](https://github.com/omni-lang/vscode) - VS Code extension
- [omni-cli](https://github.com/omni-lang/cli) - CLI tools

### Contributing

See CONTRIBUTING.md for contribution guidelines.

---

## License

MIT License - Copyright (c) 2024 Omni Lang Contributors

---

# Appendix A: Complete API Reference

## OmniLang API

### Constructor Options

```typescript
interface OmniLangOptions {
  /** Throw exceptions on errors instead of collecting them */
  strict: boolean;
  
  /** Maximum execution time in milliseconds */
  timeout: number;
  
  /** Base path for resolving includes */
  basePath: string;
  
  /** List of allowed domains for fetch operations */
  allowedDomains: string[];
  
  /** Timeout for fetch operations in milliseconds */
  fetchTimeout: number;
  
  /** Maximum memory allocation in bytes */
  maxMemory: number;
  
  /** Custom plugins to extend functionality */
  plugins: Plugin[];
  
  /** Custom helper functions */
  helpers: Record<string, Function>;
}
```

### Properties

```typescript
// Fences parsed from the document
fences: Fence[];

// Inline expressions found
inlineExpressions: InlineExpression[];

// Original markdown content
markdown: string;

// Scope containing data, computed values, charts
scope: Scope;

// Configuration options
options: OmniLangOptions;

// Plugins loaded
plugins: Map<string, Plugin>;
```

### Methods

#### parse(markdown: string): OmniLang

Parse markdown and extract fences:

```typescript
const omni = new OmniLang();
omni.parse(`
# My Document

\`\`\`omni:data name="items"
[1, 2, 3]
\`\`\`
`);

console.log(omni.fences.length); // 1
console.log(omni.fences[0].type); // "data"
```

#### execute(): Promise<OmniLang>

Execute all fences in order:

```typescript
await omni.execute();
console.log(omni.scope.data.items); // [1, 2, 3]
```

#### executeFence(fence: Fence): Promise<unknown>

Execute a single fence:

```typescript
const result = await omni.executeFence(omni.fences[0]);
```

#### toHtml(options?: RenderOptions): string

Render the document to HTML:

```typescript
const html = omni.toHtml({
  theme: 'dark',
  csp: true
});
```

#### getFences(): Fence[]

Get all parsed fences:

```typescript
const fences = omni.getFences();
fences.forEach(f => console.log(f.type, f.attrs.name));
```

#### getScope(): Scope

Get execution scope:

```typescript
const { data, computed, charts } = omni.getScope();
```

#### hasPlugin(name: string): boolean

Check if plugin is loaded:

```typescript
if (omni.hasPlugin('my-plugin')) {
  // Plugin is available
}
```

---

## Appendix B: Fence Attributes Reference

### Data Fence Attributes

| Attribute | Type | Description | Required |
|-----------|------|-------------|----------|
| `name` | string | Variable name for stored data | Yes |
| `format` | string | Data format (json, yaml, csv) | No |
| `cache` | boolean | Cache the data | No |
| `ttl` | number | Cache TTL in seconds | No |

### Compute Fence Attributes

| Attribute | Type | Description | Required |
|-----------|------|-------------|----------|
| `name` | string | Variable name for result | No |
| `async` | boolean | Execute asynchronously | No |
| `timeout` | number | Custom timeout | No |

### Chart Fence Attributes

| Attribute | Type | Description | Required |
|-----------|------|-------------|----------|
| `type` | string | Chart type (bar, line, pie, etc.) | Yes |
| `data` | string | Data source name | Yes |
| `x` | string | X-axis field | Yes |
| `y` | string | Y-axis field | Yes |
| `title` | string | Chart title | No |
| `colors` | string | Color palette (JSON array) | No |
| `labels` | string | Custom labels | No |
| `stacked` | boolean | Stacked chart | No |
| `percentage` | boolean | Show percentages | No |

### Table Fence Attributes

| Attribute | Type | Description | Required |
|-----------|------|-------------|----------|
| `data` | string | Data source name | Yes |
| `columns` | string | Column names (comma-separated) | No |
| `sortable` | boolean | Enable sorting | No |
| `pageSize` | number | Items per page | No |
| `filterable` | boolean | Enable filtering | No |
| `exportable` | boolean | Enable export | No |

### Fetch Fence Attributes

| Attribute | Type | Description | Required |
|-----------|------|-------------|----------|
| `name` | string | Variable name | No |
| `url` | string | URL to fetch | Yes |
| `method` | string | HTTP method | No |
| `headers` | string | Headers (JSON) | No |
| `body` | string | Request body | No |

### Lua Fence Attributes

| Attribute | Type | Description | Required |
|-----------|------|-------------|----------|
| `name` | string | Result variable name | No |

### Python Fence Attributes

| Attribute | Type | Description | Required |
|-----------|------|-------------|----------|
| `name` | string | Result variable name | No |

### WASM Fence Attributes

| Attribute | Type | Description | Required |
|-----------|------|-------------|----------|
| `name` | string | Module name | No |
| `hex` | string | Hex-encoded WASM bytes | Yes |

### Shader Fence Attributes

| Attribute | Type | Description | Required |
|-----------|------|-------------|----------|
| `name` | string | Shader name | No |
| `type` | string | Shader type (fragment|vertex|compute|geometry) | No |

---

## Appendix C: Helper Function Reference

### Array Helpers

#### len(arr: unknown[]): number

```javascript
len([1, 2, 3]) // 3
len("hello") // 5
```

#### sum(arr: T[], field?: keyof T): number

```javascript
sum([1, 2, 3]) // 6
sum(data.items, 'amount') // 1500
```

#### avg(arr: T[], field?: keyof T): number

```javascript
avg([1, 2, 3]) // 2
avg(data.items, 'price') // 49.99
```

#### max(arr: T[], field?: keyof T): number

```javascript
max([1, 2, 3]) // 3
max(data.items, 'amount')
```

#### min(arr: T[], field?: keyof T): number

```javascript
min([1, 2, 3]) // 1
min(data.items, 'amount')
```

#### filter(arr: T[], predicate: (item: T) => boolean): T[]

```javascript
filter(data.items, item => item.amount > 100)
```

#### map<U>(arr: T[], mapper: (item: T) => U): U[]

```javascript
map(data.items, item => item.name)
```

#### sort(arr: T[], field?: keyof T, direction?: 'asc'|'desc'): T[]

```javascript
sort(data.items, 'name')
sort(data.items, 'amount', 'desc')
```

#### unique(arr: T[]): T[]

```javascript
unique(data.items, 'category')
```

#### flatten(arr: any[]): any[]

```javascript
flatten([[1, 2], [3, 4]]) // [1, 2, 3, 4]
```

#### reduce<R>(arr: T[], reducer: (acc: R, item: T, index: number) => R, initial: R): R

```javascript
reduce(data.items, (sum, item) => sum + item.amount, 0)
```

#### find<T>(arr: T[], predicate: (item: T) => boolean): T | undefined

```javascript
find(data.items, item => item.id === 1)
```

#### includes<T>(arr: T[], value: T): boolean

```javascript
includes([1, 2, 3], 2) // true
includes(['a', 'b'], 'c') // false
```

### Object Helpers

#### pick<T>(obj: T, fields: string): Partial<T>

```javascript
pick(user, 'name,email,role')
```

#### omit<T>(obj: T, fields: string): Partial<T>

```javascript
omit(user, 'password,token')
```

#### merge<T>(...objects: T[]): T

```javascript
merge(defaults, overrides)
```

### String Helpers

#### capitalize(str: string): string

```javascript
capitalize("hello") // "Hello"
```

#### camelCase(str: string): string

```javascript
camelCase("hello world") // "helloWorld"
camelCase("hello-world") // "helloWorld"
camelCase("hello_world") // "helloWorld"
```

#### snakeCase(str: string): string

```javascript
snakeCase("helloWorld") // "hello_world"
snakeCase("hello world") // "hello_world"
```

#### kebabCase(str: string): string

```javascript
kebabCase("helloWorld") // "hello-world"
kebabCase("hello world") // "hello-world"
```

#### truncate(str: string, length: number): string

```javascript
truncate("hello world", 5) // "hello..."
```

#### startsWith(str: string, sub: string): boolean

```javascript
startsWith("hello", "hel") // true
startsWith("hello", "wor") // false
```

#### endsWith(str: string, sub: string): boolean

```javascript
endsWith("hello", "llo") // true
endsWith("hello", "ell") // false
```

### Date Helpers

#### now(): number

```javascript
now() // 1704067200000
```

#### formatDate(date: Date | number, format?: string): string

```javascript
formatDate(1704067200000) // "2024-01-01T00:00:00.000Z"
formatDate(1704067200000, "YYYY-MM-DD") // "2024-01-01"
formatDate(1704067200000, "YYYY-MM-DD HH:mm") // "2024-01-01 00:00"
```

#### parseDate(str: string): Date

```javascript
parseDate("2024-01-01") // Date object
```

### Utility Helpers

#### uuid(): string

```javascript
uuid() // "550e8400-e29b-41d4-a716-446655440000"
```

#### sleep(ms: number): Promise<void>

```javascript
await sleep(1000) // Wait 1 second
```

### Math Helpers (available in compute/math)

```javascript
math.abs(-5)        // 5
math.floor(3.7)      // 3
math.ceil(3.2)      // 4
math.max(1, 2, 3)   // 3
math.min(1, 2, 3)   // 1
math.random()       // 0.123456789
math.sqrt(16)       // 4
math.pow(2, 8)      // 256
math.sin(0)         // 0
math.cos(0)         // 1
math.PI             // 3.14159...
```

### String Helpers (available in compute/string)

```javascript
string.len("hello")             // 5
string.sub("hello", 1, 3)       // "el"
string.find("hello", "el")       // [2, 4]
string.gsub("hello", "l", "r")  // "herro"
string.upper("hello")           // "HELLO"
string.lower("HELLO")           // "hello"
```

### Table Helpers (available in compute/table)

```javascript
table.insert(arr, value)
value = table.remove(arr)
value = table.concat(arr, ",")
table.sort(arr)
```

### Lua Math Helpers

```javascript
math.abs(-5)           // 5
math.floor(3.7)         // 3
math.ceil(3.2)          // 4
math.max(1, 2, 3)       // 3
math.min(1, 2, 3)     // 1
math.random()           // 0.123...
math.sqrt(16)          // 4
math.pow(2, 8)         // 256
math.sin(0)            // 0
math.cos(0)            // 1
```

### Lua String Helpers

```javascript
string.len("test")           // 4
string.sub("hello", 1, 3)    // "hel"
string.upper("hello")        // "HELLO"
string.lower("HELLO")        // "hello"
string.find("hello", "el")  // [2, 4]
string.gsub("hello", "l", "r") // "herro"
```

### Lua Table Helpers

```javascript
table.insert(arr, value)
value = table.remove(arr, index)
value = table.concat(arr, ",")
table.sort(arr)
```

---

## Appendix D: Error Codes

### Execution Errors

| Code | Message | Description |
|------|---------|-------------|
| E001 | "Execution timeout after Xms" | Fence took too long |
| E002 | "X not defined" | Reference to undefined variable |
| E003 | "Invalid JSON in X" | Malformed JSON data |
| E004 | "Circular dependency: X" | Circular fence dependency |
| E005 | "Fetch failed: X" | HTTP request failed |
| E006 | "Include failed: X" | File include failed |

### Validation Errors

| Code | Message | Description |
|------|---------|-------------|
| V001 | "X fence requires code" | Empty fence content |
| V002 | "Missing required attribute: X" | Missing attribute |
| V003 | "Invalid attribute value: X" | Invalid attribute value |
| V004 | "Invalid chart type: X" | Unknown chart type |
| V005 | "Invalid shader type: X" | Unknown shader type |

### Lua Errors

| Code | Message | Description |
|------|---------|-------------|
| L001 | "Lua error: X" | Lua execution error |

### WASM Errors

| Code | Message | Description |
|------|---------|-------------|
| W001 | "wasm fence requires hex attribute" | Missing hex |
| W002 | "invalid WASM magic" | Invalid WASM header |
| W003 | "wasm fence: invalid hex string" | Invalid hex chars |

### Python Errors

| Code | Message | Description |
|------|---------|-------------|
| P001 | "Python error: X" | Python execution error |
| P002 | "python fence requires code" | Empty code |
| P003 | "last statement must use return" | Missing return |

### Shader Errors

| Code | Message | Description |
|------|---------|-------------|
| S001 | "shader fence requires GLSL code" | Empty shader |
| S002 | "invalid type X" | Invalid shader type |

---

## Appendix E: Configuration Files

### omnirc

```json
{
  "version": "1.1.0",
  "options": {
    "strict": false,
    "timeout": 5000,
    "basePath": ".",
    "theme": "light"
  },
  "rules": {
    "OM001": "warning",
    "OM002": "error",
    "OM003": "error",
    "OM004": "off",
    "OM005": "error"
  },
  "exclude": ["node_modules/", "dist/"],
  "allowedDomains": ["api.example.com"]
}
```

### .omnilintrc

```json
{
  "extends": "omnirc",
  "rules": {
    "OM002": "off"
  }
}
```

---

## Appendix F: Performance Tuning

### Execution Speed

```typescript
// Use strict mode for faster error collection
const omni = new OmniLang({ strict: true });

// Avoid unnecessary data copying
const data = largeArray; // Reference, not copy

// Use lazy evaluation
`omni:inline expensive() && result`
```

### Memory Management

```typescript
// Limit scope size
const omni = new OmniLang({ maxMemory: 100 * 1024 * 1024 });

// Delete unused computed values
delete omni.scope.computed.intermediate;

// Clear charts if not needed
omni.scope.charts = [];
```

### Caching

```typescript
// Enable caching for static data
```omni:data name="static" cache="true" ttl="3600"
[1, 2, 3]
```
```

---

## Appendix G: Testing Guide

### Unit Tests

```typescript
import { describe, it, expect } from 'vitest';
import { OmniLang } from './src/index.js';

describe('OmniLang', () => {
  it('should parse data fences', () => {
    const omni = new OmniLang();
    omni.parse('```omni:data name="x"\n[1,2,3]\n```');
    expect(omni.fences[0].type).toBe('data');
  });

  it('should execute compute fences', async () => {
    const omni = new OmniLang();
    omni.parse('```omni:compute\nreturn 42\n```');
    await omni.execute();
    expect(omni.fences[0].executed).toBe(true);
  });
});
```

### Integration Tests

```typescript
describe('Integration', () => {
  it('should process full document', async () => {
    const omni = new OmniLang({ strict: false });
    omni.parse(readTestFile('sales-report.omd'));
    await omni.execute();
    const html = omni.toHtml();
    expect(html).toContain('<!DOCTYPE html>');
  });
});
```

---

## Appendix H: Best Practices

### Document Organization

1. **Data First** - Define data before using it
2. **Clear Naming** - Use descriptive names
3. **Comment Complex** - Document complex computations
4. **Modular** - Break into reusable components

### Performance

1. **Limit Scope** - Keep data sizes reasonable
2. **Cache Static** - Use cache for unchanged data
3. **Lazy Evaluate** - Use inline conditions

### Security

1. **Validate Input** - Always validate external data
2. **Limit Fetch** - Use allowed domains
3. **Escape Output** - Enable HTML escaping

---

## Appendix I: Recipe Book

### Recipe 1: Responsive Chart

```markdown
# My Chart

\`\`\`omni:data name="sales"
[{"product": "A", "sales": 100}, {"product": "B", "sales": 200}]
\`\`\`

\`\`\`omni:chart type="bar" data="sales" x="product" y="sales"
responsive="true"
height="400"
\`\`\`
```

### Recipe 2: Filtered Table

```markdown
# My Table

\`\`\`omni:data name="users"
[{"name": "Alice", "role": "admin"}, {"name": "Bob", "role": "user"}]
\`\`\`

\`\`\`omni:table data="users" columns="name,role"
filterable="true"
sortable="true"
pageSize="10"
\`\`\`
```

### Recipe 3: Computed Analytics

```markdown
# Analytics

\`\`\`omni:data name="transactions"
[{"date": "2024-01", "amount": 100}, {"date": "2024-02", "amount": 150}]
\`\`\`

\`\`\`omni:compute name="summary"
const total = sum(data.transactions, 'amount');
const avg = total / data.transactions.length;
const byMonth = groupBy(data.transactions, 'date');
return { total, avg, byMonth, count: len(data.transactions) };
\`\`\`
```

### Recipe 4: Lua Math Operations

```markdown
# Lua Math

\`\`\`omni:lua name="operations"
result = {
  abs: math.abs(-42),
  floor: math.floor(3.14159),
  ceil: math.ceil(3.14159),
  max: math.max(10, 20, 30),
  min: math.min(10, 20, 30),
  sqrt: math.sqrt(144),
  pow: math.pow(2, 10)
}
\`\`\`
```

### Recipe 5: GLSL Fragment Shader

```markdown
# Shader

\`\`\`omni:shader name="color-shift" type="fragment"
precision mediump float;
uniform float time;
uniform vec3 color;
varying vec2 vUv;

void main() {
  float shift = sin(time + vUv.x * 3.14159) * 0.5;
  vec3 shifted = color + vec3(shift, shift * 0.5, 0.0);
  gl_FragColor = vec4(shifted, 1.0);
}
\`\`\`
```

### Recipe 6: Python Data Processing

```markdown
# Python Processing

\`\`\`omni:python name="stats"
numbers = [1, 2, 3, 4, 5]
total = sum(numbers)
average = total / len(numbers)
return { total: total, average: average, count: len(numbers) }
\`\`\`
```

### Recipe 7: WASM Module

```markdown
# WASM

\`\`\`omni:wasm name="utils" hex="0061736d01000000080300000000000000"
\`\`\`
```

### Recipe 8: HTTP API Call

```markdown
# API Data

\`\`\`omni:fetch name="api-data"
url="https://api.example.com/data"
method="GET"
\`\`\`
```

---

## Appendix J: Troubleshooting Flowcharts

### Issue: Fence Not Executing

```
START
↓
Is fence.parsed? → NO → Check parse errors
↓
Is fence.executed? → NO → Check execution order
↓
Is there an.error? → YES → Fix error, retry
↓
Is dependency ready? → NO → Check data/computed scope
↓
END
```

### Issue: Invalid Output

```
START
↓
Is data correct? → NO → Debug data fence
↓
Is computation correct? → NO → Debug compute fence
↓
Is render correct? → NO → Check toHtml options
↓
Search issue → Check fence.result
↓
END
```

### Issue: Performance

```
START
↓
Check execution time
↓
Is timeout? → YES → Simplify computation, increase timeout
↓
Check memory
↓
Is memory high? → YES → Reduce data size
↓
Profile code → Check with --verbose
↓
END
```

---

## Appendix K: Glossary

| Term | Definition |
|------|------------|
| Fence | Code block in markdown with `omni:` prefix |
| Inline | Code executing inline in text |
| Scope | Object containing data, computed, charts |
| Compute | Execute JavaScript code |
| Lua | Lua-like scripting fence |
| Python | Python-like execution fence |
| WASM | WebAssembly module loading |
| Shader | GLSL shader compilation |
| Parser | Markdown to fence converter |
| Executor | Fence execution engine |
| Renderer | Fence to HTML converter |

---

## Appendix L: Version History

### 1.1.0 (Current)

- Added lua fence type
- Added python fence type  
- Added wasm fence type
- Added shader fence type
- Enhanced error handling
- Bug fixes for multi-fence parsing

### 1.0.1

- Thread-safe regex
- Compute timeout enforcement
- 15+ new helper functions
- CLI --fix and --config flags

### 1.0.0

- Initial release
- Core fence types (data, compute, chart, table)
- NLP code generation
- Plugin system
- Lint rules