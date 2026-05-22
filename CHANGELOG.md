# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Security
- **Dependabot alert sweep — 13 alerts triaged (TEC-46, #189): 10 dismissed (patched version present), 3 dev-only tracked via `dependabot.yml` ignore entries (alerts remain open until upstream patches).** `npm audit --omit=dev` confirmed 0 runtime vulnerabilities throughout. Per-alert trace:
  - **#45** `fast-uri` ≤3.1.1 (high, GHSA path-traversal) — lockfile already installs `fast-uri@3.1.2` (patched) via `@modelcontextprotocol/sdk`. Dismissed: patched version present.
  - **#41** `fast-uri` ≤3.1.0 (high, GHSA host-confusion) — same resolution as #45. Dismissed: patched version present.
  - **#44** `hono` <4.12.18 (moderate, CSS Declaration Injection in JSX SSR) — lockfile installs `hono@4.12.22` (patched). TechDebtMCP uses stdio transport only; `hono` is bundled by the SDK for its HTTP transport which is never invoked. Dismissed: patched version present, unreachable code path.
  - **#43** `hono` <4.12.18 (low, improper NumericDate JWT validation) — same resolution as #44.
  - **#42** `hono` <4.12.18 (moderate, `bodyLimit()` bypass) — same resolution as #44.
  - **#40** `hono` <4.12.16 (moderate, Cache Middleware `Vary` leakage) — lockfile installs `hono@4.12.22`. Dismissed: patched version present, unreachable code path.
  - **#39** `hono` <4.12.16 (moderate, unvalidated JSX tag names) — same resolution as #40.
  - **#37** `hono` <4.12.14 (moderate, HTML Injection in `hono/jsx` SSR) — lockfile installs `hono@4.12.22`. Dismissed: patched version present, unreachable code path.
  - **#38** `ip-address` ≤10.1.0 (moderate, XSS in `Address6` HTML methods) — lockfile installs `ip-address@10.2.0` (patched) via `@modelcontextprotocol/sdk→express-rate-limit`. Dismissed: patched version present.
  - **#46** `brace-expansion` ≥5.0.0,<5.0.6 (moderate, numeric range DoS) — lockfile installs `brace-expansion@5.0.6` (patched) via direct `minimatch` dependency. Dismissed: patched version present.
  - **#49** `vite` ≤6.4.1 (moderate, GHSA-67mh-4wv8-2f99) — dev-only transitive via `vitepress`. Not shipped to npm consumers; not executed at runtime. Added `dependabot.yml` ignore entry (suppresses future update PRs; alert remains open until upstream `vitepress` releases a patched version).
  - **#48** `esbuild` ≤0.24.2 (moderate, GHSA-67mh-4wv8-2f99) — dev-only transitive via `vitepress→vite`. Same rationale as #49. Added `dependabot.yml` ignore entry (suppresses future update PRs; alert remains open until upstream can provide a patch).
  - **#47** `tmp` ≤0.2.3 (low, GHSA-52f5-9888-hmc6) — dev-only transitive via `@anthropic-ai/mcpb` bundler tool. Not shipped to npm consumers; only used locally to produce `.mcpb` release artifacts. Added `dependabot.yml` ignore entry (suppresses future update PRs; alert remains open until `@anthropic-ai/mcpb` ships a patched transitive).
- **Added `.github/dependabot.yml`** — documents ignore entries for `esbuild`, `vite`, and `tmp` with code-reference comments explaining why each is dev-only and unreachable at runtime.

### Added
- **Tool annotations** (`readOnlyHint` / `destructiveHint`) on every entry in `TOOL_DEFINITIONS`. Read tools are flagged `readOnlyHint: true`; `add_custom_rule` and `remove_custom_rule` are flagged `destructiveHint: true`. README tool table gains a "Type" column documenting Read vs Write. (TEC-43)
- **Claude Code plugin manifest** (TEC-35, #175) — `.claude-plugin/plugin.json` declares the plugin and wires `mcpServers.tech-debt-mcp` to `npx -y tech-debt-mcp@latest` (no source bundling, tracks the published npm release). `.claude-plugin/marketplace.json` lets the repo double as its own marketplace, so users can run `/plugin marketplace add PierreJanineh/TechDebtMCP` then `/plugin install tech-debt-mcp@techdebtmcp`.
- **MCPB bundle tooling** (TEC-42, #182) — `mcpb/manifest.json` + `mcpb/icon.png` describe the server for Claude Desktop's one-click bundle installer. New `npm run mcpb:pack` script (driven by `scripts/build-mcpb.mjs`) stages a clean prod tree (`npm ci --omit=dev --ignore-scripts`) and produces `mcpb/tech-debt-mcp-<version>.mcpb` (3.9 MB packed). A Jest test (`src/server/__tests__/mcpbManifest.test.ts`) asserts the manifest's tool list and version stay in sync with `TOOL_DEFINITIONS` and `package.json`.
- **Docs site** (TEC-38, #178) — VitePress site under `docs/site/` deployed to `pierrejanineh.github.io/TechDebtMCP` via `.github/workflows/docs.yml` on path-filtered pushes to `develop` (triggers on `docs/site/**`, `src/server/tools.ts`, `scripts/gen-docs-tools.mjs`, root docs, `package.json`, `package-lock.json`, and the workflow file itself). Tool reference (one page per MCP tool) is generated at build time by `scripts/gen-docs-tools.mjs` directly from `TOOL_DEFINITIONS`, with `readOnlyHint` / `destructiveHint` annotations rendered as badges. `ARCHITECTURE.md`, `ROADMAP.md`, and `CHANGELOG.md` are mirrored into the site at build time so the canonical sources stay authoritative. Authored landing page, install paths (npx, Claude Desktop config, Claude Code plugin, MCPB bundle), language coverage matrix, custom rules guide, and security model page. README gains a "Documentation" badge.

## [2.0.2] - 2026-04-10

### Security
- **Test coverage trace for v2.0.2 security fixes:** All six security-hardening checklist items are verified by existing tests shipped alongside the individual security PRs. Coverage as of this entry (all files ≥ 80% statement; branch coverage ≥ 80% except `dependencyHandlers.ts` at 74%): `inputParser.ts` 99%/99%, `resourceHandlers.ts` 100%/96%, `configValidator.ts` 94%/92%, `customRulesEngine.ts` 96%/85%, `regexUtils.ts` 100%/100%, `dependencyHandlers.ts` 95%/74%. Bullet-by-bullet trace:
  1. **Path validation rejects relative paths / `../` traversal** — `src/server/__tests__/inputParser.test.ts` lines 396–483 (`path validation` describe block); `src/server/__tests__/configValidator.test.ts` lines 53–59; `src/server/__tests__/dependencyHandlers.test.ts` lines 79–99.
  2. **Resource handler path validation** — `src/server/__tests__/resourceHandlers.test.ts` lines 348–404 (`should reject a relative projectPath`, `should normalize a path with .. sequences` cases for both summary and issues resources).
  3. **Regex flag allowlist rejects invalid flags** — `src/core/__tests__/customRulesEngine.test.ts` lines 262–396 (`rejects flags containing disallowed characters`, `accepts all valid flag characters`, `rejects combined u and v flags`, `strips disallowed flag characters at execution time`).
  4. **Pattern length cap enforced** — `src/core/__tests__/customRulesEngine.test.ts` lines 235–260 (`rejects pattern whose length exceeds MAX_PATTERN_LENGTH`, `accepts pattern exactly at the MAX_PATTERN_LENGTH-character limit`) and lines 415–433 (`skips over-length patterns at execution time and invokes onRuleError`).
  5. **`escapeRegExp()` helper works correctly** — `src/utils/__tests__/regexUtils.test.ts` lines 1–52 (all five test cases covering no-metacharacter pass-through, individual metacharacter escaping, multi-metacharacter strings, safe `new RegExp()` construction, and literal-match semantics).
  6. **Error messages use relative paths / no absolute-path leakage** — `src/server/__tests__/configValidator.test.ts` lines 62–134 (`should not leak absolute path in ...` assertions); `src/server/__tests__/dependencyHandlers.test.ts` lines 88–93; `src/server/__tests__/handlers.test.ts` lines 122–213 (`path sanitization — no absolute paths in output` describe block, 4 assertions for `get_debt_summary` and `get_sqale_metrics`).
- Dependency bumps to resolve reachable and unreachable Dependabot alerts ahead of v2.0.2: `glob` `^10.3.10` → `^13.0.6`, `ignore` `^5.3.0` → `^7.0.5`, `toml` `^3.0.0` → `^4.1.1`. All runtime vulnerabilities flagged on the previous lockfile state no longer appear in `npm audit`. Remaining Dependabot alerts (handlebars via `ts-jest`, hono/express/path-to-regexp via `@modelcontextprotocol/sdk` HTTP transport) are dev-only or unreachable code paths — TechDebtMCP uses stdio transport and does not ship dev dependencies to npm consumers.
- **Dropped Node 18 support** — `toml@4.1.1` (runtime dependency) requires Node >=20; `engines.node` bumped from `>=18.0.0` to `>=20.0.0`. Node 18 reached EOL April 2025. CI matrix updated to `[20.x, 22.x]`. Subsequently bumped further to `>=20.19.0` to satisfy ESLint 10.2.0's declared engine requirement (`^20.19.0 || ^22.13.0 || >=24`).

### Changed
- **`.techdebtrc.json`** — Added `ruleExclusions` for `console-log` (MCP stdio transport calls in `index.ts`, `setup.ts`), `type-assertion` (idiomatic `as const` / `as Record` patterns in parsers and server modules), `line-length` (`tools.ts` MCP schema strings), and `nesting-depth` (inherent `checkPattern` chains in all language analyzers and dependency parsers); added `jest.config.js` to the `ignore` list to suppress config file nesting noise (#147)
- **README.md** — Restructured for scannability: added stat line, grouped tools table with collapsible parameter reference, Resources table, collapsed SwiftUI section, merged Custom Rules into Configuration
- **ARCHITECTURE.md** — Fixed project structure tree (added `inputParser.ts`, `argValidation.ts`, `swiftUiChecks.ts`, `swiftUiChecksPhase2.ts`), removed phantom `src/services/` directory, updated test count (597), fixed file size table, marked resolved debt items
- **CLAUDE.md** — Deduplicated Git and Code Quality sections (reference `.claude/rules/`), updated resource recipe, added Security section
- **.github/copilot-instructions.md** — Added Security Review and Testing Review sections, updated architecture tree, aligned file length threshold (500)
- **ROADMAP.md** — Added v2.0.2 security patch section with issues #124-131
- **CONTRIBUTING.md** — Updated metrics to March 2026 scan, marked resolved refactoring targets
- **GITHUB_PACKAGES.md** — Clarified npm as primary distribution, removed incorrect `require()` API example

- Extracted custom rules handlers from `handlers.ts` into `customRulesHandlers.ts` to restore `handlers.ts` to under 500 lines (#145)
- Reduced nesting in `customRulesEngine.validatePattern` to ≤4 levels via extracted `validatePatternRegex` helper (#146)
- Reduced nesting in core engines (`analysisEngine`, `customRulesEngine`) to ≤4 levels (#118)
- Reduced nesting in server modules to ≤4 levels (#119)
- Reduced nesting depth in 10 dependency parsers (#88)
- Reduced `csharpAnalyzer.ts` nesting from 7 to ≤4 levels (#113)
- Reduced `cppParser.parseVcpkgJson` nesting from 5 to ≤4 levels via `makeVcpkgDep()` helper (#131)
- Split `swiftAnalyzer.ts` into companion modules (`swiftUiChecks.ts`, `swiftUiChecksPhase2.ts`) (#121)
- Replaced `<any>` generics and suppressed non-null-assertion false positives (#112)
- Replaced type assertions in `handlers.ts` with typed input parsers (#110)
- Replaced type assertions in `configValidator.ts` and `dependencyHandlers.ts` with type guards (#106)
- Replaced type assertions in `resourceHandlers.ts` with type guards (#107)

### Fixed
- Security: captured strings interpolated into `new RegExp()` in `swiftUiChecks.ts` are now escaped via `escapeRegExp()` from the new `src/utils/regexUtils.ts` helper, preventing regex injection and unintended matching (#128)
- Regex flag allowlist in `customRulesEngine.ts` now includes the `v` (unicodeSets) flag introduced in Node.js 20 (V8 11.0); added mutual-exclusion validation that rejects patterns supplying both `u` and `v` flags simultaneously (#140)
- `optionalAbsolutePath` in `inputParser.ts` now returns `undefined` for empty string `""` instead of throwing a confusing `must be an absolute path` error; empty string is treated the same as an absent field (#137)
- `execute_custom_rules` schema in `tools.ts` now declares `minLength: 1` on `path` and `minLength: 1` / `maxLength: MAX_CODE_LENGTH` on `code` to surface the empty-string rejection and 500,000-character cap in the schema. `parseExecuteCustomRulesInput` also rejects empty-string `code` with a targeted `InvalidParams` error before the max-length check
- `handleAnalyzeFile` (in `handlers.ts`) and `handleExecuteCustomRules` (in `customRulesHandlers.ts`) replaced the `fileExists()` pre-check with a single `getFileStats()` + `isFile()` guard, eliminating the TOCTOU race between `access()` and `stat()`, rejecting directories, devices, FIFOs, and sockets with a clear `InvalidParams` error before `readFile()` is called, and surfacing accurate "Path not found or not accessible" messages for both `ENOENT` and `EACCES` cases without leaking absolute paths
- Security: `handleValidateConfig` (in `configValidator.ts`) replaced the double `fileExists()` / `stat()` / `fileExists()` check-then-use chain with a single `getFileStats()` call and ENOENT-on-open handling, eliminating the same TOCTOU window the CodeQL `js/file-system-race` rule flagged (#164). `isFile()` guards non-directory inputs so devices/FIFOs/sockets are rejected before `readFile()` is called
- Dependencies: bumped transitive lockfile entries (`hono`, `path-to-regexp`, `express-rate-limit`, `ajv`, `yaml`, `qs`, `handlebars`, `picomatch`, `minimatch`, `brace-expansion`) to their patched versions via `npm update`, clearing all 29 open Dependabot advisories on the release branch. No direct dependencies changed — the SDK's transitive tree absorbed the fixes within existing semver ranges
- **npm-shrinkwrap.json** — Removed to stop publishing lockfile to npm (#123)
- Replaced `console.warn` with `console.error` for MCP stdio compatibility (#100)
- Eliminated analyzer false positives via `ruleExclusions` config mechanism (#78)
- Replaced non-null assertions with destructured variables in `analysisEngine` (#101)
- Security: reduced absolute-path leakage in server-facing messages; `dependencyHandlers.ts` uses `basename()` in McpError messages (including `stat()` error paths) and project-name report fields, `configValidator.ts` uses `basename()` in user-facing messages and sanitizes raw `fsReadFile`/`stat()` error text, and `findPackageFiles` uses `getRelativePath()` for scan-error messages (#129)
- Security: user-supplied regex patterns in `add_custom_rule` and `validate_custom_pattern` are now validated for length (≤1 000 chars) and flag allowlist (`dgimsuy` only); inline `code` for `execute_custom_rules` is capped at 500 000 characters, preventing ReDoS attacks (#127)
- Security: `projectPath` extracted from URI template variables in `debt://summary` and `debt://issues` resource handlers is now validated with `isAbsolute()` and normalized with `resolve()`, preventing path traversal attacks (#126)
- Security: `path` parameters for `analyze_project`, `analyze_file`, `get_debt_summary`, `get_sqale_metrics`, `get_recommendations`, `get_issues_by_severity`, `get_issues_by_category`, and `execute_custom_rules` are now validated with `isAbsolute()` and normalized with `resolve()` in `inputParser.ts`, preventing path traversal and relative-path attacks (#125)

### Added
- **ESLint tooling** — `eslint@^10` + `typescript-eslint@^8` added to `devDependencies`, with a flat `eslint.config.mjs` scoped to `src/**/*.ts` (tests, configs, and `dist/` ignored). New `typecheck` npm script (`tsc --noEmit`) and the existing `lint` script now actually runs. CI `test.yml` upgraded to treat `npm run lint` as a blocking check (no more `--if-present` / `continue-on-error`), use `npm ci --ignore-scripts` to skip the `prepare` double-compile, and call `npm run typecheck` instead of `npx tsc --noEmit`. Workflows now also trigger on PRs to `release/**`. `CLAUDE.md` gains a canonical Build & Test Commands cheat sheet so agents stop probing for tools. Partially addresses #165 (`cppAnalyzer.ts:212/228` dead assignments fixed here) and closes #166 via source fixes for the flagged unused-variable warnings. The remaining #165 item — `pipParser.parseDependencyString` dead `name` variable — is closed in PR #171 alongside the back-merge. (PR #168)
- CodeQL security scanning workflow (`.github/workflows/codeql.yml`) — runs SAST on every push to `develop`/`main`, every PR to `develop`/`main`, and weekly on Mondays at 03:00 UTC; uses `security-and-quality` queries for deeper coverage (#124)
- `cppParser` vcpkg.json tests for empty dependencies array, missing `dependencies` key, and malformed JSON — completing coverage for all `parseVcpkgJson` edge cases (#131)
- CI workflow (`.github/workflows/docs-check.yml`) warns on PRs with `src/` changes when none of the five required docs were touched; non-blocking, posts an actionable comment listing the required files and removes the comment automatically when docs are subsequently updated (#130)
- Claude Code local hook (`.claude/hooks/pre-pr-docs-check.sh`) warns before `gh pr create` when docs were not updated alongside `src/` changes; the hook lives in `.claude/` which is gitignored and therefore local-only, not distributed with the repo (#130)
- Direct unit tests for `swiftUiChecks` and `swiftUiChecksPhase2` modules
- Unit tests for `inputParser` module
- Inline suppression comments for tech debt issues (#105)
- Regex precision improvements to eliminate 11 analyzer false positives (#102, #104)

## [2.0.1] - 2026-03-20

### Added
- **MCP Resources (Phase 6)** — Two passive resource templates for tech debt data access:
  - `debt://summary/{+projectPath}` — Health score, SQALE metrics, issue counts by severity/category
  - `debt://issues/{+projectPath}` — Filterable issues list with severity, category, and limit query parameters
- `src/server/resourceHandlers.ts` — New module using `McpServer.registerResource()` high-level API
- 8 tests covering resource registration, reads, filters, limits, and error paths

### Changed
- **CLAUDE.md** — Consolidated as single source of truth for coding conventions; added MCP resource recipe, design spec pointer, documentation maintenance checklist
- **ARCHITECTURE.md** — Updated MCP Server section to reflect `src/server/` module split, fixed tool count (16), added `resourceHandlers.ts`, updated dependency graph
- **README.md** — Added MCP Resources section with usage documentation
- **ROADMAP.md** — Phase 6 marked complete, Phase 3/4 enriched with issue numbers, branch names, and acceptance criteria
- **.github/copilot-instructions.md** — Trimmed to Copilot-specific PR review workflow, references CLAUDE.md for conventions

## [2.0.0] - 2026-03-09

### Added
- **CODE_OF_CONDUCT.md** - Added Contributor Covenant v2.1 based Code of Conduct
  - Establishes community standards and expectations
  - Defines enforcement guidelines
  - Improves Snyk community health score
- **.techdebtrc.json** - Project-specific tech debt configuration file
  - File size limits (max 500 lines)
  - Complexity limits (max nesting depth 4)
  - Custom patterns for nullish coalescing and non-null assertions
  - Test file exclusions to prevent false positives
- **TECH_DEBT_SCAN.md** - Complete self-scan analysis with before/after comparison
  - Shows impact of .techdebtrc.json configuration
  - Documents reduction from 101 to 81 issues (-19.8%)
  - Identifies false positives vs. real technical debt
  - Provides actionable roadmap for continuous improvement
- **check_dependencies** MCP tool (Phase 2 - Dependency Analysis)
  - Scans project for package manifests across multiple ecosystems
  - Validates that the provided path is a directory (rejects file paths)
  - Returns a structured dependency report with production vs development dependencies
  - Includes failed-parse reporting and filesystem scan error surfacing
  - Filters empty manifest sections from reports (e.g., dev-only with `includeDev=false`)
  - Parsers for npm, pip, Maven/Gradle, Cargo, Go Modules, Composer, Bundler, NuGet, C/C++, and Swift Package Manager added under `src/analyzers/dependencies/`
- **validate_config** MCP tool (Phase 2 - Config Validation)
  - Validates `.techdebtrc.json` syntax and schema
  - Checks `ignore`, `include`, `rules`, `severity`, `languageOverrides`, and `customPatterns` fields
  - Guards against non-object top-level values (null, array, primitives)
  - Reuses `CustomRulesEngine.validatePattern()` for custom pattern validation
  - Returns detailed errors and warnings with actionable messages
- **get_vulnerability_report** MCP tool (Phase 2 - Offline Vulnerability Inventory)
  - Generates an offline dependency inventory for vulnerability review
  - Validates that the provided path is a directory
  - Lists all dependencies by ecosystem in tabular format
  - Filters empty manifest sections and surfaces filesystem scan errors
  - Offline-first; online CVE lookup planned for Phase 2b (OSV API)
  - Accepts `includeDev` flag (default: false) to focus on production dependencies

### Changed
- **src/index.ts refactored** — split 883-line monolith into focused modules:
  - `src/server/setup.ts` — server instantiation and transport wiring
  - `src/server/handlers.ts` — all MCP tool request handlers
  - `src/server/tools.ts` — centralized `TOOL_DEFINITIONS` array
  - `src/server/formatters.ts` — output formatting helpers
  - `src/index.ts` now an 18-line entry point only
- **README.md** - Added Code Quality section with updated SQALE rating
  - Self-scan results (A rating, 2.9% debt ratio, down from 3.4%)
  - Link to TECH_DEBT_SCAN.md with before/after comparison
  - Configuration impact metrics (81 issues vs. 101 before)
  - Link to CODE_OF_CONDUCT.md in Contributing section
  - Added SQALE rating badge to header
- **CONTRIBUTING.md** - Added Tech Debt Compliance section
  - Updated metrics (2.9% debt ratio)
  - File size and complexity limits
  - Code quality rules enforcement
  - Known refactoring targets with specific line numbers
  - Configuration impact before/after comparison
- **ARCHITECTURE.md** - Added Code Quality Standards section
  - Current project health metrics (2.9% debt ratio)
  - File size and complexity limits table
  - Known technical debt items with priorities and line numbers
  - Self-scan strategy with measured configuration impact
  - Before/after comparison showing improvement
  - Regular health checks documentation
- **.github/copilot-instructions.md** - Added Tech Debt Refactoring Rules
  - Current SQALE rating and debt ratio (2.9%)
  - File size and complexity limits
  - Refactoring priorities with specific targets
  - Code quality rules enforcement
  - Pre/post refactoring checklist

### Documentation
- Comprehensive self-scan using tech-debt-mcp tool (2 scans: with/without config)
- Measured impact of .techdebtrc.json: -20 issues (-19.8%), -10 hours (-14.3%) remediation
- Identified 1 real high-priority issue (C# analyzer nesting at line 267)
- Identified 13 false positives (analyzer pattern definitions)
- Documented specific refactoring targets (src/index.ts: 883 lines, csharpAnalyzer.ts:267)
- Established quality baselines and targets with measurable goals
- Created configuration to prevent false positives in self-scanning
- All documentation now cross-references TECH_DEBT_SCAN.md for transparency

### Metrics Summary (at time of v2.0.0 release)
- **SQALE Rating:** A ⭐⭐⭐⭐⭐ (2.9% debt ratio, improved from 3.4%)
- **Total Issues:** 81 (down from 101)
- **Remediation Time:** 60 hours (down from 70 hours)
- **Improvement:** -20 false positives, -10 hours remediation time
- **Files Analyzed:** 25 (down from 33, test files excluded)
- **Critical Issues:** 0
- **High Issues:** 14 (13 are false positives in analyzer patterns)

### Community
- Improved Snyk package health score with Code of Conduct
- Better contributor onboarding with comprehensive guidelines
- Transparent quality metrics showing "we practice what we preach"

## [1.1.0] - 2026-02-07

### Added

#### SwiftUI-Specific Technical Debt Analysis (Issue #58)
- **14 comprehensive SwiftUI checks** across 2 phases
- **Phase 1 - Core SwiftUI Checks (9 checks):**
  - Excessive @State variables detection (>5 per view)
  - @ObservedObject initialization misuse detection
  - @Environment value force unwrap detection
  - Combine pipeline circular reference detection ([weak self] validation)
  - Missing Timer cleanup in onDisappear
  - Missing Task cancellation in async operations
  - UI updates on background threads detection
  - Dynamic list missing .id() modifiers
  - Expensive calculations in view body

- **Phase 2 - Advanced SwiftUI Patterns (5 checks):**
  - AnyView type erasure detection
  - Deprecated NavigationLink patterns
  - GeometryReader root-level misuse
  - Retain cycles in SwiftUI closures
  - Deep view nesting detection (>6 levels)

#### GitHub Packages Support
- Published to both npm Registry and GitHub Packages
- Comprehensive installation documentation (GITHUB_PACKAGES.md)
- Automated CI/CD publishing workflow

#### Quality Improvements
- 96 tests passing (100% of SwiftUI implementation)
- 22 todo tests for Phase 3 enhancements
- Performance optimization: content split once per file analysis
- Issue IDs include filePath for global uniqueness
- All Copilot review suggestions addressed

### Changed
- Updated README.md with multiple installation options (npm, GitHub Packages, source)
- Enhanced publish.yml workflow to publish to both registries
- Improved SwiftUI analyzer with per-view @State counting
- Better Environment validation with force unwrap detection at usage sites

### Fixed
- Timer cleanup detection bug (lines.indexOf issue)
- Environment validation now detects actual usage patterns
- Task cancellation guidance clarified (@MainActor ≠ cancellation)
- Removed duplicate method implementations in SwiftAnalyzer
- **execute_custom_rules schema** - Removed unsupported anyOf constraint (Thanks @ophirbucai - PR #63)

### Documentation
- Added GITHUB_PACKAGES.md - Comprehensive installation and setup guide
- Updated .github/copilot-instructions.md with strict documentation requirements
- Enhanced PR workflow with mandatory documentation checklist
- **IDE Installation Badges** - One-click install for VS Code, Cursor, Claude, Windsurf, JetBrains, Xcode (Thanks @ophirbucai - PR #66)
- **Documentation Accuracy** - Fixed tool count (13 tools), test count (96 passing + 22 todo), and branch references throughout all docs

## [1.0.0] - 2026-02-07

### Added

#### Phase 0: Language Support
- Support for 14 programming languages: JavaScript, TypeScript, Python, Java, Swift, Kotlin, Objective-C, C++, C, C#, Go, Rust, Ruby, PHP
- BaseAnalyzer with factory pattern for extensibility
- Language-specific tech debt detection patterns
- Comprehensive test coverage for all analyzers

#### Phase 1: SQALE Metrics ✅
- SQALE Engine with A-E rating system
- Remediation time calculations
- Debt ratio metrics (percentage of development time)
- Category and severity breakdowns
- Human-readable time formatting
- **NEW:** `get_sqale_metrics` MCP tool for dedicated SQALE reporting
- **NEW:** SQALE metrics integrated into all analysis reports

#### Phase 5: Custom Rules
- CustomRulesEngine for pattern-based checks
- 5 MCP tools for rule management:
  - `add_custom_rule` - Add custom pattern rules
  - `remove_custom_rule` - Remove rules by ID
  - `list_custom_rules` - Show all active rules
  - `execute_custom_rules` - Run rules against code
  - `validate_custom_pattern` - Validate patterns
- Regex support with configurable flags
- Language-specific rule filtering
- Multiple matches per line
- Cross-platform line ending support (\r\n and \n)

#### MCP Tools (13 total)
1. `analyze_project` - Full project technical debt analysis
2. `analyze_file` - Single file analysis
3. `get_debt_summary` - Quick debt summary
4. `get_sqale_metrics` - SQALE metrics with rating and remediation time
5. `list_supported_languages` - Show supported languages
6. `get_recommendations` - Prioritized suggestions
7. `get_issues_by_severity` - Filter issues by severity
8. `get_issues_by_category` - Filter issues by category
9. `add_custom_rule` - Add custom pattern rules
10. `remove_custom_rule` - Remove custom rules
11. `list_custom_rules` - List all custom rules
12. `execute_custom_rules` - Execute custom rules
13. `validate_custom_pattern` - Validate custom patterns

### Documentation
- Comprehensive README with installation and usage instructions
- ARCHITECTURE.md describing system design and patterns
- CONTRIBUTING.md with contribution guidelines
- AI agent instructions for Copilot
- Full API documentation for all MCP tools

### Testing
- 96 comprehensive tests across 8 test suites (22 todo for future enhancements)
- 100% test pass rate
- Tests for all language analyzers
- Tests for SQALE engine
- Tests for custom rules engine

[Unreleased]: https://github.com/PierreJanineh/TechDebtMCP/compare/v2.0.2...HEAD
[2.0.2]: https://github.com/PierreJanineh/TechDebtMCP/releases/tag/v2.0.2
[2.0.1]: https://github.com/PierreJanineh/TechDebtMCP/releases/tag/v2.0.1
[2.0.0]: https://github.com/PierreJanineh/TechDebtMCP/releases/tag/v2.0.0
[1.1.0]: https://github.com/PierreJanineh/TechDebtMCP/releases/tag/v1.1.0
[1.0.0]: https://github.com/PierreJanineh/TechDebtMCP/releases/tag/v1.0.0

