# Omni Compiler - Architecture & Roadmap

## Overview

Omni is a comprehensive development platform that transforms how you write, test, lint, and deploy code. It combines executable documents, natural language programming, and a full compiler in one unified system.

## Core Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Omni Compiler                             │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐     │
│  │   CLI Tool  │  │    REPL     │  │   Lint CLI          │     │
│  └──────┬──────┘  └──────┬──────┘  └──────────┬──────────┘     │
│         │                │                     │               │
│         └────────────────┼─────────────────────┘               │
│                           ▼                                  │
│  ┌───────────────────────────────────────────────────────────┐   │
│  │                    Core Engine (OmniLang)                │   │
│  │  ┌─────────┐  ┌──────────┐  ┌───────────┐  ┌────────┐  │   │
│  │  │ Parser  │  │Executor  │  │ Renderer  │  │Plugins │  │   │
│  │  └────┬────┘  └────┬─────┘  └─────┬─────┘  └────┬───┘  │   │
│  │       │            │               │             │       │   │
│  │       └────────────┴───────────────┴─────────────┘       │   │
│  │                           │                             │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │   │
│  │  │ Data Fence │  │Compute Fence│  │ Chart Fence │  │   │
│  │  │ YAML/CSV   │  │ JS/Lua/Python│ │Visualizatns│  │   │
│  │  │ Fetch/Incl│  │ Helpers   │  │ Tables    │  │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │   │
│  │  │ Lua Fence  │  │Python Fence│  │ WASM Fence  │  │   │
│  │  │ math.*     │  │ return req │  │ magic valid │  │   │
│  │  │ string.*  │  │ direct exec│  │ hex loader │  │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │   │
│  │  │Shader Fence│  │Background   │  │ Audio Fence│  │   │
│  │  │ GLSL comp  │  │ CSS gradient│  │ streaming │  │   │
│  │  │ validate │  │ patterns  │  │ playback │  │   │
│  │  └─────��───────┘  └─────────────┘  └─────────────┘  │   │
│  └───────────────────────────────────────────────────────┘   │
│                           │                                │
│  ┌────────────────────────┴──────────────────────────────┐   │
│  │              Supporting Systems                       │   │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────────┐  │   │
│  │  │ Compiler  │  │ Linter     │  │ NLP Engine     │  │   │
│  │  │Tokenizer/ │  │ 15+ Rules │  │Intent/Entity  │  │   │
│  │  │ Parser   │  │Security   │  │Code Generation│  │   │
│  │  │AST/Emittr │  │ Auto-fix  │  │Extensible   │  │   │
│  │  └────────────┘  └────────────┘  └────────────────┘  │   │
│  └───────────────────────────────────────────────────────┘   │
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

- **15+ Built-in Rules**: Security, best practices, errors
- **Circular Dependency Detection**
- **Configurable Severity**
- **Auto-fix Support**
- **Security Rules**: XSS prevention, path traversal, eval detection

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
| `lua` | Lua scripting | name, (content) |
| `python` | Python code | name, (content) - requires `return` |
| `wasm` | WebAssembly | name, hex - validates magic `0061736d` |
| `shader` | GLSL shader | type: fragment, vertex, compute, geometry |
| `background` | CSS backgrounds | type: gradient, pattern, noise, mesh, solid |
| `audio` | Audio playback | src, autoplay, loop, volume, format |
| `video` | Video playback | src, autoplay, loop, muted, controls, poster |
| `image` | Image rendering | src, width, height, alt, lazy |
| `animation` | CSS animations | duration, easing, delay, iteration |
| `query` | Data queries | name, data, where, order, limit |
| `chart` | Visualizations | type, data, x, y, title |
| `table` | HTML tables | data, headers |
| `http` | HTTP requests | url, method, headers, body |

## Security Architecture

```
┌────────────────────────────────────────┐
│           Security Layers              │
├────────────────────────────────────────┤
│ 1. Input Validation                    │
│    - Schema validation                │
│    - Type checking                    │
│    - Size limits                      │
│    - WASM magic validation             │
│    - Shader type validation            │
│    - Python return validation         │
├────────────────────────────────────────┤
│ 2. Execution Sandbox                 │
│    - Isolated scope                   │
│    - Restricted APIs                 │
│    - Timeout handling                 │
│    - Python sandbox (no file I/O)    │
├────────────────────────────────────────┤
│ 3. Output Sanitization                │
│    - HTML escaping                    │
│    - URL validation                   │
│    - CSP headers                      │
├────────────────────────────────────────┤
│ 4. Network Security                   │
│    - Domain whitelist                 │
│    - HTTPS enforcement               │
│    - Path restrictions                │
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

### Phase 1: Core Platform (v1.0) ✅ DONE
- [x] Core parser with fence extraction
- [x] Data fences (JSON, YAML, CSV)
- [x] Compute fence with JS runtime
- [x] HTTP fetch support
- [x] Chart and table visualizations
- [x] Security (CSP, sanitization, timeouts)
- [x] Linter with 15+ rules
- [x] REPL interactive mode

### Phase 2: Enhanced Features (v1.1) ✅ DONE
- [x] Lua fence with helpers
- [x] Python fence execution
- [x] WebAssembly runtime (hex)
- [x] GLSL shader fence
- [x] Background fence (CSS gradients/patterns)
- [x] Audio fence (streaming playback)
- [x] Enhanced error handling
- [x] Multiple fence parsing fix

### Phase 3: Enhanced NLP (planned v1.2)
- [ ] Context-aware code generation
- [ ] Multi-step task completion
- [ ] Learning from user corrections
- [ ] Custom DSL support

### Phase 4: Distribution (planned v2.0)
- [ ] Package manager integration
- [ ] Debugger with breakpoints
- [ ] LSP server for IDE support
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

- **Unit Tests**: 56+ tests covering core functionality
- **Integration Tests**: CLI, REPL, NLP workflows
- **Security Tests**: XSS, injection, path traversal
- **Fence Tests**: background, audio, lua, wasm, python, shader

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
