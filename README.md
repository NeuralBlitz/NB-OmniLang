# Omni Compiler - The Ultimate Programmable Development Environment

**Version:** 1.0.0  
**Status:** Production Ready  
**Vision:** The last compiler you'll ever need - executable documents, NLP code generation, and a complete programming language in one.

---

## What is Omni?

Omni is a revolutionary development platform that combines:

- 📝 **Executable Markdown** - Documents that execute code
- 🧠 **NLP Code Generation** - Write in natural language, get code
- ⚙️ **Full Programming Language** - Compile, lint, and run code
- 🔌 **Plugin System** - Extend everything
- 🛡️ **Security First** - CSP, sandboxing, linting

## Quick Start

```bash
# Install
npm install omni-lang

# Build a document
omni build my-report.omd

# Start interactive REPL
omni-repl

# Lint documents
omni-lint docs/

# Process natural language
omni-repl
> .nlp create a chart showing sales by region
```

## Features

### 1. Executable Markdown

Write documents that execute code inline:

```markdown
# Sales Report

```omni:data name="sales"
[
  {"product": "Widget A", "revenue": 1000, "region": "North"},
  {"product": "Widget B", "revenue": 1500, "region": "South"}
]
```

## Summary

Total Revenue: $`omni:inline sum(data.sales, 'revenue')`

## Charts

```omni:chart type="bar" data="sales" x="product" y="revenue"
```
```

#### Supported Data Formats

| Format | Fence Type | Example |
|--------|------------|---------|
| JSON | `omni:data` | `[{"key": "value"}]` |
| YAML | `omni:yaml` | `key: value` |
| CSV | `omni:csv` | `col1,col2\nval1,val2` |
| Remote | `omni:fetch` | url="https://api.example.com/data" |
| Include | `omni:include` | src="./data.json" |

### 2. NLP Code Generation

Tell Omni what you want in plain English:

```
.nlp calculate the average of sales amounts
```

Generates:
```omni:compute name="result"
return avg(data.sales, 'amount');
```

#### Supported Intents

- **create** - Create data, charts, tables
- **show/display** - Render visualizations  
- **calculate/compute** - Perform calculations
- **filter/search** - Filter data
- **group** - Group by field
- **sort** - Sort data
- **compare** - Compare datasets
- **load** - Load external data

### 3. Programming Language

Full JavaScript compilation with syntax highlighting:

```javascript
// Define functions
function calculateRevenue(sales) {
  return sales.reduce((sum, sale) => sum + sale.amount, 0);
}

// Use in compute blocks
const total = calculateRevenue(data.sales);
return { total, average: total / data.sales.length };
```

### 4. Built-in Helper Functions

| Category | Functions |
|----------|-----------|
| Array | `len`, `sum`, `avg`, `max`, `min`, `filter`, `map`, `sort`, `unique`, `flatten`, `reduce`, `find` |
| Object | `pick`, `omit`, `merge` |
| String | `capitalize`, `camelCase`, `snakeCase`, `kebabCase`, `truncate` |
| Utility | `uuid`, `now`, `formatDate`, `sleep`, `debounce`, `throttle` |
| IO | `fetch`, `read`, `write` |

## CLI Commands

```bash
# Build documents
omni build <file.omd>
omni build <file.omd> -o output.html
omni build <file.omd> --csp --theme dark

# Watch for changes
omni watch <file.omd>

# Validate documents  
omni validate <file.omd>

# Create new project
omni init my-project
```

### CLI Options

| Option | Description |
|--------|-------------|
| `-o, --output` | Output file path |
| `-v, --verbose` | Verbose output |
| `-t, --theme` | Theme: light, dark |
| `--csp` | Enable Content Security Policy |
| `--base-path` | Base path for includes |
| `--allowed-domain` | Allowed domains for fetch |

## Lint System

Omni includes 15 built-in lint rules:

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

```bash
# Lint files
omni-lint src/

# With JSON output
omni-lint --format json src/
```

## REPL Commands

```bash
# Start REPL
omni-repl

# Available commands
.help              Show help
.load <file>      Load and execute file
.save <file>      Save session
.clear            Clear screen
.history          Show history
.ast <expr>       Show AST
.tokens <expr>    Show tokens  
.compile <code>   Compile code
.nlp <prompt>     Process NLP
.data <name>      Show data
.quit / .exit     Exit
```

## Plugin System

```typescript
import { OmniLang } from 'omni-lang';

const omni = new OmniLang({
  plugins: [{
    name: 'my-plugin',
    version: '1.0.0',
    helpers: {
      myHelper: (input) => input * 2,
    },
    hooks: {
      afterExecute: (fence) => {
        console.log(`Executed: ${fence.type}`);
      }
    }
  }]
});
```

## Security

- **CSP Headers** - Content Security Policy by default
- **Domain Restrictions** - Whitelist allowed domains
- **Path Validation** - Prevent directory traversal
- **HTML Escaping** - XSS prevention
- **Sandboxed Execution** - Isolated compute blocks

## Development

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Run tests
npm run test

# Lint code
npm run lint

# Full check
npm run check

# Start REPL
npm run repl
```

## Project Structure

```
omni-lang/
├── src/
│   ├── index.ts        # Core engine (OmniLang)
│   ├── cli.ts          # CLI tool
│   ├── compiler.ts    # Tokenizer/Parser/Compiler
│   ├── linter.ts       # Lint rules
│   ├── nlp.ts          # NLP engine
│   ├── repl.ts         # Interactive REPL
│   ├── lint-cli.ts     # Lint CLI
│   └── types.ts        # TypeScript definitions
├── dist/               # Compiled output
├── examples/           # Example documents
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

## Examples

### Basic Data Report
See `examples/example-report.omd`

### NLP to Code
```
Input:  ".nlp create a chart of sales by region"
Output: ```omni:chart type="bar" data="sales" x="region" y="revenue"```
```

### Full Programming
```markdown
```omni:compute name="analysis"
// Complex analysis
const total = sum(data.sales, 'revenue');
const grouped = groupBy(data.sales, 'region');
return { total, grouped };
```
```

## API Reference

### OmniLang Class

```typescript
const omni = new OmniLang({
  strict: false,
  timeout: 5000,
  basePath: '/path/to/base',
  allowedDomains: ['api.example.com'],
  fetchTimeout: 10000,
  csp: true,
});

omni.parse(markdown);
await omni.execute();
const html = omni.toHtml({ theme: 'dark', csp: true });
```

### Compiler

```typescript
import { Compiler } from 'omni-lang/compiler';

const compiler = new Compiler();
const { code, ast, tokens } = compiler.compile(sourceCode);
```

### Linter

```typescript
import { Linter } from 'omni-lang/linter';

const linter = new Linter();
const result = linter.lint(fences, content);
```

### NLP Engine

```typescript
import { NLPEngine } from 'omni-lang/nlp';

const nlp = new NLPEngine();
const result = nlp.process('create a chart of sales data');
// result.code, result.intents, result.entities, result.explanation
```

## License

MIT
