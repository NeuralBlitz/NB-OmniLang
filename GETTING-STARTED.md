# Getting Started with Omni Compiler

Welcome to Omni! This guide will take you from zero to hero in no time.

## Installation

```bash
npm install omni-lang
```

## Quick Commands

```bash
# Build a document
omni build my-doc.omd

# Start REPL
omni-repl

# Lint documents
omni-lint src/

# Watch for changes
omni watch my-doc.omd
```

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
