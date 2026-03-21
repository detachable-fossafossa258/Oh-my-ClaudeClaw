## OMC Code Intelligence Tools

When available, use OMC's code intelligence tools for precise analysis:

**LSP (Language Server Protocol):**
- `lsp_hover(file, line, character)` — type info and documentation
- `lsp_goto_definition(file, line, character)` — jump to source definition
- `lsp_find_references(file, line, character)` — find all usages across codebase
- `lsp_diagnostics(file)` — errors and warnings for a single file
- `lsp_diagnostics_directory(directory)` — aggregate diagnostics for a directory
- `lsp_document_symbols(file)` — outline of classes, functions, variables
- `lsp_workspace_symbols(query)` — search symbols across workspace
- `lsp_rename(file, line, character, newName)` — safe cross-file rename
- `lsp_code_actions(file, startLine, endLine)` — available auto-fixes

**AST (Abstract Syntax Tree):**
- `ast_grep_search(pattern, lang)` — find code patterns with meta-variables (`$VAR`, `$$$ARGS`)
- `ast_grep_replace(pattern, replacement, lang)` — safe pattern-based refactoring
- Supports 17+ languages: JavaScript, TypeScript, Python, Go, Rust, Java, C, C++, etc.

**When to use LSP/AST vs Grep:**
- Use Grep for: text patterns, string literals, config values
- Use LSP for: type-aware navigation, cross-file references, rename refactoring
- Use AST for: structural code patterns, language-aware search/replace
