# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Test Commands

For agents and contributors — run these from the repo root. The agent
that processes PR review threads (pr-automation/pr-reviewer) consults
this section before pushing, so keep it accurate.

| Stage         | Command                                       |
|---------------|-----------------------------------------------|
| Install (CI)  | `npm ci --ignore-scripts`                     |
| Install (dev) | `npm install --include=dev --ignore-scripts`  |
| Typecheck     | `npm run typecheck`                           |
| Lint          | `npm run lint`                                |
| Test          | `npm test`                                    |
| Build         | `npm run build`                               |

**Rules for agents:**
- These commands are the source of truth. If a stage is **N/A**, skip it entirely — do not search for alternatives, do not run binaries directly (`node_modules/.bin/jest`), do not install missing tools, do not modify `package.json` to add scripts.
- If a listed command fails, fix the underlying issue or report it. Do not "work around" by switching to a different command.
- If you believe a stage *should* exist but doesn't, surface that as a finding in your PR summary — do not silently add it.
- **Install context matters.** Both install commands pass `--ignore-scripts` because `package.json` declares `"prepare": "npm run build"` — leaving the hook enabled causes every install to run `tsc`, which duplicates the later Build step and wastes CI minutes. In CI, `npm ci --ignore-scripts` fails fast on lockfile drift while skipping the double-compile. Locally, `npm install --include=dev --ignore-scripts` additionally pulls the devDependencies that an agent needs for `npm run lint` / `npm test`.

Lint config lives in `eslint.config.mjs` (flat config, ESLint 10 + typescript-eslint 8). Tests and build scripts are ignored by lint; only `src/**/*.ts` is checked.

**Dev loop helpers (humans):**

```bash
npm run dev     # ts-node src/index.ts (no build needed)
npm run watch   # tsc --watch
npm test -- --testPathPatterns=src/analyzers  # run a single suite
```

**Before every commit:** run `npm test` then `npm run build`. Both must succeed.

## Gotchas

- After checking out a branch or creating a worktree, always run `npm install --include=dev --ignore-scripts` before running tests or using node modules. This is the canonical dev install — see the Install row of the Build & Test Commands table for the reasoning.
- **Pre-commit hook enforces doc updates** for any branch that changes `src/` files — see `.claude/rules/docs-maintenance.md` for the file list. For pure bug fixes or refactors, a minimal touch (e.g., bumping "Last Updated") satisfies the hook.
- **Worktree agents cannot push with bot tokens** — the repository's "Global Updates" ruleset blocks app installation tokens. Push from the main workspace after the agent finishes, or use the default credentials which have bypass.

## Architecture

Tech Debt MCP is a Model Context Protocol (MCP) server exposing tools and resources for static tech-debt analysis across 14 languages.

**Canonical enumerations** — before listing supported languages, dependency parsers, or tools in any doc/template, read the source instead of paraphrasing:
- Languages (14): `case` arms in `createAnalyzer()` in `src/analyzers/index.ts`
- Dependency parsers: files in `src/analyzers/dependencies/` (excluding `baseParser.ts`, `index.ts`, `__tests__/`)
- Tools (16): `TOOL_DEFINITIONS` in `src/server/tools.ts`

```
src/
├── index.ts                    # Entry point — creates server, attaches handlers + resources, runs
├── server/
│   ├── setup.ts                # McpServer instantiation and transport wiring
│   ├── handlers.ts             # Core MCP tool request handlers (CallToolRequestSchema)
│   ├── tools.ts                # TOOL_DEFINITIONS array (tool schemas/descriptions)
│   ├── inputParser.ts          # Tool argument validation (requireString, optionalString, etc.)
│   ├── argValidation.ts        # Argument coercion and constraint checks
│   ├── resourceHandlers.ts     # MCP resource templates (debt://summary, debt://issues)
│   ├── formatters.ts           # Output formatting helpers
│   ├── configValidator.ts      # .techdebtrc.json validation handler
│   ├── customRulesHandlers.ts  # Custom rules CRUD & execution handlers
│   └── dependencyHandlers.ts   # Dependency analysis & vulnerability report handlers
├── types/index.ts              # Single source of truth for all TypeScript interfaces
├── config/languages.ts         # Per-language config: extensions, package files, patterns
├── core/
│   ├── analysisEngine.ts       # Project-level orchestrator: discovers files, applies include allowlist, fans out to analyzers
│   ├── sqaleEngine.ts          # SQALE rating/debt ratio calculation
│   └── customRulesEngine.ts    # User-defined pattern rules (.techdebtrc.json)
├── analyzers/
│   ├── baseAnalyzer.ts         # Abstract base — shared logic, checkPattern(), applyRuleExclusions()
│   ├── index.ts                # createAnalyzer() factory
│   ├── [language]Analyzer.ts   # 14 language-specific analyzers
│   ├── swiftUiChecks.ts        # SwiftUI Phase 1 checks (companion to swiftAnalyzer)
│   ├── swiftUiChecksPhase2.ts  # SwiftUI Phase 2 checks (advanced patterns)
│   └── dependencies/
│       ├── baseParser.ts       # Abstract dependency parser
│       ├── index.ts            # createDependencyParser() factory
│       └── [ecosystem]Parser.ts # npm, pip, cargo, gradle, nuget, go.mod, etc.
└── utils/
    ├── fileUtils.ts            # fs helpers (readFile, fileExists, getFileStats, getRelativePath)
    └── regexUtils.ts           # escapeRegExp() — safe RegExp construction helper
.claude/                        # (repo root — contributor automation, excluded from npm package)
├── hooks/                      # PreToolUse hooks (block-npm-publish.sh, check-tools-manifest-sync.sh)
├── rules/                      # Markdown rule files loaded by Claude Code (code-quality, docs-maintenance, etc.)
├── skills/                     # Project-specific skills (add-config-block, refresh-self-scan)
└── settings.json               # Claude Code project settings (hook registrations, permissions)
.claude-plugin/                 # (repo root — marketplace manifest ONLY; plugin source lives in plugin/)
└── marketplace.json            # Marketplace entry: source points at "./plugin". Top-level `version` and the plugin entry's `version` are enforced equal to `package.json.version` by `src/server/__tests__/pluginManifest.test.ts` and `scripts/build-mcpb.mjs:assertVersionsMatch()`.
plugin/                         # (repo root — the entire Claude Code plugin install surface)
├── .claude-plugin/
│   └── plugin.json             # Claude Code plugin manifest (mcpServers → npx -y tech-debt-mcp@latest)
├── commands/                   # Claude Code slash commands (/techdebt-scan, /techdebt-file, /techdebt-summary)
├── skills/                     # Claude Code skills (proactive-analysis — context-triggered analysis)
└── README.md                   # User-facing plugin README shown in the Claude Code marketplace
                                # WHY a subdir: marketplace install (source: "./plugin") does a filesystem copy of
                                # this directory; keeping it isolated prevents src/, node_modules/, .claude/, .env,
                                # .idea/, etc. from leaking into every user's plugin cache. The surface allowlist is
                                # enforced by src/server/__tests__/pluginManifest.test.ts (#242).
mcpb/                           # (repo root — Claude Desktop one-click bundle)
├── manifest.json               # MCPB v0.3 manifest (mirrors TOOL_DEFINITIONS, version pinned to package.json)
├── icon.png                    # 512×512 bundle icon
├── staging/                    # gitignored — clean prod tree built by scripts/build-mcpb.mjs
└── tech-debt-mcp-<version>.mcpb # gitignored artifact, attached to GitHub Releases
server.json                     # (repo root — official MCP Registry manifest; reverse-DNS name io.github.PierreJanineh/tech-debt-mcp,
                                # npm package + stdio transport. Carries version in two fields; bump per .claude/rules/version-bump.md)
docs/site/                      # (repo root — VitePress docs site for GitHub Pages)
├── .vitepress/
│   ├── config.mts              # Nav, sidebar, base = '/TechDebtMCP/', local search
│   └── theme/                  # Custom slate palette + home-scoped --home-* vars
├── public/                     # Static assets (icon.png + inverted icon-light.png)
├── .showcase.json              # Pinned-SHA manifest consumed by scripts/scan-showcase.mjs (Gson, Serilog, Slim today)
├── index.md                    # Landing hero
├── install.md, languages.md, custom-rules.md, security.md, privacy.md
├── examples/                   # gitignored — regenerated each build by scan-showcase.mjs
└── tools/                      # gitignored — regenerated each build by gen-docs-tools.mjs
scripts/
├── build-mcpb.mjs              # `npm run mcpb:pack` driver — stages, runs `npm ci --omit=dev --ignore-scripts`, packs
├── gen-docs-tools.mjs          # `npm run docs:gen-tools` — imports dist/server/tools.js TOOL_DEFINITIONS, emits docs/site/tools/*.md + mirrors of ARCHITECTURE/ROADMAP/CHANGELOG
└── scan-showcase.mjs           # `npm run docs:scan-showcase` — clones repos in .showcase.json at their pinned SHAs, calls AnalysisEngine.analyzeProject() directly + handleCheckDependencies() tool handler, emits docs/site/examples/*.md as chat-style audit pages
```

### Building the MCPB bundle

```bash
npm install --include=dev --ignore-scripts
npm run mcpb:pack
# -> mcpb/tech-debt-mcp-<version>.mcpb
```

The build script's `assertVersionsMatch()` asserts that `mcpb/manifest.json`, `plugin/.claude-plugin/plugin.json`, and `.claude-plugin/marketplace.json` (both top-level `version` and the plugin entry's `version`) all equal `package.json.version` — bump all four in lockstep at release time. `src/server/__tests__/mcpbManifest.test.ts` enforces the manifest's tool list matches `TOOL_DEFINITIONS`, so adding/removing a tool requires updating `mcpb/manifest.json` in the same PR.

`server.json` (the official MCP Registry manifest at repo root) also carries the version in two fields (top-level `version` and `packages[0].version`) but is **not yet** covered by `assertVersionsMatch()` — bump it manually until it is wired in. See `.claude/rules/version-bump.md` for the full version-pinned-file checklist (auto-loaded when editing any of them).

### Building the docs site

```bash
npm run docs:dev      # local dev server at http://localhost:5173/TechDebtMCP/
npm run docs:build    # full build: tsc → gen-docs-tools.mjs → scan-showcase.mjs → vitepress build
```

`docs:build` runs `npm run build` first so `dist/` exists, then `scripts/gen-docs-tools.mjs` imports `TOOL_DEFINITIONS` directly (emits one Markdown page per tool plus mirrors of `ARCHITECTURE.md`, `ROADMAP.md`, and `CHANGELOG.md`), then `scripts/scan-showcase.mjs` clones the repos listed in `docs/site/.showcase.json` at their pinned SHAs and emits `docs/site/examples/*.md` as chat-style audit pages. SHAs are bumped manually at release time. The whole generated tree (`tools/`, `examples/`, the three mirrored MDs) is gitignored — root docs stay the canonical source. Deploys to GitHub Pages via `.github/workflows/docs.yml` on path-filtered pushes to `develop` (triggers on `docs/site/**`, `src/server/tools.ts`, `scripts/gen-docs-tools.mjs`, `scripts/scan-showcase.mjs`, `ARCHITECTURE.md`, `ROADMAP.md`, `CHANGELOG.md`, `package.json`, `package-lock.json`, and `.github/workflows/docs.yml`).

### Request flow

**Tools:** `MCP client` → `handlers.ts` (`CallToolRequestSchema` switch) → `AnalysisEngine` → per file, two independent branches run and their results are combined: **[built-in]** `createAnalyzer()` (per file language) → `[Language]Analyzer.performLanguageSpecificChecks()` → issues array (inline suppression applied per-line in `checkPattern`/`checkTodoComments`) → `applyRuleExclusions()` (filter by config globs) → `filterIssues()` (filter by requested severity/category); **[custom-patterns]** `CustomRulesEngine.executeRules()` (called once per file; internally iterates all `customPatterns` entries from `.techdebtrc.json`, applying inline suppression to each match) → `AnalysisEngine.applyCustomRuleExclusions()` (filter custom-pattern issues by `ruleExclusions` config globs) → `AnalysisEngine.applyCustomSeverityOverrides()` (apply per-rule severity overrides from `config.severity`) → `filterIssues()` (filter by requested severity/category); combined results → `formatters.ts` → response.

**Resources:** `MCP client` → `resourceHandlers.ts` (via `McpServer.registerResource()`) → `AnalysisEngine.analyzeProject()` → JSON response.

### Testing tools and resources interactively

For manual exercise of any tool or resource, use the MCP Inspector:

```bash
npm run build
npx @modelcontextprotocol/inspector node dist/index.js
```

Opens a web UI where you can call tools and read resources directly, including the RFC-6570 templated ones like `debt://summary/{+projectPath}` (note the `//` when substituting an absolute path — template trailing `/` + path leading `/`).

### Key conventions

- **Imports use `.js` extensions** — required for `module: NodeNext` / `moduleResolution: NodeNext` in tsconfig.
- **All types in `src/types/index.ts`** — never define types locally.
- **Factory pattern** — use `createAnalyzer(language, config)` and `createDependencyParser(filePath)`.
- **BaseAnalyzer.checkPattern()** — the standard way to match regex patterns and emit `TechDebtIssue` objects.
- **Domain handler extraction** — when handlers.ts grows, extract domain-specific handlers to dedicated files (e.g., `configValidator.ts`, `customRulesHandlers.ts`, `dependencyHandlers.ts`, `resourceHandlers.ts`).
- **Prefer `unknown` over `any`** — the ESLint rule is set to `warn` (not error) so narrowly-scoped boundary uses surface without blocking CI; new code should use `unknown`. No `@ts-ignore` (use `@ts-expect-error` with a comment).
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

## Inline Suppression

Use `// techdebt-ignore-next-line [rule]` or block comments to suppress false positives directly in source code. Both `checkPattern()` and `checkTodoComments()` respect these directives.

```typescript
// Suppress the next line (all rules):
// techdebt-ignore-next-line
debugger;

// Suppress the next line (specific rule only):
// techdebt-ignore-next-line debugger
debugger;

// Suppress a block of lines:
// techdebt-ignore-start ts-ignore
issues.push(...this.checkPattern(filePath, content, /@ts-ignore/g, {
  title: '@ts-ignore comment found',
  // ...
}));
// techdebt-ignore-end ts-ignore
```

Use this to prevent self-detection false positives in analyzer source files — wrap pattern definitions in rule-specific blocks (e.g., `// techdebt-ignore-start debugger`...`// techdebt-ignore-end debugger`).

**Always specify the rule name** in suppression directives (e.g., `// techdebt-ignore-next-line debugger`) — avoid blanket suppressions, which silence all rules and hide real issues.

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
4. Use `jsonSuccessResponse(uri, data)` to return results and `jsonErrorResponse(uri, message)` for validation errors. Both produce the standard `{ contents: [{ uri, mimeType, text }] }` shape.
5. Wrap the callback logic with `withResourceErrorHandling(uri, () => ...)` — it catches thrown errors and returns `jsonErrorResponse` automatically.
6. No changes needed in `setup.ts` — SDK auto-registers `resources` capability.

## Adding a New MCP Tool

1. Add the tool schema to `TOOL_DEFINITIONS` in `src/server/tools.ts`. Every tool **must** include an `annotations` object — set `readOnlyHint: true` for side-effect-free tools, or `destructiveHint: true` for tools that mutate server session state. The test suite (`src/server/__tests__/tools.test.ts`) enforces this and will fail CI if `annotations` is missing or unclassified.
2. Add a `case 'tool_name':` in `handlers.ts` `CallToolRequestSchema` handler.
3. Implement the handler function — in `handlers.ts` for core tools, or in a dedicated file (e.g., `configValidator.ts`, `dependencyHandlers.ts`) for domain-specific tools. Keep `handlers.ts` under 500 lines.
4. Validate tool arguments using `inputParser.ts` helpers (`requireString`, `requireAbsolutePath`, `optionalAbsolutePath`, `requireRecord`, `optionalString`, `optionalNumber`, etc.) — never access `args` properties directly. Use `requireAbsolutePath`/`optionalAbsolutePath` for any path parameter.

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

See `.claude/rules/docs-maintenance.md` for the canonical list of files to update after every implementation PR. Do not defer docs to a separate PR — include them in the implementation PR.

**Self-scan metric source of truth:** `TECH_DEBT_SCAN.md` is the canonical source for Health / Debt Score / Issue count / Remediation time. Any occurrence of these metrics elsewhere (`README.md` Self-Scan Results, `ARCHITECTURE.md` Current Status, `CONTRIBUTING.md` Configuration Impact) must agree with `TECH_DEBT_SCAN.md`. When a fresh scan changes the numbers, update `TECH_DEBT_SCAN.md` first, then refresh the three derivative docs in the same commit.

## Git & PR Workflow

See `.claude/rules/git-workflow.md` for branching, PR, and commit conventions.

## Code Quality Limits

See `.claude/rules/code-quality.md` for file length, function length, nesting, and complexity limits. Applied automatically when editing `src/**/*.ts`.

## Testing

Run all: `npm test`. Run one suite: `npm test -- --testPathPatterns=src/analyzers`. Run one file: `npm test -- goAnalyzer.test.ts`.

See [`CONTRIBUTING.md`](CONTRIBUTING.md#testing) for test file conventions, Jest configuration, and example test structure.

## Security

**Automated scanning:** CodeQL SAST runs on every push to `develop`/`main`/`release/**` and every PR regardless of base branch via `.github/workflows/codeql.yml` (using `security-and-quality` queries). The sibling workflows `test.yml` and `docs-check.yml` use the same broadened triggers. See Issue #124 and PR #168.

**Dependency CVEs:** `npm audit` and the Dependabot Security tab measure different things and often disagree — see `.claude/rules/dependency-security.md` for the assessment policy (upgrade / override / ignore-with-rationale), why they diverge, and the current reconciled triage. Key rule: `npm audit --omit=dev` must stay at 0 (a production-reachable CVE is never ignored), and the `.github/dependabot.yml` ignore list must agree with the triage table. See Issue #248 (TEC-76).

When handling user input from MCP tool calls:

- **Path arguments:** Use `requireAbsolutePath(args, 'path')` or `optionalAbsolutePath(args, 'path')` from `inputParser.ts` — these validate with `path.isAbsolute()` and normalize with `path.resolve()`. `optionalAbsolutePath` treats an empty string `""` the same as `undefined` (returns `undefined`). Never use `requireString` for path parameters. This applies to **all** handler files (`handlers.ts`, `configValidator.ts`, `dependencyHandlers.ts`, and any future domain handler). See Issues #125, #126, #137, #139.
- **User-supplied regex:** Never compile user-provided patterns via `new RegExp()` without length limits and flag allowlisting. Allow `dgimsuvy`; `u` and `v` are mutually exclusive and must be validated as such. The older "`v` only on Node 20+" caveat is no longer relevant — `package.json` pins `engines.node >=20.19.0`. See Issues #127, #140.
- **String interpolation into RegExp:** Captured strings interpolated into `new RegExp()` must be escaped first using `escapeRegExp()` from `src/utils/regexUtils.ts`. See Issue #128.
- **Error messages:** Use `getRelativePath()` or `basename()` in error messages and reports returned to clients — never leak absolute filesystem paths. Applies to all handler files: `dependencyHandlers.ts`, `configValidator.ts`, `customRulesHandlers.ts`, `handlers.ts`. Do not echo raw `err.message` from filesystem operations (`readFile()`, `getFileStats()`, etc.) — these typically include absolute paths. Either sanitize by replacing the absolute path with its `basename()`, or rethrow as an `McpError` with a safe message. Implemented in Issue #129 and extended by the #148 / #149 / #164 TOCTOU hardening.
- **Handler output:** Use `basename()` (from `node:path`) to sanitize project paths in user-facing tool responses (e.g., debt summary, SQALE metrics). Never embed raw absolute paths in formatted output. See Issue #138.
- **Security constants** in `customRulesEngine.ts`: `MAX_PATTERN_LENGTH` (1,000 chars), `MAX_CODE_LENGTH` (500,000 chars), `MAX_FILE_SIZE_BYTES` (500,000 bytes). Import and reference these — never hardcode the values.
- **`validatePattern` nesting:** The nested flag + regex validation logic lives in `validatePatternRegex` (private static helper) to stay within the 4-level nesting limit. Keep that extraction in place when extending validation (#146).
- **`cppParser` nesting:** `parseVcpkgJson()` uses `Array.map` + `makeVcpkgDep()` private helper to stay within the 4-level nesting limit (#131).
