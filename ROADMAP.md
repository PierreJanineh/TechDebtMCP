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
- ✅ **NEW:** `get_sqale_metrics` MCP tool (13th tool)
- ✅ **NEW:** SQALE metrics integrated into all analysis reports

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

### v1.1.0 - SwiftUI Analysis (Unreleased)

**Status:** ✅ **READY FOR RELEASE** (tagging/publishing after merge)

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
- ✅ Repo total: 96+ tests passing (118 total with 22 todo for Phase 3)
- ✅ SwiftUI suite: 13 implemented Phase 1 + 13 implemented Phase 2 + 22 todo Phase 3
- ✅ All Copilot review suggestions addressed
- ✅ Performance optimization (content split once)
- ✅ Contributor: @ophirbucai (execute_custom_rules fix)

#### Deliverables

- **Tests:** Repo total 96 passing (SwiftUI tests: 13 Phase 1 + 13 Phase 2 + 22 Phase 3 todo)
- **Documentation:** Updated README with SwiftUI section, GITHUB_PACKAGES.md
- **NPM Package:** Published as `tech-debt-mcp@1.1.0`
- **GitHub Packages:** Available on both npm and GitHub Packages registries

### v2.0.0 - Dependency Analysis (In Progress)

**Status:** 🚧 **IN PROGRESS - Phase 2 Infrastructure Complete**

#### Phase 2: Dependency Analysis (Issue #18 - IN PR #61)
- ✅ BaseDependencyParser abstract class
- ✅ Factory pattern for parser creation  
- ✅ Infrastructure ready for 8 package manager parsers
- ✅ 21 comprehensive tests (9 todo for future parsers)
- ✅ Copilot review suggestions addressed
- 🚧 Individual parser implementations pending (Issues #19-28)
  - npm (JavaScript/TypeScript)
  - pip (Python)
  - Maven/Gradle (Java/Kotlin)
  - Cargo (Rust)
  - Go Modules
  - Composer (PHP)
  - Bundler (Ruby)
  - Swift/NuGet/C++ parsers

## Current Status

**Active Development:** Phase 2 Infrastructure Complete - Parser Implementations Starting

**PR #61:** Dependency Analyzer Infrastructure (Issue #18) - Under Review

**Next Release Target:** v2.0.0 - Q2 2026

## Phase Overview

| Phase | Version | Status | Description |
|-------|---------|--------|-------------|
| Phase 0 | v1.0.0 | ✅ Complete | Multi-language support (14 languages) |
| Phase 1 | v1.0.0 | ✅ Complete | SQALE metrics & rating system (+ get_sqale_metrics tool) |
| Phase 5 | v1.0.0 | ✅ Complete | Custom rules engine |
| Phase 2 | v2.0.0 | 🚧 In Progress | Dependency infrastructure ready; parser implementations pending |
| Phase 3 | v2.1.0 | 📋 Planned | Snapshot & trend tracking |
| Phase 4 | v2.2.0 | 📋 Planned | Code complexity analysis |

## Future Phases

### Phase 2: Dependency Analysis (v2.0.0)

**Status:** 🚧 **IN PROGRESS - Infrastructure Ready**

**Objective:** Parse and analyze project dependencies across multiple package managers, detect outdated packages and security vulnerabilities.

#### Key Features

- **Dependency Parsing:**
  - npm (package.json, package-lock.json)
  - pip (requirements.txt, Pipfile, setup.py)
  - Maven (pom.xml)
  - Gradle (build.gradle, build.gradle.kts)
  - Cargo (Cargo.toml, Cargo.lock)
  - Go Modules (go.mod, go.sum)
  - Composer (composer.json, composer.lock)
  - Bundler (Gemfile, Gemfile.lock)

- **Vulnerability Detection:**
  - Offline-first architecture
  - Optional integration with external APIs (OSV.dev, npm audit, Snyk)
  - CVE database lookup
  - Severity assessment

#### Implementation Plan

**New Files:**
```
src/
├── analyzers/
│   └── dependencies/
│       ├── baseParser.ts          # Abstract base parser
│       ├── index.ts                # Parser factory
│       ├── npmParser.ts            # npm/Node.js
│       ├── pipParser.ts            # pip/Python
│       ├── mavenParser.ts          # Maven/Java
│       ├── gradleParser.ts         # Gradle/Java/Kotlin
│       ├── cargoParser.ts          # Cargo/Rust
│       ├── goModParser.ts          # Go Modules
│       ├── composerParser.ts       # Composer/PHP
│       └── bundlerParser.ts        # Bundler/Ruby
└── services/
    └── vulnerabilityService.ts     # External API integration (optional)
```

**New MCP Tools:**
- `check_dependencies` - Analyze project dependencies
- `validate_config` - Validate dependency configurations
- `get_vulnerability_report` - Get security vulnerability details

**Types Already Defined:**
- `DependencyInfo` (in `src/types/index.ts`)
- `VulnerabilityInfo` (in `src/types/index.ts`)

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

**Status:** 📋 **PLANNED**

**Objective:** Enable baseline snapshots and historical trend analysis to track technical debt changes over time.

#### Key Features

- **Snapshot Management:**
  - Save analysis results as baseline snapshots
  - Store in `.techdebt/snapshots/` directory
  - JSON format with timestamps
  - Configurable retention policy (default: 30 snapshots)

- **Trend Analysis:**
  - Compare current analysis with baseline
  - Track debt increase/decrease over time
  - Identify improvement or regression patterns
  - Visualize trends with delta reporting

- **Delta Reporting:**
  - New issues introduced
  - Resolved issues
  - Net change in debt score
  - Category and severity trends

#### Implementation Plan

**New Files:**
```
src/
└── core/
    └── snapshotManager.ts          # Snapshot storage and comparison
```

**Storage Structure:**
```
.techdebt/
└── snapshots/
    ├── baseline.json               # Primary baseline
    ├── 2026-02-07T10-30-00.json   # Timestamped snapshots
    └── 2026-02-06T15-45-00.json
```

**New MCP Tools:**
- `save_baseline` - Save current analysis as baseline
- `compare_with_baseline` - Compare current state with baseline
- `get_trend` - Get historical trend data
- `list_snapshots` - List all saved snapshots
- `delete_snapshot` - Remove old snapshots

**New Types:**
- `Snapshot` - Snapshot data structure
- `TrendData` - Historical trend information
- `ComparisonResult` - Baseline comparison result
- `DeltaReport` - Changes between snapshots
- `SnapshotMetadata` - Snapshot metadata (date, version, etc.)

#### Acceptance Criteria

- ✅ Snapshots save/load correctly
- ✅ Baseline comparison accurate
- ✅ Trend calculations correct
- ✅ Retention policy works
- ✅ 5 new MCP tools functional
- ✅ Tests for snapshot manager (min 80% coverage)
- ✅ README and ARCHITECTURE updated
- ✅ All existing tests still pass

#### Effort Estimate

**Size:** Medium (1-2 weeks)

**Complexity:** Medium (file I/O, JSON handling, date calculations)

---

### Phase 4: Code Complexity Analysis (v2.2.0)

**Status:** 📋 **PLANNED**

**Objective:** Calculate cyclomatic and cognitive complexity to identify overly complex functions and files.

#### Key Features

- **Complexity Metrics:**
  - Cyclomatic complexity (McCabe)
  - Cognitive complexity (SonarSource methodology)
  - Nesting depth
  - Function length
  - Parameter count

- **AST Parsing:**
  - Tree-sitter for accurate parsing (preferred)
  - Language-specific parsers as fallback
  - Regex-based heuristics for unsupported languages

- **Reporting:**
  - Per-function complexity scores
  - Per-file aggregated metrics
  - Complexity thresholds and warnings
  - Hotspot identification

#### Implementation Plan

**New Files:**
```
src/
└── core/
    └── complexityAnalyzer.ts       # Complexity calculations
```

**New MCP Tools:**
- `get_complexity_report` - Get complexity analysis for project
- `get_function_complexity` - Get complexity for specific function
- `get_complexity_hotspots` - Identify most complex code areas

**New Types:**
- `ComplexityMetrics` - Complete complexity data
- `ComplexityThresholds` - Configurable thresholds
- `FunctionComplexity` - Per-function metrics
- `ComplexityReport` - Full complexity report

**Configuration:**
```json
{
  "complexity": {
    "enabled": false,  // Opt-in for performance
    "thresholds": {
      "cyclomatic": 10,
      "cognitive": 15,
      "nesting": 4,
      "functionLength": 50,
      "parameters": 5
    }
  }
}
```

#### Acceptance Criteria

- ✅ Cyclomatic complexity accurate
- ✅ Cognitive complexity implemented
- ✅ AST parsing works for major languages
- ✅ Opt-in configuration functional
- ✅ 3 new MCP tools functional
- ✅ Tests for complexity analyzer (min 80% coverage)
- ✅ Performance benchmarks acceptable
- ✅ README and ARCHITECTURE updated
- ✅ All existing tests still pass

#### Effort Estimate

**Size:** Large (2-4 weeks)

**Complexity:** High (AST parsing, multiple complexity algorithms, performance optimization)

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

**Last Updated:** 2026-02-07

