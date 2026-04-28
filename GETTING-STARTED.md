# Getting Started with Omni Compiler

Welcome to Omni! This comprehensive guide will take you from zero to expert with detailed examples, troubleshooting, and best practices.

---

## Table of Contents

1. [Installation](#installation)
2. [Quick Start](#quick-start)
3. [Your First Document](#your-first-document)
4. [Core Concepts](#core-concepts)
5. [Programming Languages](#programming-languages)
6. [Data Visualization](#data-visualization)
7. [NLP Code Generation](#nlp-code-generation)
8. [Security](#security)
9. [Advanced Topics](#advanced-topics)
10. [Troubleshooting](#troubleshooting)
11. [Best Practices](#best-practices)

---

## Installation

### From npm

```bash
npm install omni-lang

# Or as a dev dependency
npm install --save-dev omni-lang
```

### From Source

```bash
git clone https://github.com/omni-lang/omni-lang
cd omni-lang
npm install
npm run build
```

### Verify Installation

```bash
omni --version
omni --help
```

---

## Quick Start

### Basic Commands

```bash
# Build a document
omni build my-doc.omd

# Build with output
omni build my-doc.omd -o output.html

# With dark theme
omni build my-doc.omd --theme dark

# Enable CSP
omni build my-doc.omd --csp

# Validate documents
omni validate my-doc.omd

# Lint documents
omni-lint src/

# Start REPL
omni-repl

# Watch for changes
omni watch my-doc.omd
```

### Options

| Option | Description | Example |
|--------|-------------|---------|
| `-o` | Output file | `-o output.html` |
| `-t` | Theme | `--theme dark` |
| `--csp` | CSP header | `--csp` |
| `-v` | Verbose | `--verbose` |

---

## Your First Document

Create a file called `hello.omd`:

```markdown
# Hello World

This is my first Omni document!

## Data

```omni:data name="greetings"
[
  {"lang": "English", "text": "Hello!"},
  {"lang": "Spanish", "text": "¡Hola!"},
  {"lang": "French", "text": "Bonjour!"}
]
```

## Summary

We have `omni:inline len(data.greetings)` greetings available.

## Greetings

`omni:inline map(data.greetings, g => g.text).join(', ')`
```

Build it:

```bash
omni build hello.omd
```

---

## Core Concepts

### Fence Types

| Type | Purpose | Example |
|------|---------|---------|
| `data` | Define data | `[{"key": "value"}]` |
| `compute` | Execute JS | `return 1 + 1` |
| `lua` | Lua scripting | `result = 42` |
| `python` | Python code | `return 42` |
| `wasm` | WebAssembly | `hex="0061736d..."` |
| `shader` | GLSL | `void main() {}` |
| `background` | CSS backgrounds | `type="gradient"` |
| `audio` | Audio playback | `src="music.mp3"` |
| `video` | Video playback | `src="video.mp4"` |
| `image` | Images | `src="photo.png"` |
| `animation` | Animations | `duration="500"` |
| `chart` | Charts | `type="bar"` |
| `table` | Tables | `data="users"` |

### Inline Expressions

```markdown
The total is `omni:inline sum(data.items, 'amount')`.

Hello, `omni:inline "world".toUpperCase()`!
```

---

## Programming Languages

### JavaScript

```javascript
const total = sum(data.sales, 'revenue');
const average = total / data.sales.length;
return { total, average };
```

### Lua

```lua
result = {}
result.value = 42
result.items = {1, 2, 3}
result.sum = math.abs(-5)
```

### Python

```python
return 42
# or
x = 10
y = 5
return x + y
```

### WebAssembly

```markdown
```omni:wasm hex="0061736d01000000"
```
```

### GLSL Shader

```glsl
precision mediump float;
uniform float time;
void main() {
  gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
}
```
```

### Background

```markdown
```omni:background type="gradient"
```
```omni:background type="pattern"
```
```omni:background type="mesh"
```
```omni:background name="my-bg" type="solid" color="#ff0000"
```
```

### Audio

```markdown
```omni:audio src="https://example.com/music.mp3"
```
```omni:audio name="bgm" src="music.mp3" autoplay="true" loop volume="0.5"
```
```

---

## Data Visualization

### Charts

```markdown
```omni:chart type="bar" data="sales" x="product" y="revenue"
title="Sales by Product"
```
```

| Chart Type | Description |
|-----------|-------------|
| bar | Bar chart |
| line | Line chart |
| pie | Pie chart |
| doughnut | Doughnut chart |
| radar | Radar chart |
| scatter | Scatter plot |

### Tables

```markdown
```omni:table data="users" columns="name,email,role"
sortable="true"
filterable="true"
```
```

---

## NLP Code Generation

Use natural language to generate code:

```bash
omni-repl

> .nlp create a chart showing sales by region
```

Generates:

```markdown
```omni:audio name="bgm" src="music.mp3" autoplay="true" loop volume="0.5"
```
```

### Video

```markdown
```omni:video src="https://example.com/video.mp4"
```
```omni:video name="intro" src="video.mp4" autoplay="true" muted loop
```
```

### Image

```markdown
```omni:image src="https://example.com/photo.png" alt="Description"
```
```omni:image name="pic" src="photo.jpg" width="400"
```
```

### Animation

```markdown
```omni:animation name="fade-in" duration="500" easing="ease-in-out"
```
```omni:animation duration="300" delay="100" iteration="infinite"
```
```

---

## Security

### CSP Headers

```typescript
const html = omni.toHtml({ csp: true });
```

### Timeout

```typescript
const omni = new OmniLang({ timeout: 5000 });
```

### Domain Allowlist

```typescript
const omni = new OmniLang({
  allowedDomains: ['api.example.com']
});
```

---

## Advanced Topics

### Custom Helpers

```typescript
const omni = new OmniLang({
  helpers: {
    myHelper: (input) => input * 2
  }
});
```

### Plugins

```typescript
const omni = new OmniLang({
  plugins: [{
    name: 'my-plugin',
    version: '1.0.0',
    helpers: {
      myFunction: (args) => process(args)
    }
  }]
});
```

### Error Handling

```typescript
// Strict mode throws immediately
const omni = new OmniLang({ strict: true });

// Non-strict collects errors
const omni = new OmniLang({ strict: false });
await omni.execute();
for (const fence of omni.getFences()) {
  if (fence.error) {
    console.error(fence.error);
  }
}
```

---

## Troubleshooting

### Common Errors

| Error | Fix |
|-------|-----|
| "X fence requires code" | Add content to fence |
| 'last statement must use "return"' | Use `return value` |
| "invalid WASM magic" | Use valid hex starting `0061736d` |
| "invalid type" | Use `fragment`, `vertex`, `compute` |

### Debug Steps

```bash
# Validate first
omni validate my-doc.omd

# Verbose output
omni build my-doc.omd --verbose

# Lint
omni-lint my-doc.omd
```

---

## Best Practices

1. **Define data first** - Data fences should come before compute
2. **Use descriptive names** - Name your data and computed values
3. **Comment complex code** - Add comments in fences
4. **Validate frequently** - Use `omni validate` during development
5. **Use lint** - Run `omni-lint` before building
6. **Test incrementally** - Build after each change

---

## Recipe Book

### Sales Report

```markdown
# Q4 Sales Report

```omni:data name="sales"
[{"product": "Widget A", "revenue": 12500}, {"product": "Widget B", "revenue": 8200}]
```

Total: `omni:inline sum(data.sales, 'revenue')`

```omni:chart type="bar" data="sales" x="product" y="revenue"
title="Q4 Sales"
```
```

### Multi-Language Demo

```markdown
# Multi-Language Demo

## JavaScript
```omni:compute name="js-result"
return 42 + 8
```

## Lua
```omni:lua name="lua-result"
result = { value: 42 }
```

## Python
```omni:python name="py-result"
return 42
```

## Results
- JS: `omni:inline computed.js-result`
- Lua: `omni:inline computed.lua-result.value`
- Python: `omni:inline computed.py-result`
```

### Chart with Custom Styling

```markdown
```omni:chart type="doughnut" data="sales" x="product" y="revenue"
title="Sales Distribution"
colors='["#ff6384", "#36a2eb", "#ffcd56", "#4bc0c0"]'
percentage="true"
```
```

---

## Next Steps

- Read the [README.md](../README.md) for complete API reference
- Check [examples/](../examples/) for more samples
- Join the community
- Contribute to the project

```omni:compute
return data.greetings.map(g => `${g.lang}: ${g.text}`).join('\n\n');
```
```

Now build it:

```bash
omni build hello.omd
```

Open `hello.html` in your browser!

## Using Natural Language

Start the REPL:

```bash
omni-repl
```

Try these NLP commands:

```
.nlp create a data block with sales
.nlp show me a bar chart
.nlp calculate total revenue
.nlp filter items where price > 100
```

## Interactive Programming

```bash
omni-repl
```

Try some code:

```javascript
const numbers = [1, 2, 3, 4, 5];
const doubled = map(numbers, n => n * 2);
print(doubled);
// [2, 4, 6, 8, 10]
```

## Available Helpers

### Array Operations
```javascript
len([1, 2, 3])                    // 3
sum([1, 2, 3])                   // 6
avg([1, 2, 3])                   // 2
max([1, 2, 3])                   // 3
min([1, 2, 3])                   // 1
filter([1,2,3,4], n => n % 2 === 0)  // [2, 4]
map([1,2,3], n => n * 2)         // [2, 4, 6]
sort([3, 1, 2])                  // [1, 2, 3]
unique([1, 2, 2, 3])             // [1, 2, 3]
```

### Data Operations
```javascript
groupBy(data.orders, 'category')
pick(user, ['name', 'email'])
omit(user, ['password'])
merge(obj1, obj2)
```

### String Operations
```javascript
capitalize("hello")      // "Hello"
camelCase("hello world")  // "helloWorld"
snakeCase("helloWorld")   // "hello_world"
kebabCase("helloWorld")   // "hello-world"
truncate("hello world", 8) // "hello..."
```

## Data Sources

### JSON
```omni:data name="users"
[{"name": "Alice", "age": 30}]
```

### YAML
```omni:yaml name="config"
database:
  host: localhost
  port: 5432
```

### CSV
```omni:csv name="sales"
product,revenue
Widget A,1000
Widget B,1500
```

### Fetch from URL
```omni:fetch name="users" url="https://api.example.com/users"
```

### Include Local File
```omni:include name="config" src="./config.json"
```

## Visualizations

### Bar Chart
```omni:chart type="bar" data="sales" x="product" y="revenue"
```

### Line Chart
```omni:chart type="line" data="sales" x="date" y="amount"
```

### Pie Chart
```omni:chart type="pie" data="sales" x="category" y="revenue"
```

### Supported Types
- `bar` - Bar charts
- `line` - Line charts  
- `pie` - Pie charts
- `doughnut` - Doughnut charts
- `radar` - Radar charts
- `polarArea` - Polar area charts

## Tables

```omni:data name="users"
[{"name": "Alice", "age": 30}, {"name": "Bob", "age": 25}]
```

```omni:table data="users"
```

Or with custom headers:
```omni:table data="users" headers="Name,Age"
```

## Queries

Filter and transform data:

```omni:query name="adults" data="users" where="u.age >= 18" order="name" limit="10"
```

Attributes:
- `data` - Source data name
- `where` - Filter condition
- `order` - Sort field (e.g., "name:desc")
- `limit` - Max results
- `select` - Fields to return

## Security

Build with security enabled:

```bash
omni build doc.omd --csp
omni build doc.omd --allowed-domain api.example.com
```

## Linting

Check your documents:

```bash
omni-lint doc.omd
omni-lint src/ --format json
```

## Project Structure

Create a new project:

```bash
omni init my-project
```

Creates:
```
my-project/
├── examples/
│   └── example.omd
├── data/
└── package.json
```

## Tips & Tricks

### Debugging
Use the REPL to test expressions:
```
.compile const x = 1 + 2; return x;
```

### Inspect Data
```
.data users
```

### View Tokens
```
.tokens 1 + 2 * 3
```

### View AST
```
.ast function add(a, b) { return a + b; }
```

## Examples

Check the `examples/` folder:

- `example-report.omd` - Full analytics report
- `chart-demo.omd` - Visualization examples

## Next Steps

1. Read the [Architecture Guide](./ARCHITECTURE.md)
2. Explore the [API Reference](./README.md)
3. Try the NLP Features
4. Build something amazing!

## Need Help?

- Check the docs
- Open an issue on GitHub
- Ask in the REPL with `.help`
