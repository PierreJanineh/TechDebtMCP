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
│   ├── resourceHandlers.ts # MCP resource templates (debt://summary, debt://issues)
│   ├── formatters.ts     # Report formatting helpers
│   ├── configValidator.ts # Config validation handler
│   └── dependencyHandlers.ts # Dependency analysis handlers
├── analyzers/
│   ├── baseAnalyzer.ts   # Abstract base class (shared logic)
│   ├── index.ts          # Factory: createAnalyzer()
│   ├── [language]Analyzer.ts # One file per language (14 total)
│   └── dependencies/     # 10 ecosystem parsers + factory
└── utils/fileUtils.ts    # File system helpers
```

## Copilot PR Review Workflow

### Before Creating a PR

1. Run `npm test` — all tests must pass
2. Run `npm run build` — no TypeScript errors
3. Update relevant docs (README.md, ROADMAP.md, CHANGELOG.md, CLAUDE.md)

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

## Git Workflow

- **Branch from `develop`**, never commit to `master` directly
- Branch naming: `feature/issue-{number}-short-description` or `fix/issue-{number}-...`
- PRs target `develop` (not `master`)
- Releases: tag on `develop` → GitHub Actions publishes → merge `develop` → `master`

## Tech Debt Self-Scan

**Project Health:** SQALE Rating A (2.9% debt ratio)

When touching files, check for:
- Deep nesting (>4 levels) — use guard clauses
- File length (>300 lines) — consider splitting
- Missing JSDoc on public APIs
