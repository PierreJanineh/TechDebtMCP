# Tech Debt Scan

**Tool:** Tech Debt MCP v2.0.1
**Configuration:** `.techdebtrc.json` (test files excluded)

## Current Metrics

| Metric | Value |
|--------|-------|
| SQALE Rating | A |
| Health Score | 80.6/100 |
| Debt Score | 19.4/100 |
| Total Issues | 55 |
| Remediation Time | 2d 5h 15m |

## Issues Breakdown

### By Severity

| Severity | Count | Remediation |
|----------|-------|-------------|
| 🔴 Critical | 0 | 0m |
| 🟠 High | 1 | 2h |
| 🟡 Medium | 18 | 34h 30m |
| 🟢 Low | 36 | 16h 45m |

### By Category

| Category | Count | Remediation |
|----------|-------|-------------|
| Code Quality | 37 | 17h 15m |
| Maintainability | 18 | 36h |

## Detailed Issues

### 🟠 High (1)

| File | Line | Rule | Title | Effort |
|------|------|------|-------|--------|
| `src/analyzers/csharpAnalyzer.ts` | 360 | `nesting-depth` | Deep nesting detected | medium |

### 🟡 Medium (18)

| File | Line | Rule | Title | Effort |
|------|------|------|-------|--------|
| `jest.config.js` | 12 | `nesting-depth` | Deep nesting detected | medium |
| `src/server/handlers.ts` | 265 | `nesting-depth` | Deep nesting detected | medium |
| `src/server/dependencyHandlers.ts` | 220 | `nesting-depth` | Deep nesting detected | medium |
| `src/core/analysisEngine.ts` | 257 | `nesting-depth` | Deep nesting detected | medium |
| `src/analyzers/typescriptAnalyzer.ts` | 145 | `nesting-depth` | Deep nesting detected | medium |
| `src/analyzers/swiftUiChecksPhase2.ts` | 33 | `nesting-depth` | Deep nesting detected | medium |
| `src/analyzers/swiftUiChecks.ts` | 132 | `nesting-depth` | Deep nesting detected | medium |
| `src/analyzers/swiftAnalyzer.ts` | 188 | `nesting-depth` | Deep nesting detected | medium |
| `src/analyzers/swiftAnalyzer.ts` | 174 | `non-null-assertion` | Non-null assertion operator used | small |
| `src/analyzers/pythonAnalyzer.ts` | 141 | `nesting-depth` | Deep nesting detected | medium |
| `src/analyzers/objectivecAnalyzer.ts` | 132 | `nesting-depth` | Deep nesting detected | medium |
| `src/analyzers/javascriptAnalyzer.ts` | 111 | `nesting-depth` | Deep nesting detected | medium |
| `src/analyzers/javaAnalyzer.ts` | 148 | `nesting-depth` | Deep nesting detected | medium |
| `src/analyzers/cppAnalyzer.ts` | 221 | `nesting-depth` | Deep nesting detected | medium |
| `src/analyzers/cAnalyzer.ts` | 119 | `nesting-depth` | Deep nesting detected | medium |
| `src/analyzers/baseAnalyzer.ts` | 203 | `nesting-depth` | Deep nesting detected | medium |
| `src/analyzers/dependencies/pipParser.ts` | 84 | `nesting-depth` | Deep nesting detected | medium |
| `src/analyzers/dependencies/cppParser.ts` | 134 | `nesting-depth` | Deep nesting detected | medium |

### 🟢 Low (36)

| File | Line | Rule | Title | Effort |
|------|------|------|-------|--------|
| `src/index.ts` | 15 | `console-log` | Console statement found | trivial |
| `src/utils/fileUtils.ts` | 73 | `type-assertion` | Type assertion used | small |
| `src/types/index.ts` | 277 | `type-assertion` | Type assertion used | small |
| `src/server/tools.ts` | — | `line-length` | Multiple long lines detected | small |
| `src/server/tools.ts` | 199 | `type-assertion` | Type assertion used | small |
| `src/server/setup.ts` | 30 | `console-log` | Console statement found | trivial |
| `src/server/setup.ts` | 60 | `console-log` | Console statement found | trivial |
| `src/server/resourceHandlers.ts` | 5 | `type-assertion` | Type assertion used | small |
| `src/server/resourceHandlers.ts` | 6 | `type-assertion` | Type assertion used | small |
| `src/server/inputParser.ts` | 98 | `type-assertion` | Type assertion used | small |
| ... | | | *(26 more — mostly `type-assertion` in `src/server/inputParser.ts` and dependency parsers)* | |

## Scan History

| Commit | Health | Issues | High | Med | Low | Remediation | Notes |
|--------|--------|--------|------|-----|-----|-------------|-------|
| `210c50a` | 42.4 | 118 | 12 | 49 | 57 | ~96h | Baseline — before ruleExclusions, nesting refactors |
| `0b3db51` | 80.6 | 55 | 1 | 18 | 36 | 2d 5h 15m | Post PR #113, #118, #119, #122; ruleExclusions applied |

## Files Analyzed

- **Total Files:** 47
- **Languages:** TypeScript, JavaScript
- **Package Managers:** npm
