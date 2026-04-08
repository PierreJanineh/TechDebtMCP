# AI Agent Instructions for Tech Debt MCP

> **See [CLAUDE.md](../CLAUDE.md)** for coding standards, architecture, conventions, and recipes. This file covers Copilot-specific workflows only.

## Project Overview

Tech Debt MCP is a Model Context Protocol server for analyzing technical debt across **14 programming languages**. It integrates with GitHub Copilot and other MCP-compatible clients.

## Architecture

```
src/
├── index.ts              # Thin entry point — delegates to src/server/
├── types/index.ts         # All TypeScript interfaces (single source of truth)
├── config/languages.ts    # Language configurations (extensible)
├── core/
│   ├── analysisEngine.ts    # Main orchestrator
│   ├── sqaleEngine.ts       # SQALE metrics
│   └── customRulesEngine.ts # Custom rules engine
├── server/
│   ├── setup.ts          # Server creation, version resolution, stdio transport
│   ├── handlers.ts       # Tool call dispatch + handler implementations
│   ├── tools.ts          # Centralized TOOL_DEFINITIONS array
│   ├── inputParser.ts    # Tool argument validation (requireString, optionalString, etc.)
│   ├── argValidation.ts  # Argument coercion and constraint checks
│   ├── resourceHandlers.ts # MCP resource templates (debt://summary, debt://issues)
│   ├── formatters.ts     # Report formatting helpers
│   ├── configValidator.ts # Config validation handler
│   └── dependencyHandlers.ts # Dependency analysis handlers
├── analyzers/
│   ├── baseAnalyzer.ts   # Abstract base class (shared logic)
│   ├── index.ts          # Factory: createAnalyzer()
│   ├── [language]Analyzer.ts # One file per language (14 total)
│   ├── swiftUiChecks.ts  # SwiftUI Phase 1 checks
│   ├── swiftUiChecksPhase2.ts # SwiftUI Phase 2 checks
│   └── dependencies/     # 10 ecosystem parsers + factory
└── utils/fileUtils.ts    # File system helpers
```

## Copilot PR Review Workflow

### Before Creating a PR

1. Run `npm test` — all tests must pass
2. Run `npm run build` — no TypeScript errors
3. Update relevant docs (README.md, ROADMAP.md, CHANGELOG.md, CLAUDE.md, ARCHITECTURE.md, `.github/copilot-instructions.md`) — see [Doc Files to Check](#doc-files-to-check) for the full list

### After PR is Created

1. **Wait for Copilot review** (30-60 seconds)
2. **Address suggestions:**
   - Relevant: implement fix, commit, re-test
   - Not relevant: add comment explaining why
3. **Re-run tests** after any changes

### Copilot Review Response Format

```
✅ Addressed: [what was fixed]
❌ Skipped: [why suggestion doesn't apply]
```

## Documentation Consistency Review

Copilot **must** check documentation consistency on every PR. **Do not approve** any PR where documentation is inconsistent with the code changes.

### Doc Files to Check

| File | What to verify |
|------|----------------|
| `README.md` | Features list, tool/resource docs, usage examples |
| `ARCHITECTURE.md` | Project structure, component descriptions, data flow diagrams |
| `ROADMAP.md` | Phase status, current status section |
| `CHANGELOG.md` | Version entries when `package.json` version is bumped or a `vX.X.X` tag is present |
| `CLAUDE.md` | Architecture tree, request flow, recipes, conventions |
| `.github/copilot-instructions.md` | Architecture diagram if high-level structure changed |

### Inconsistency Triggers (Block Approval)

- A new MCP tool is added but not listed in `README.md` or `CLAUDE.md`
- A file is added, removed, or renamed but the architecture tree in `CLAUDE.md` or `ARCHITECTURE.md` is not updated
- A new analyzer or dependency parser is added but not reflected in the architecture docs
- A phase issue is closed but `ROADMAP.md` still shows it as pending
- A public API signature changes but JSDoc or README examples are stale
- `CHANGELOG.md` is missing an entry when `package.json` version is bumped (the only detectable release signal in a PR diff; Git tags are not part of the changeset and cannot be checked here)

### Review Steps

1. Scan which source files were modified in the PR diff
2. Cross-check the relevant doc files above for stale references, missing entries, or outdated descriptions
3. Leave a review comment listing **each inconsistency found** (file, line or section, description of the problem)
4. **Withhold approval** until all doc inconsistencies are resolved

## Git Workflow

- **Branch from `develop`**, never commit to `master` directly
- Branch naming: `feature/tec-{N}-short-description` or `fix/tec-{N}-...` (where `TEC-N` is the Linear issue). Fallback: `feature/issue-{number}-...` for issues without a Linear ticket.
- PRs target `develop` (not `master`)
- Releases: tag on `develop` → GitHub Actions publishes → merge `develop` → `master`
- **Issues are created on GitHub only** — Linear two-way sync auto-creates corresponding `TEC-N` issues. Verify PR branch names match one of the naming patterns above.

## Tech Debt Self-Scan

When touching files, check for:
- Deep nesting (>4 levels) — use guard clauses
- File length (>500 lines) — must be split (matches `.claude/rules/code-quality.md`)
- Missing JSDoc on public APIs
- Verify `// techdebt-ignore-next-line` directives include the specific rule name, not a blanket suppress
- Flag use of `any` type (prefer `unknown`). Flag `@ts-ignore` (use `@ts-expect-error` with explanation)

## Security Review

When reviewing PRs that touch MCP tool handlers or file system operations, check for:

- **Path validation:** Verify path arguments use `requireAbsolutePath()` or `optionalAbsolutePath()` from `inputParser.ts`. Flag any use of `requireString` for path parameters, or direct use of `args.path` in `fs` calls.
- **Regex safety:** Flag `new RegExp()` with user-supplied patterns that lack length limits or flag allowlisting. Verify security constants (`MAX_PATTERN_LENGTH`, `MAX_CODE_LENGTH`, `MAX_FILE_SIZE_BYTES` from `customRulesEngine.ts`) are imported — flag hardcoded values.
- **String interpolation in RegExp:** Verify captured strings are escaped before interpolation into `new RegExp()`.
- **Error message leakage:** Verify error messages use `getRelativePath()` — flag any absolute filesystem paths in client-facing responses.
- **Handler output leakage:** Verify tool response output (e.g., debt summary, SQALE metrics) uses `basename()` for project paths — flag any raw absolute paths in formatted user-facing output. See Issue #138.

## Testing Review

When reviewing PRs that add or modify tests:

- Verify all imports include `.js` extension (required by NodeNext resolution)
- Check that `jest.mock(...)` calls are at the top of the file
- Verify mocked references use `as jest.MockedFunction<typeof X>` typing
- Flag new features without corresponding test files in `__tests__/` directories
