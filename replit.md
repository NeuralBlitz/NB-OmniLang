# OmniLang

## Overview

OmniLang is an executable markdown runtime that processes `.omd` (OmniLang Markdown) documents. It enables embedding executable code blocks within markdown documents, supporting data visualization, computed values, and inline expressions. The project consists of a core runtime engine and a command-line interface for building, watching, and validating OmniLang documents.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Core Runtime (`omni-lang.js`)

The runtime engine uses a scope-based execution model with four main components:
- **data**: Raw data storage for document variables
- **computed**: Derived values calculated from data
- **charts**: Visualization definitions
- **functions**: User-defined functions

**Parsing Strategy**: Uses regex-based parsing to extract:
1. Fenced code blocks with the pattern ` ```omni:<type> [attrs]` 
2. Inline expressions with ` ```omni:inline <expression>` `

The fence types support attributes parsing and content extraction, with position tracking for accurate document reconstruction.

### CLI Tool (`omni-cli.js`)

Node.js command-line interface supporting three main commands:
- **build**: Process document and generate output (HTML or JSON)
- **watch**: File watcher for automatic rebuilding on changes
- **validate**: Syntax checking without output generation

**Output Formats**: HTML (default) and JSON export options.

### Design Decisions

1. **Single-file architecture**: Both runtime and CLI are self-contained JavaScript files with no build step required
2. **Regex-based parsing**: Chosen over full AST parsing for simplicity and performance on markdown documents
3. **Dependency tracking**: Uses a Map to track relationships between computed values for reactive updates

## External Dependencies

### Runtime Dependencies
- **Node.js**: Required for CLI execution (uses `fs`, `path` built-in modules)
- No external npm packages detected in the current implementation

### File Formats
- **Input**: `.omd` files (OmniLang Markdown)
- **Output**: HTML or JSON formats