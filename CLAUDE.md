# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm test                    # Run all tests
npm test -- --testPathPattern=src/analyzers  # Run a specific test suite
npm run build               # Compile TypeScript
npm run dev                 # Run with ts-node (no build needed)
npm run watch               # Compile in watch mode
npm run lint                # Lint source files
```

**Before every commit:** run `npm test` then `npm run build`. Both must succeed.

## Architecture

Tech Debt MCP is a Model Context Protocol (MCP) server exposing tools for static tech-debt analysis across 14 languages.

```
src/
├── index.ts                    # Entry point — creates server, attaches handlers, runs
├── server/
│   ├── setup.ts                # McpServer instantiation and transport wiring
│   ├── handlers.ts             # Core MCP tool request handlers (CallToolRequestSchema)
│   ├── tools.ts                # TOOL_DEFINITIONS array (tool schemas/descriptions)
│   ├── formatters.ts           # Output formatting helpers
│   ├── configValidator.ts      # .techdebtrc.json validation handler
│   └── dependencyHandlers.ts   # Dependency analysis & vulnerability report handlers
├── types/index.ts              # Single source of truth for all TypeScript interfaces
├── config/languages.ts         # Per-language config: extensions, package files, patterns
├── core/
│   ├── analysisEngine.ts       # Project-level orchestrator: discovers files, fans out to analyzers
│   ├── sqaleEngine.ts          # SQALE rating/debt ratio calculation
│   └── customRulesEngine.ts    # User-defined pattern rules (.techdebtrc.json)
├── analyzers/
│   ├── baseAnalyzer.ts         # Abstract base — shared logic + checkPattern() helper
│   ├── index.ts                # createAnalyzer() factory
│   ├── [language]Analyzer.ts   # 14 language-specific analyzers
│   └── dependencies/
│       ├── baseParser.ts       # Abstract dependency parser
│       ├── index.ts            # createDependencyParser() factory
│       └── [ecosystem]Parser.ts # npm, pip, cargo, gradle, nuget, go.mod, etc.
└── utils/fileUtils.ts          # fs helpers (readFile, fileExists, getRelativePath)
```

### Request flow

`MCP client` → `handlers.ts` (`CallToolRequestSchema` switch) → `AnalysisEngine` → `createAnalyzer()` (per file language) → `[Language]Analyzer.performLanguageSpecificChecks()` → issues array → `formatters.ts` → response.

### Key conventions

- **Imports use `.js` extensions** — required for `module: NodeNext` / `moduleResolution: NodeNext` in tsconfig.
- **All types in `src/types/index.ts`** — never define types locally.
- **Factory pattern** — use `createAnalyzer(language, config)` and `createDependencyParser(filePath)`.
- **BaseAnalyzer.checkPattern()** — the standard way to match regex patterns and emit `TechDebtIssue` objects.
- **No `any`** — use `unknown` if truly needed; no `@ts-ignore` (use `@ts-expect-error` with a comment).
- **No `console.log`** in production code.
- **JSDoc on all public functions.**

## Adding a New Language Analyzer

1. Create `src/analyzers/[language]Analyzer.ts` extending `BaseAnalyzer`.
2. Implement `performLanguageSpecificChecks(filePath, content): Promise<TechDebtIssue[]>`.
3. Register in `src/analyzers/index.ts` `createAnalyzer()` switch.
4. Add `LanguageConfig` in `src/config/languages.ts`.
5. Add the language to `SupportedLanguage` union in `src/types/index.ts`.

## Adding a New MCP Tool

1. Add the tool schema to `TOOL_DEFINITIONS` in `src/server/tools.ts`.
2. Add a `case 'tool_name':` in `handlers.ts` `CallToolRequestSchema` handler.
3. Implement the handler function — in `handlers.ts` for core tools, or in a dedicated file (e.g., `configValidator.ts`, `dependencyHandlers.ts`) for domain-specific tools. Keep `handlers.ts` under 500 lines.

## Git & PR Workflow

- **Branch from `develop`**, never commit to `master` directly.
- Branch naming: `feature/issue-{number}-short-description` or `fix/issue-{number}-...`.
- PRs target `develop` (not `master`).
- Releases: tag `vX.X.X` on `develop` → GitHub Actions publishes to npm → merge `develop` → `master`.

## Code Quality Limits

- Max file length: 500 lines; max function length: 50 lines; max nesting: 4 levels.
- Max cyclomatic complexity: 10.
- Use early returns to reduce nesting instead of deep if-else chains.

## Testing

- Test files live in `__tests__/` folders alongside source (`[module].test.ts`).
- Follow TDD: write tests first, then implement.
- All imports in test files must include `.js` extension.
- Target >80% coverage on new code.
