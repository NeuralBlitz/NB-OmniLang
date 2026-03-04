# Omni Compiler - Architecture & Roadmap

## Overview

Omni is a comprehensive development platform that transforms how you write, test, lint, and deploy code. It combines executable documents, natural language programming, and a full compiler in one unified system.

## Core Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Omni Compiler                             │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │   CLI Tool   │  │    REPL     │  │   Lint CLI          │  │
│  └──────┬──────┘  └──────┬──────┘  └──────────┬──────────┘  │
│         │                │                     │              │
│         └────────────────┼─────────────────────┘              │
│                          ▼                                    │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │                    Core Engine (OmniLang)               │  │
│  │  ┌─────────┐  ┌──────────┐  ┌───────────┐  ┌────────┐ │  │
│  │  │ Parser  │  │Executor  │  │ Renderer  │  │Plugins │ │  │
│  │  └────┬────┘  └────┬─────┘  └─────┬─────┘  └────┬───┘ │  │
│  │       │            │               │             │      │  │
│  │       └────────────┴───────────────┴─────────────┘      │  │
│  │                          │                              │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌───────────────┐  │  │
│  │  │ Data Fence  │  │Compute Fence│  │ Chart Fence   │  │  │
│  │  │ YAML/CSV    │  │ JS Runtime  │  │ Visualizations│  │  │
│  │  │ Fetch/Incl  │  │ Helpers    │  │ Tables        │  │  │
│  │  └─────────────┘  └─────────────┘  └───────────────┘  │  │
│  └───────────────────────────────────────────────────────┘  │
│                          │                                    │
│  ┌───────────────────────┴───────────────────────────────┐  │
│  │              Supporting Systems                          │  │
│  │  ┌────────────┐  ┌────────────┐  ┌──────────────────┐  │  │
│  │  │  Compiler   │  │  Linter    │  │   NLP Engine     │  │  │
│  │  │Tokenizer/Parser│ │15 Rules   │  │Intent/Entity     │  │  │
│  │  │AST/Emitter │  │Security   │  │Code Generation   │  │  │
│  │  └────────────┘  └────────────┘  └──────────────────┘  │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## Component Breakdown

### 1. Core Engine (`src/index.ts`)

The heart of Omni - parses and executes executable markdown.

- **Parser**: Regex-based fence extraction
- **Executor**: Dependency-aware execution engine
- **Renderer**: HTML/Markdown conversion
- **Plugins**: Hook-based extensibility

### 2. Compiler (`src/compiler.ts`)

Full programming language implementation.

- **Tokenizer**: Lexical analysis
- **Parser**: AST generation  
- **Emitter**: Code compilation
- **Supported**: Functions, classes, control flow, expressions

### 3. Linter (`src/linter.ts`)

Static analysis and security.

- **15 Built-in Rules**: Security, best practices, errors
- **Circular Dependency Detection**
- **Configurable Severity**
- **Auto-fix Support** (planned)

### 4. NLP Engine (`src/nlp.ts`)

Natural language to code.

- **Intent Recognition**: 15+ intent patterns
- **Entity Extraction**: Formats, operations, time periods
- **Code Generation**: Automatic fence/code creation
- **Extensible**: Custom intents/entities

### 5. REPL (`src/repl.ts`)

Interactive programming environment.

- **Commands**: .load, .save, .ast, .tokens, .compile, .nlp
- **Built-in Helpers**: Full standard library
- **History**: Persistent command history

## Data Flow

```
Input (.omd, .js, or NLP)
         │
         ▼
    ┌─────────┐
    │ Parser  │ ◄─── Fence extraction, tokenization
    └────┬────┘
         │
         ▼
    ┌─────────┐
    │   AST   │ ◄─── Parse tokens, build tree
    └────┬────┘
         │
         ▼
    ┌─────────┐
    │ Execute │ ◄─── Run compute, fetch data
    └────┬────┘
         │
         ▼
    ┌─────────┐
    │ Render  │ ◄─── Generate HTML
    └────┬────┘
         │
         ▼
   Output (HTML, JSON, or Code)
```

## Fence Types

| Type | Purpose | Attributes |
|------|---------|------------|
| `data` | JSON data | name, (content) |
| `yaml` | YAML data | name, (content) |
| `csv` | CSV data | name, (content) |
| `fetch` | Remote data | name, url, method, headers |
| `include` | File inclusion | name, src |
| `compute` | JavaScript | name, (content) |
| `query` | Data queries | name, data, where, order, limit |
| `chart` | Visualizations | type, data, x, y, title |
| `table` | HTML tables | data, headers |

## Security Architecture

```
┌────────────────────────────────────────┐
│           Security Layers              │
├────────────────────────────────────────┤
│ 1. Input Validation                    │
│    - Schema validation                 │
│    - Type checking                     │
│    - Size limits                       │
├────────────────────────────────────────┤
│ 2. Execution Sandbox                   │
│    - Isolated scope                    │
│    - Restricted APIs                   │
│    - Timeout handling                 │
├────────────────────────────────────────┤
│ 3. Output Sanitization                │
│    - HTML escaping                    │
│    - URL validation                    │
│    - CSP headers                       │
├────────────────────────────────────────┤
│ 4. Network Security                    │
│    - Domain whitelist                  │
│    - HTTPS enforcement                │
│    - Path restrictions                 │
└────────────────────────────────────────┘
```

## Plugin System

```typescript
interface Plugin {
  name: string;
  version: string;
  hooks?: {
    beforeParse?: (markdown: string) => string;
    afterParse?: (ast: any) => void;
    beforeExecute?: (fence: Fence) => Fence;
    afterExecute?: (fence: Fence) => void;
    beforeRender?: (html: string) => string;
    afterRender?: (html: string) => string;
  };
  fences?: Record<string, FenceHandler>;
  helpers?: Record<string, Function>;
}
```

## Roadmap

### Phase 2: Enhanced Features (v1.1)
- [ ] Package manager integration
- [ ] Debugger with breakpoints
- [ ] LSP server for IDE support
- [ ] WebAssembly runtime

### Phase 3: Advanced NLP (v1.2)
- [ ] Context-aware code generation
- [ ] Multi-step task completion
- [ ] Learning from user corrections
- [ ] Custom DSL support

### Phase 4: Distribution (v2.0)
- [ ] WASM compilation
- [ ] Browser-native runtime
- [ ] Mobile app
- [ ] Cloud compilation API

## Performance

- **Parse**: ~1ms per 1KB markdown
- **Execute**: ~10ms for typical compute
- **Compile**: ~5ms for 100 lines JS
- **Render**: ~5ms for full HTML page

## Testing

- **Unit Tests**: 40+ tests covering core functionality
- **Integration Tests**: CLI, REPL, NLP workflows
- **Security Tests**: XSS, injection, path traversal

## Dependencies

### Production
- `commander` - CLI framework
- `chokidar` - File watching
- `js-yaml` - YAML parsing
- `csv-parse` - CSV parsing

### Development
- `typescript` - Type safety
- `vitest` - Testing
- `eslint` - Linting

## License

MIT
