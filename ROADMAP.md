# Tech Debt MCP - Development Roadmap

This document outlines the development phases, release strategy, and future enhancements for Tech Debt MCP.

## Table of Contents

- [Version History](#version-history)
- [Current Status](#current-status)
- [Phase Overview](#phase-overview)
- [Future Phases](#future-phases)
- [Release Process](#release-process)
- [Release Criteria](#release-criteria)

## Version History

### Quality & Compliance Release

**Status:** ✅ **COMPLETE** (Included in v2.0.0)

Focus on project quality, code compliance, and transparent metrics.

#### Features

**Code Quality & Technical Debt Compliance**
- ✅ CODE_OF_CONDUCT.md - Contributor Covenant v2.1
- ✅ .techdebtrc.json - Project-specific tech debt configuration
- ✅ TECH_DEBT_SCAN.md - Complete self-scan analysis with before/after metrics
- ✅ Measured impact: -20 issues (-19.8%), -10 hours (-14.3%) remediation time
- ✅ SQALE Rating: A ⭐⭐⭐⭐⭐ (2.9% debt ratio at time of release)

**Documentation Updates**
- ✅ README.md - Added Code Quality section with SQALE rating badge
- ✅ CONTRIBUTING.md - Tech Debt Compliance section with refactoring targets
- ✅ ARCHITECTURE.md - Code Quality Standards section
- ✅ .github/copilot-instructions.md - Tech Debt Refactoring Rules with priorities

**Metrics Summary (at time of v2.0.0 release, Feb 2026)**
- SQALE Rating: A ⭐⭐⭐⭐⭐ (2.9% debt ratio, improved from 3.4%)
- Total Issues: 81 (down from 101)
- Remediation Time: 60 hours (down from 70 hours)
- Improvement: -20 false positives, -10 hours remediation time
- Files Analyzed: 25 (down from 33, test files excluded)
- Critical Issues: 0
- High Issues: 14 (post-`ruleExclusions` in .techdebtrc.json; all known false positives excluded)

**Community**
- Improved Snyk package health score with Code of Conduct
- Better contributor onboarding with comprehensive guidelines
- Transparent quality metrics showing "we practice what we preach"

---

### v1.1.0 - SwiftUI Analysis (Released: 2026-02-07)

**Status:** ✅ **COMPLETE**

Enhanced Swift analyzer with comprehensive SwiftUI-specific technical debt detection.

#### Completed Features

**SwiftUI Analysis (Issue #58 - Phase 1 & 2)**
- ✅ **14 SwiftUI-specific checks** across 2 phases
- ✅ **Phase 1 - Core SwiftUI Checks (9 checks):**
  - Excessive @State variables detection (>5 per view)
  - @ObservedObject vs @StateObject misuse
  - @Environment value force unwrap detection
  - Combine pipeline circular references
  - Missing Timer cleanup in onDisappear
  - Missing Task cancellation handling
  - UI updates on background threads
  - Dynamic list missing .id() modifiers
  - Expensive calculations in view body

- ✅ **Phase 2 - Advanced SwiftUI Patterns (5 checks):**
  - AnyView type erasure detection
  - Deprecated NavigationLink patterns
  - GeometryReader root-level misuse
  - Retain cycles in SwiftUI closures
  - Deep view nesting detection (>6 levels)

**GitHub Packages Integration**
- ✅ Published to npm and GitHub Packages
- ✅ Automated CI/CD publishing workflow
- ✅ Comprehensive installation documentation

**Quality Improvements**
- ✅ 96 tests passing (118 total with 22 todo for Phase 3) (at time of v1.1.0 release)
- ✅ SwiftUI suite: Phase 1 + Phase 2 implemented, Phase 3 todo (at time of v1.1.0 release)
- ✅ All Copilot review suggestions addressed
- ✅ Performance optimization (content split once)
- ✅ Contributor: @ophirbucai (execute_custom_rules fix, IDE badges)

#### Deliverables
- Tests: Repo total 96 passing, 22 todo (at time of v1.1.0 release)
- Documentation: Updated README with SwiftUI section, GITHUB_PACKAGES.md
- NPM Package: Published as `tech-debt-mcp@1.1.0` (historical)
- GitHub Packages: Available on both npm and GitHub Packages registries

---

### v1.0.0 - Initial Release (Released: 2026-02-07)

**Status:** ✅ **COMPLETE**

The foundation release with multi-language support, SQALE metrics, and custom rules engine.

#### Completed Phases

**Phase 0: Multi-Language Support**
- ✅ 14 programming languages supported
- ✅ BaseAnalyzer with factory pattern
- ✅ Language-specific detection patterns
- ✅ Comprehensive test coverage

**Phase 1: SQALE Metrics** ✅ **COMPLETE**
- ✅ A-E rating system implementation
- ✅ Remediation time calculations
- ✅ Debt ratio metrics
- ✅ Category and severity breakdowns
- ✅ Human-readable time formatting
- ✅ `get_sqale_metrics` MCP tool (13th tool)
- ✅ SQALE metrics integrated into all analysis reports

**Phase 5: Custom Rules Engine**
- ✅ Pattern-based custom rules
- ✅ 5 MCP tools for rule management
- ✅ Regex support with configurable flags
- ✅ Language-specific filtering
- ✅ Multi-match and cross-platform support

#### Deliverables

- **13 MCP Tools:** Full suite of analysis and custom rule tools
- **96 Tests:** 100% pass rate across 8 test suites (22 todo for Phase 3)
- **Documentation:** README, ARCHITECTURE, CONTRIBUTING guides
- **NPM Package:** Published as `tech-debt-mcp@1.0.0`

## Current Status

**Latest Release:** v2.0.2 (Security Patch) — pending npm publish (post-merge tag push)

**Next Up:**
- **Phase 3 (v2.1.0):** Snapshot & Trend Tracking — Issues #39-44 — Sprint 2-3
- **Phase 4 (v2.2.0):** Complexity Metrics — Issues #45-49 — Sprint 4-5

**Design Spec:** See `docs/superpowers/specs/2026-03-19-phases-3-4-6-design.md` for Phases 3 & 4 implementation details.

**Project Management:** GitHub Issues — see [issues and milestones](https://github.com/PierreJanineh/TechDebtMCP/issues).

## Phase Overview

| Phase | Version | Status | Description |
|-------|---------|--------|-------------|
| Phase 0 | v1.0.0 | ✅ Complete | Multi-language support (14 languages) |
| Phase 1 | v1.0.0 | ✅ Complete | SQALE metrics & rating system (+ get_sqale_metrics tool) |
| Phase 5 | v1.0.0 | ✅ Complete | Custom rules engine |
| v1.1.0 | v1.1.0 | ✅ Complete | SwiftUI-specific analysis (14 checks) |
| Quality & Compliance | v2.0.0 | ✅ Complete | Code of Conduct, .techdebtrc.json, TECH_DEBT_SCAN.md, documentation |
| Phase 2 | v2.0.0 | ✅ Complete | Dependency analysis — 10 parsers, 3 MCP tools, index.ts refactor |
| Phase 6 | v2.0.1 | ✅ Complete | MCP Resources (debt://summary, debt://issues) |
| Security Patch | v2.0.2 | ✅ Complete | Security hardening, refactor merges, CI guardrails (#124–#131, #137–#140, #146, #164–#166) |
| Phase 3 | v2.1.0 | 📋 Planned | Snapshot & trend tracking |
| Phase 4 | v2.2.0 | 📋 Planned | Code complexity analysis |

## Future Phases

### Security Patch (v2.0.2)

**Status:** ✅ **COMPLETE** (Release prep complete; pending git tag and npm publish for v2.0.2)

**Objective:** Fix the security vulnerabilities found during audit plus a follow-up TOCTOU regression, merge pending refactors, add CI security guardrails and ESLint tooling.

#### Issues

| Issue | Title | Severity | Status |
|-------|-------|----------|--------|
| #125 | Path traversal on tool path parameters | High | ✅ Fixed |
| #126 | Resource template projectPath bypasses validation | High | ✅ Fixed |
| #127 | ReDoS via user-controlled regex in custom rules engine | High | ✅ Fixed |
| #128 | Unescaped string interpolated into RegExp in swiftUiChecks | Medium | ✅ Fixed — `escapeRegExp()` in `src/utils/regexUtils.ts` |
| #129 | Absolute filesystem paths leaked in error messages | Low | ✅ Fixed |
| #137 | `optionalAbsolutePath` rejects empty string instead of treating as absent | Low | ✅ Fixed |
| #138 | Absolute path leakage in `get_debt_summary` / `get_sqale_metrics` output | Low | ✅ Fixed |
| #139 | Path validation missing on `check_dependencies` / `validate_config` / `get_vulnerability_report` | High | ✅ Fixed |
| #140 | Regex flag allowlist missing `v` (unicodeSets) flag for Node.js 20+ | Low | ✅ Fixed |
| #146 | `customRulesEngine.validatePattern` nesting depth 6 | Medium | ✅ Fixed — extracted `validatePatternRegex` helper |
| #164 | TOCTOU race in `handleValidateConfig` — `js/file-system-race` HIGH | High | ✅ Fixed — single-stat `getFileStats()` + `isFile()` pattern (PR #167) |
| #165 | Useless local variable assignments in cppAnalyzer / pipParser | Low | ✅ Fixed via PR #168 source edits |
| #166 | Unused variables / imports flagged by CodeQL | Note | ✅ Fixed via PR #168 source edits |
| #124 | Add CodeQL security scanning workflow | — | ✅ Done — `.github/workflows/codeql.yml` |
| #130 | Docs freshness CI check + Claude Code hook | — | ✅ Done |

#### Also included

- Merge 3 pending refactor branches (#85, #86, #88 — nesting reductions)
- ~18 commits already on `develop` (refactors, Swift analyzer split, npm-shrinkwrap fix)

#### Acceptance Criteria

- [x] All security issues fixed with tests (>80% statement coverage)
- [x] CodeQL workflow running on push/PR
- [x] Docs freshness check warns on PRs missing doc updates
- [x] `npm test && npm run build` pass
- [x] All existing tests still pass
- [x] CLAUDE.md, ARCHITECTURE.md, README.md, ROADMAP.md, CHANGELOG.md updated
- [ ] Tagged and published to npm as v2.0.2

---

### Phase 2: Dependency Analysis (v2.0.0)

**Status:** ✅ **COMPLETE** (Released as v2.0.0)

**Objective:** Parse and analyze project dependencies across multiple package managers.

#### Delivered

- **10 Dependency Parsers** (`src/analyzers/dependencies/`):
  - npm (package.json) — `npmParser.ts`
  - pip (requirements.txt, pyproject.toml, Pipfile) — `pipParser.ts`
  - Maven/Gradle (pom.xml, build.gradle, build.gradle.kts) — `gradleParser.ts`
  - Swift (Package.swift, Podfile, Cartfile) — `swiftPackageParser.ts`
  - NuGet (.csproj, packages.config) — `nugetParser.ts`
  - Cargo (Cargo.toml) — `cargoParser.ts`
  - Go Modules (go.mod) — `goModParser.ts`
  - Composer (composer.json) — `composerParser.ts`
  - Bundler (Gemfile) — `bundlerParser.ts`
  - C/C++ (CMakeLists.txt, conanfile, vcpkg.json) — `cppParser.ts`

- **3 New MCP Tools:**
  - `check_dependencies` — scans manifests, returns production/dev split per ecosystem
  - `validate_config` — validates `.techdebtrc.json` schema and custom patterns
  - `get_vulnerability_report` — offline dependency inventory (online CVE lookup in Phase 2b)

- **`src/index.ts` refactored** — split into `src/server/` modules (setup, handlers, tools, formatters)

- **Offline-first** — no external API calls; Phase 2b adds optional OSV API integration

**New Types Needed:**
- `PackageManager` - Enum of supported package managers
- `DependencyReport` - Complete dependency analysis result
- `OutdatedDependency` - Dependency update information
- `VulnerabilitySource` - External API configuration

#### Acceptance Criteria

- ✅ All 8 package managers supported
- ✅ Dependency parsing tests pass (min 80% coverage)
- ✅ Offline mode works without API calls
- ✅ Optional API integration documented
- ✅ 3 new MCP tools functional
- ✅ README and ARCHITECTURE updated
- ✅ All existing tests still pass

#### Effort Estimate

**Size:** Large (2-3 weeks)

**Complexity:** High (multiple parsers, API integration, error handling)

---

### Phase 3: Snapshot & Trend Tracking (v2.1.0)

**Status:** 📋 **PLANNED** — Issues #39-44

**Objective:** Enable baseline snapshots and historical trend analysis to track technical debt changes over time.

**Branch:** `feature/issue-39-trend-tracking` (from `develop`)

**Design Spec:** See `docs/superpowers/specs/2026-03-19-phases-3-4-6-design.md` → "PR 2: Phase 3" section for full implementation details including types, API surface, storage format, and tool definitions.

#### Issues

| Issue | Title | Description |
|-------|-------|-------------|
| #39 | Add Snapshot and TrendData types | Add `AnalysisSnapshot`, `SnapshotComparison`, `TrendData` to `src/types/index.ts` |
| #40 | Implement snapshot manager | Create `src/core/snapshotManager.ts` — save, load, compare, trend, prune |
| #41 | Add `save_baseline` MCP tool | Tool definition + handler to save analysis as baseline snapshot |
| #42 | Add `compare_with_baseline` MCP tool | Tool definition + handler to diff current vs saved baseline |
| #43 | Add `get_trend` MCP tool | Tool definition + handler to calculate trajectory from snapshot history |
| #44 | Add tests for snapshot manager and trend tools | Tests in `src/core/__tests__/snapshotManager.test.ts` |

#### New files

| File | Purpose |
|------|---------|
| `src/core/snapshotManager.ts` | Save, load, compare, trend calculation, prune |
| `src/core/__tests__/snapshotManager.test.ts` | Unit tests with mocked file system |
| `src/server/snapshotHandlers.ts` | MCP tool handlers (keeps handlers.ts under 500 lines) |

#### Modified files

| File | Change |
|------|--------|
| `src/types/index.ts` | Add `AnalysisSnapshot`, `SnapshotComparison`, `TrendData` |
| `src/server/tools.ts` | Add 5 tool definitions (`save_baseline`, `compare_with_baseline`, `get_trend`, `list_snapshots`, `delete_snapshot`) |
| `src/server/handlers.ts` | Add 5 cases dispatching to `snapshotHandlers.ts` |

#### Storage

```
.techdebt/                        # auto-created by save_baseline
├── .gitignore                    # contains "*" — snapshots are local-only
└── snapshots/
    ├── baseline.json
    └── 2026-03-19T10-30-00.json
```

#### Acceptance Criteria

- [ ] Snapshots save/load correctly
- [ ] Baseline comparison accurate
- [ ] Trend calculations correct (`improving`/`stable`/`degrading` based on ±5% health score delta)
- [ ] Retention policy works (default: 5 snapshots)
- [ ] 5 new MCP tools functional
- [ ] Tests for snapshot manager (min 80% coverage)
- [ ] `npm test && npm run build` pass
- [ ] All existing tests still pass

#### Effort Estimate

**Size:** Medium (1-2 weeks)

**Complexity:** Medium (file I/O, JSON handling, date calculations)

---

### Phase 4: Code Complexity Analysis (v2.2.0)

**Status:** 📋 **PLANNED** — Issues #45-49

**Objective:** Calculate cyclomatic and cognitive complexity to identify overly complex functions across all 14 languages.

**Branch:** `feature/issue-45-complexity-metrics` (from `develop`)

**Design Spec:** See `docs/superpowers/specs/2026-03-19-phases-3-4-6-design.md` → "PR 3: Phase 4" section for full implementation details including types, algorithms per language family, function extraction patterns, and BaseAnalyzer integration.

**Approach:** Regex-based, no tree-sitter. Tree-sitter is a heavy native dependency for an MCP server distributed via `npx`. Regex-based function extraction is sufficient for hotspot identification.

#### Issues

| Issue | Title | Description |
|-------|-------|-------------|
| #45 | Add ComplexityMetrics interface | Add `FunctionComplexity`, `FileComplexity`, `ComplexityReport`, `ComplexityThresholds` to `src/types/index.ts` |
| #46 | Implement complexity calculator | Create `src/core/complexityAnalyzer.ts` — function extraction, cyclomatic + cognitive calculation for all 14 languages |
| #47 | Integrate complexity into analyzers | Wire `ComplexityAnalyzer.analyzeFile()` into `BaseAnalyzer.calculateMetrics()`, emit `maintainability` issues for high complexity |
| #48 | Add `get_complexity_report` MCP tool | Tool definition + handler — summary stats, health breakdown, hotspots ranked by complexity |
| #49 | Add tests for complexity calculator | Tests in `src/core/__tests__/complexityAnalyzer.test.ts` per language family |

#### New files

| File | Purpose |
|------|---------|
| `src/core/complexityAnalyzer.ts` | Function extraction, cyclomatic + cognitive calculation |
| `src/core/__tests__/complexityAnalyzer.test.ts` | Unit tests per language family |

#### Modified files

| File | Change |
|------|--------|
| `src/types/index.ts` | Add `FunctionComplexity`, `FileComplexity`, `ComplexityReport`, `ComplexityThresholds` |
| `src/server/tools.ts` | Add `get_complexity_report` tool definition |
| `src/server/handlers.ts` | Add 1 case |
| `src/analyzers/baseAnalyzer.ts` | Integrate complexity into `calculateMetrics()` |

#### Acceptance Criteria

- [ ] Cyclomatic complexity accurate (McCabe method)
- [ ] Cognitive complexity implemented (SonarQube-style)
- [ ] Regex-based function extraction works for all 14 languages
- [ ] `get_complexity_report` MCP tool functional
- [ ] Tests for complexity analyzer (min 80% coverage)
- [ ] `npm test && npm run build` pass
- [ ] All existing tests still pass

#### Effort Estimate

**Size:** Large (2-4 weeks)

**Complexity:** High (multiple complexity algorithms, 14 language families, performance)

---

## Release Process

### Automated Release Workflow

Tech Debt MCP uses GitHub Actions for automated npm publishing with supply chain provenance.

#### Step-by-Step Release Process

1. **Prepare Release**
   ```bash
   # Ensure you're on develop branch and up to date
   git checkout develop
   git pull origin develop
   
   # Ensure all tests pass
   npm test
   npm run build
   ```

2. **Update Version**
   ```bash
   # Update version in package.json (choose one)
   npm version patch  # 1.0.0 -> 1.0.1 (bug fixes)
   npm version minor  # 1.0.0 -> 1.1.0 (new features)
   npm version major  # 1.0.0 -> 2.0.0 (breaking changes)
   
   # This creates a git commit and tag automatically
   ```

3. **Update CHANGELOG.md**
   - Add new version section following Keep a Changelog format
   - Document all changes under Added/Changed/Fixed/Removed
   - Commit the changelog update

4. **Push Release Tag**
   ```bash
   # Push the tag (this triggers GitHub Actions)
   git push origin v2.0.0  # Replace with actual version
   
   # Push commits
   git push origin develop
   ```

5. **Automated Workflow**
   - GitHub Actions workflow triggers on tag push
   - Runs full test suite
   - Builds TypeScript to dist/
   - Publishes to npm with provenance
   - Creates GitHub Release with auto-generated notes

6. **Verify Release**
   - Check npm: https://www.npmjs.com/package/tech-debt-mcp
   - Check GitHub Releases: https://github.com/PierreJanineh/TechDebtMCP/releases
   - Test installation: `npm install -g tech-debt-mcp@latest`

#### Manual Rollback (Emergency)

If a bad release is published:

```bash
# Within 72 hours, you can unpublish
npm unpublish tech-debt-mcp@2.0.0

# OR publish a quick patch release
npm version patch
# Fix the issue
npm test
git push --tags
```

### GitHub Actions Setup

#### Required Secrets

Configure in GitHub repository settings (Settings → Secrets and variables → Actions):

**`NPM_TOKEN`** - npm access token with "Automation" permissions
1. Go to https://www.npmjs.com/settings/YOUR_USERNAME/tokens
2. Click "Generate New Token" → "Automation"
3. Copy the token
4. Add to GitHub secrets as `NPM_TOKEN`

#### Workflows

**`.github/workflows/publish.yml`** - Automated npm publishing on version tags

**`.github/workflows/test.yml`** - Continuous integration on every push/PR

---

## Release Criteria

### All Releases Must Meet

- ✅ **All tests pass:** 100% pass rate, no skipped tests
- ✅ **Build succeeds:** `npm run build` completes without errors
- ✅ **Documentation updated:** README.md, ARCHITECTURE.md, CHANGELOG.md
- ✅ **Version bumped:** package.json version incremented
- ✅ **Changelog updated:** Following Keep a Changelog format
- ✅ **Breaking changes documented:** If any, clearly marked
- ✅ **Dependencies updated:** No known security vulnerabilities

### Major Releases (2.0.0, 3.0.0) Must Also Include

- ✅ **Migration guide:** If breaking changes exist
- ✅ **Beta testing:** At least 1 beta/RC release for community testing
- ✅ **Performance benchmarks:** No significant regressions
- ✅ **Backward compatibility:** Clear deprecation warnings before removal

### Semantic Versioning Strategy

- **Patch (1.0.x):** Bug fixes, documentation updates, no new features
- **Minor (1.x.0):** New features, backward compatible, no breaking changes
- **Major (x.0.0):** Breaking changes, major architectural changes

**Planned Releases:**
- v2.0.0 - Phase 2 (Dependency Analysis) - Breaking: New dependency types
- v2.1.0 - Phase 3 (Snapshots) - Non-breaking: New MCP tools
- v2.2.0 - Phase 4 (Complexity) - Non-breaking: New MCP tools

---

## Future Considerations

### Beyond Phase 4

Potential enhancements for v3.0.0 and beyond:

- **Parallel Processing:** Analyze multiple files concurrently
- **Incremental Analysis:** Skip unchanged files for performance
- **Plugin System:** Load custom analyzers dynamically
- **CI/CD Integration:** GitHub Actions, GitLab CI, Jenkins plugins
- **IDE Extensions:** VSCode, JetBrains integration
- **Web Dashboard:** Visual reporting and trend charts
- **Team Collaboration:** Shared baselines and team goals
- **Custom Severity Weights:** Per-project issue scoring

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines on:
- Development setup
- Coding standards
- Testing requirements
- Pull request process

## References

- **Architecture:** [ARCHITECTURE.md](ARCHITECTURE.md)
- **Changelog:** [CHANGELOG.md](CHANGELOG.md)
- **Contributing:** [CONTRIBUTING.md](CONTRIBUTING.md)
- **AI Instructions:** [.github/copilot-instructions.md](.github/copilot-instructions.md)

---

**Last Updated:** 2026-04-11

