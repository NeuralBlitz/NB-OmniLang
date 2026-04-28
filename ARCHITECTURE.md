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
- **Multi-step Detection**: "first do this then that"
- **Learning**: User corrections tracking
- **DSL Patterns**: Custom command registration

### 5. Debugger (`src/debugger.ts`)

Debugging support for compute fences.

- **Breakpoints**: Line-based with conditions
- **Watch Expressions**: Track variables
- **Step Control**: over, out, next
- **Execution Frames**: Call stack tracking

### 6. LSP Server (`src/lsp.ts`)

Language Server Protocol for IDE integration.

- **Protocol**: JSON-RPC 2.0
- **Features**: Completions, definitions, references
- **Diagnostics**: Real-time error reporting
- **Debug Adapter**: VS Code debug protocol support

### 7. Cloud API (`src/cloud.ts`)

Cloud compilation and package management.

- **Remote Execution**: Cloud-based code running
- **Package Search**: npm registry integration
- **Instance Management**: Cloud VM provisioning
- **API Client**: RESTful cloud interface

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
| `sql` | SQL queries mock | SELECT, INSERT, UPDATE, DELETE |
| `webhook` | HTTP callbacks | url, events, method, secret |
| `cron` | Scheduled tasks | cron, schedule, enabled |
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

### Phase 3: Enhanced NLP (v1.2) ✅ DONE
- [x] Context-aware code generation
- [x] Multi-step task completion
- [x] Learning from user corrections
- [x] Custom DSL support
- [x] Debugger with breakpoints (src/debugger.ts)
- [x] SQL fence (mock queries)
- [x] Webhook fence (HTTP callbacks)
- [x] Cron fence (scheduled tasks)
- [x] Panel fence (foldable containers)
- [x] File browser fence
- [x] Demo fence (live code preview)
- [x] HUD fence (repo overlay)
- [x] Holographic themes (glass, translucent, neon, cyber)

### Phase 4: Distribution (v2.0) (In Progress)
- [ ] Package manager integration
- [x] Debugger with breakpoints ✅ (see src/debugger.ts)
- [ ] LSP server for IDE support
- [ ] WASM compilation
- [x] Browser-native runtime (see notes below)
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
