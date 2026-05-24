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
│   ├── handlers.ts       # Tool call dispatch (delegates to domain handlers)
│   ├── tools.ts          # Centralized TOOL_DEFINITIONS array
│   ├── inputParser.ts    # Tool argument validation (requireString, optionalString, etc.)
│   ├── argValidation.ts  # Argument coercion and constraint checks
│   ├── resourceHandlers.ts # MCP resource templates (debt://summary, debt://issues)
│   ├── formatters.ts     # Report formatting helpers
│   ├── configValidator.ts # Config validation handler
│   ├── customRulesHandlers.ts # Custom rules CRUD & execution handlers
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
| `README.md` | Features list, tool/resource docs, usage examples, Self-Scan Results block |
| `ARCHITECTURE.md` | Project structure, component descriptions, data flow diagrams, Current Status metrics block |
| `ROADMAP.md` | Phase status, current status section |
| `CHANGELOG.md` | Version entries when `package.json` version is bumped or a `vX.X.X` tag is present |
| `CLAUDE.md` | Architecture tree, request flow, recipes, conventions |
| `CONTRIBUTING.md` | Configuration Impact block tracks the same self-scan metrics as `TECH_DEBT_SCAN.md` |
| `TECH_DEBT_SCAN.md` | Canonical self-scan metrics (Health / Debt Score / Issues / Remediation) — must match the derivative blocks in README / ARCHITECTURE / CONTRIBUTING |
| `.github/copilot-instructions.md` | Architecture diagram if high-level structure changed |

### Inconsistency Triggers (Block Approval)

- A new MCP tool is added but not listed in `README.md` or `CLAUDE.md`
- A file is added, removed, or renamed but the architecture tree in `CLAUDE.md` or `ARCHITECTURE.md` is not updated
- A new analyzer or dependency parser is added but not reflected in the architecture docs
- A phase issue is closed but `ROADMAP.md` still shows it as pending
- A public API signature changes but JSDoc or README examples are stale
- `CHANGELOG.md` is missing an entry when `package.json` version is bumped (the only detectable release signal in a PR diff; Git tags are not part of the changeset and cannot be checked here)
- Self-scan metrics in `README.md` (Self-Scan Results), `ARCHITECTURE.md` (Current Status), or `CONTRIBUTING.md` (Configuration Impact) are edited without a corresponding update to `TECH_DEBT_SCAN.md` — the latter is the canonical source for Health / Debt Score / Issue count / Remediation time, and the three derivative blocks must always agree with it

### Review Steps

1. Scan which source files were modified in the PR diff
2. Cross-check the relevant doc files above for stale references, missing entries, or outdated descriptions
3. Leave a review comment listing **each inconsistency found** (file, line or section, description of the problem)
4. **Withhold approval** until all doc inconsistencies are resolved

## Git Workflow

- **Two long-lived trunks.** `develop` is the active integration trunk and the GitHub default branch. `main` is the stable production trunk and is only updated via release back-merges (never via direct PRs). There is no `master` — the repo was renamed `master` → `main`. Flag any PR that targets `main` directly instead of going through a `release/vX.X.X` back-merge, and flag any PR that attempts to (re)introduce `master`.
- Branch naming: `feature/tec-{N}-short-description` or `fix/tec-{N}-...` is the primary convention (where `TEC-N` is the Linear issue ID; triggers Linear two-way sync). For issues without a Linear ticket, `feature/issue-{N}-...` or `fix/issue-{N}-...` (using the GitHub issue number) is the accepted fallback. Both patterns are acceptable on PRs.
- PRs target `develop` for ongoing work, or the active `release/vX.X.X` branch during a release cycle.
- Releases: `release/vX.X.X` is cut from `develop`, fixes merge into it, tag `vX.X.X` is cut on the release branch, GitHub Actions publishes to npm, then `release/vX.X.X` back-merges into **both** `develop` (to carry the tagged state forward) **and** `main` (to advance the stable pointer). Verify the branch structure matches this flow — the `main` back-merge is mandatory.
- **Issues are created on GitHub only.** Verify PR branch names match one of the naming patterns above.
- **Direct-to-develop commits:** Verify only `.md` files are committed directly to `develop`. Code changes (`src/`, tests, config) must come through a branch and PR.
- **PR author:** Verify PRs are opened by the bot account (`my-llm-bot[bot]`), not a personal account.

## Tech Debt Self-Scan

When touching files, check for:
- Deep nesting (>4 levels) — use guard clauses
- File length (>500 lines) — must be split (matches `.claude/rules/code-quality.md`)
- Function length (>50 lines) — flag for refactor
- Cyclomatic complexity (>10) — flag for simplification
- Missing JSDoc on public APIs
- Verify `// techdebt-ignore-next-line` directives include the specific rule name, not a blanket suppress
- Flag use of `any` type (prefer `unknown`). Flag `@ts-ignore` (use `@ts-expect-error` with explanation)

## Security Review

When reviewing PRs that touch MCP tool handlers or file system operations, check for:

- **Path validation:** Verify path arguments use `requireAbsolutePath()` or `optionalAbsolutePath()` from `inputParser.ts` in **all** handler files (`handlers.ts`, `configValidator.ts`, `dependencyHandlers.ts`, and any future domain handler). `optionalAbsolutePath` treats empty strings as `undefined` — flag any manual empty-string checks on optional path parameters. Flag any use of `requireString` for path parameters, or direct use of `args.path` in `fs` calls.
- **Regex safety:** Flag `new RegExp()` with user-supplied patterns that lack length limits or flag allowlisting. Verify security constants (`MAX_PATTERN_LENGTH`, `MAX_CODE_LENGTH`, `MAX_FILE_SIZE_BYTES` from `customRulesEngine.ts`) are imported — flag hardcoded values.
- **String interpolation in RegExp:** Verify captured strings are escaped before interpolation into `new RegExp()`.
- **Error message leakage:** Verify error messages use `getRelativePath()` — flag any absolute filesystem paths in client-facing responses.
- **Handler output leakage:** Verify tool response output (e.g., debt summary, SQALE metrics) uses `basename()` for project paths — flag any raw absolute paths in formatted user-facing output. See Issue #138.
- **Nesting extractions preserved:** Flag any PR that inlines `validatePatternRegex` back into `validatePattern` (`src/core/customRulesEngine.ts`) or `makeVcpkgDep` back into `parseVcpkgJson` (`src/analyzers/dependencies/cppParser.ts`). Both helpers exist specifically to hold those functions within the 4-level nesting limit (#131, #146); re-inlining would re-introduce the nesting-depth violations.

## Testing Review

When reviewing PRs that add or modify tests:

- Verify all imports include `.js` extension (required by NodeNext resolution)
- Check that `jest.mock(...)` calls are at the top of the file
- Verify mocked references use `as jest.MockedFunction<typeof X>` typing
- Flag any new public function in `src/` that does not have at least one test case in its `__tests__/` neighbor (function-level, not just feature-level)

## Workflow Review

When reviewing PRs that touch `.github/workflows/*.yml`, check for:

- **Broad triggers:** `test.yml`, `codeql.yml`, and `docs-check.yml` must not reintroduce a `pull_request: branches: [...]` filter. All three should trigger on every `pull_request` regardless of base branch and on `push` to `develop`, `main`, and `release/**` (PR #168 broadened this so release-branch PRs aren't stuck "expected" on required status checks).
- **CI install:** The `test` and `coverage` jobs in `test.yml` must install via `npm ci --ignore-scripts`. `package.json` declares `"prepare": "npm run build"`, and omitting `--ignore-scripts` triggers a full `tsc` compile during install that duplicates the later Build step. The only exception is `publish.yml`, which intentionally allows scripts so `dist/` gets built for packing.
- **Typecheck via npm script:** The CI typecheck step must call `npm run typecheck` (aliases `tsc --noEmit`) rather than `npx tsc --noEmit` directly. The pinned npm script is the source of truth per the Build & Test Commands table in `CLAUDE.md`.
- **Lint as a blocking check:** The `npm run lint` step must not carry `--if-present` or `continue-on-error: true`. ESLint is now wired up (PR #168) and lint failures must fail CI.
- **Workflow injection hardening:** Flag any `run:` step that interpolates `${{ github.event.issue.title }}`, `github.event.issue.body`, `github.event.pull_request.title`, `github.event.pull_request.body`, `github.event.comment.body`, `github.event.review.body`, `github.event.head_commit.message`, `github.event.head_commit.author.email`, `github.event.head_commit.author.name`, `github.event.pull_request.head.ref`, `github.head_ref`, or any other attacker-controllable context value directly into a shell command. Safe pattern: bind to an `env:` variable and reference `"$VAR"` from the shell.
- **Publish flow guards:** In `publish.yml`, the tag-vs-`package.json` version check must be present before `npm publish`, and the publish step must use OIDC (`id-token: write` + `--provenance`). Flag PRs that remove the version check or add a classic `NPM_TOKEN` secret.
- **Node matrix forward-compat:** `test.yml` matrix must not regress to Node 18. `engines.node` is `>=20.19.0`; the matrix should track `[20.x, 22.x]` (or newer as the engines floor moves).
- **Required status check contexts:** New blocking checks must be added to the `Global Updates` ruleset (where `pr-automation` lives), not dropped into the workflow without ruleset registration — otherwise PRs hang "expected" forever.
