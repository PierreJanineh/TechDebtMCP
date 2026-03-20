# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm test                    # Run all tests
npm test -- --testPathPatterns=src/analyzers  # Run a specific test suite
npm run build               # Compile TypeScript
npm run dev                 # Run with ts-node (no build needed)
npm run watch               # Compile in watch mode
npm run lint                # Lint source files
```

**Before every commit:** run `npm test` then `npm run build`. Both must succeed.

## Architecture

Tech Debt MCP is a Model Context Protocol (MCP) server exposing tools and resources for static tech-debt analysis across 14 languages.

```
src/
├── index.ts                    # Entry point — creates server, attaches handlers + resources, runs
├── server/
│   ├── setup.ts                # McpServer instantiation and transport wiring
│   ├── handlers.ts             # Core MCP tool request handlers (CallToolRequestSchema)
│   ├── tools.ts                # TOOL_DEFINITIONS array (tool schemas/descriptions)
│   ├── resourceHandlers.ts     # MCP resource templates (debt://summary, debt://issues)
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
│   ├── baseAnalyzer.ts         # Abstract base — shared logic, checkPattern(), applyRuleExclusions()
│   ├── index.ts                # createAnalyzer() factory
│   ├── [language]Analyzer.ts   # 14 language-specific analyzers
│   └── dependencies/
│       ├── baseParser.ts       # Abstract dependency parser
│       ├── index.ts            # createDependencyParser() factory
│       └── [ecosystem]Parser.ts # npm, pip, cargo, gradle, nuget, go.mod, etc.
└── utils/fileUtils.ts          # fs helpers (readFile, fileExists, getRelativePath)
```

### Request flow

**Tools:** `MCP client` → `handlers.ts` (`CallToolRequestSchema` switch) → `AnalysisEngine` → `createAnalyzer()` (per file language) → `[Language]Analyzer.performLanguageSpecificChecks()` → issues array → `applyRuleExclusions()` (filter by config globs) → `formatters.ts` → response.

**Resources:** `MCP client` → `resourceHandlers.ts` (via `McpServer.registerResource()`) → `AnalysisEngine.analyzeProject()` → JSON response.

### Key conventions

- **Imports use `.js` extensions** — required for `module: NodeNext` / `moduleResolution: NodeNext` in tsconfig.
- **All types in `src/types/index.ts`** — never define types locally.
- **Factory pattern** — use `createAnalyzer(language, config)` and `createDependencyParser(filePath)`.
- **BaseAnalyzer.checkPattern()** — the standard way to match regex patterns and emit `TechDebtIssue` objects.
- **Domain handler extraction** — when handlers.ts grows, extract domain-specific handlers to dedicated files (e.g., `configValidator.ts`, `dependencyHandlers.ts`, `resourceHandlers.ts`).
- **No `any`** — use `unknown` if truly needed; no `@ts-ignore` (use `@ts-expect-error` with a comment).
- **No `console.log`** in production code.
- **JSDoc on all public functions.**

## Using checkPattern

```typescript
// In performLanguageSpecificChecks():
issues.push(...this.checkPattern(filePath, content, /pattern/g, {
  category: 'code-quality',
  severity: 'medium',
  title: 'Issue title',
  description: 'What the issue is',
  suggestion: 'How to fix it',
  effort: 'small',
  rule: 'rule-name',
  tags: ['tag1'],
}));
```

## Enums Reference

**Severity:** `critical` | `high` | `medium` | `low`

**Effort:** `trivial` (<5m) | `small` (5-30m) | `medium` (30m-2h) | `large` (2-4h) | `xlarge` (4h+)

**Categories:** `dependency` | `code-quality` | `architecture` | `documentation` | `testing` | `security` | `performance` | `maintainability`

## Adding a New Language Analyzer

1. Create `src/analyzers/[language]Analyzer.ts` extending `BaseAnalyzer`.
2. Implement `performLanguageSpecificChecks(filePath, content): Promise<TechDebtIssue[]>`.
3. Register in `src/analyzers/index.ts` `createAnalyzer()` switch.
4. Add `LanguageConfig` in `src/config/languages.ts`.
5. Add the language to `SupportedLanguage` union in `src/types/index.ts`.

## Adding a New MCP Resource

1. Add a `mcpServer.registerResource()` call in `src/server/resourceHandlers.ts`.
2. Use `ResourceTemplate` with `{ list: undefined }` for non-enumerable templates.
3. RFC 6570 `{+variable}` expansion allows slashes in path variables.
4. Return `{ contents: [{ uri: uri.href, mimeType: 'application/json', text: JSON.stringify(data, null, 2) }] }`.
5. Wrap callback body in try/catch returning `{ error: message }` on failure.
6. No changes needed in `setup.ts` — SDK auto-registers `resources` capability.

## Adding a New MCP Tool

1. Add the tool schema to `TOOL_DEFINITIONS` in `src/server/tools.ts`.
2. Add a `case 'tool_name':` in `handlers.ts` `CallToolRequestSchema` handler.
3. Implement the handler function — in `handlers.ts` for core tools, or in a dedicated file (e.g., `configValidator.ts`, `dependencyHandlers.ts`) for domain-specific tools. Keep `handlers.ts` under 500 lines.

## Adding a New Dependency Parser

1. Create `src/analyzers/dependencies/[ecosystem]Parser.ts` extending `BaseDependencyParser`.
2. Register in `src/analyzers/dependencies/index.ts` factory (`createDependencyParser`) and `getAllPackageFileNames()`.
3. Add tests in `src/analyzers/dependencies/__tests__/[ecosystem]Parser.test.ts`.

### isDev Convention

- **npm:** `devDependencies` key → `isDev: true`
- **Poetry 1.2+ groups:** only `groupName === 'dev'` → `isDev: true`. `optional = false` means required (production), NOT dev.
- **Pipfile:** `[dev-packages]` section → `isDev: true`
- **Always test `isDev` for ALL groups** — asserting `isDev: false` for non-dev groups catches logic bugs.

## Design Specs

Implementation details for planned phases are in `docs/superpowers/specs/2026-03-19-phases-3-4-6-design.md`. This includes types, API surfaces, file changes, algorithms, and tool definitions for:
- **Phase 3 (v2.1.0):** Snapshot & Trend Tracking — Issues #39-44
- **Phase 4 (v2.2.0):** Complexity Metrics — Issues #45-49

## Documentation Maintenance

**After every implementation PR**, update the following files to reflect the changes:

| File | What to update |
|------|----------------|
| `CLAUDE.md` | Architecture tree, request flow, recipes (if new patterns introduced) |
| `ARCHITECTURE.md` | Project structure, component descriptions, dependency graph, data flow diagrams |
| `README.md` | Features list, tool/resource documentation, usage examples |
| `ROADMAP.md` | Phase status, current status section, "Last Updated" date |
| `CHANGELOG.md` | Add version entry when tagging a release |

`.github/copilot-instructions.md` is only used for Copilot PR reviews — update its architecture diagram only if the high-level structure changes.

Do not defer docs to a separate PR — include them in the implementation PR.

## Git & PR Workflow

- **Branch from `develop`**, never commit to `master` directly.
- Branch naming: `feature/issue-{number}-short-description` or `fix/issue-{number}-...`.
- PRs target `develop` (not `master`).
- Releases: tag `vX.X.X` on `develop` → GitHub Actions publishes to npm → merge `develop` → `master`.
- Use conventional commits: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`.

## Code Quality Limits

- Max file length: 500 lines; max function length: 50 lines; max nesting: 4 levels.
- Max cyclomatic complexity: 10.
- Use early returns to reduce nesting instead of deep if-else chains.

## Testing

- Test files live in `__tests__/` folders alongside source (`[module].test.ts`).
- Follow TDD: write tests first, then implement.
- All imports in test files must include `.js` extension.
- Target >80% coverage on new code.
- Mock pattern: `jest.mock(...)` at top of file, typed references via `as jest.MockedFunction<typeof X>`.
