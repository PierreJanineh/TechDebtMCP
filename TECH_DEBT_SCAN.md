# Tech Debt Scan

**Tool:** Tech Debt MCP v2.0.2
**Configuration:** `.techdebtrc.json` (test files excluded)

## Current Metrics

| Metric | Value |
|--------|-------|
| SQALE Rating | A |
| Health Score | 95/100 |
| Debt Score | 5/100 |
| Total Issues | 13 |
| Remediation Time | 14h |

## Issues Breakdown

### By Severity

| Severity | Count | Remediation |
|----------|-------|-------------|
| 🔴 Critical | 0 | 0m |
| 🟠 High | 0 | 0m |
| 🟡 Medium | 6 | 10h 30m |
| 🟢 Low | 7 | 3h 30m |

### By Category

| Category | Count | Remediation |
|----------|-------|-------------|
| Code Quality | 8 | 4h |
| Maintainability | 5 | 10h |

## Detailed Issues

### 🟡 Medium (6)

| File | Line | Rule | Title | Effort |
|------|------|------|-------|--------|
| `eslint.config.mjs` | 25 | `nesting-depth` | Deep nesting detected (depth 5) | medium |
| `src/server/handlers.ts` | 273 | `nesting-depth` | Deep nesting detected (depth 5) | medium |
| `src/server/dependencyHandlers.ts` | 228 | `nesting-depth` | Deep nesting detected (depth 5) | medium |
| `src/core/customRulesEngine.ts` | 156 | `nesting-depth` | Deep nesting detected (depth 6) | medium |
| `src/core/analysisEngine.ts` | 257 | `nesting-depth` | Deep nesting detected (depth 5) | medium |
| `src/analyzers/swiftAnalyzer.ts` | 174 | `non-null-assertion` | Non-null assertion operator used | small |

### 🟢 Low (7)

| File | Line | Rule | Title | Effort |
|------|------|------|-------|--------|
| `src/utils/fileUtils.ts` | 73 | `type-assertion` | Type assertion used | small |
| `src/types/index.ts` | 277 | `type-assertion` | Type assertion used | small |
| `src/server/tools.ts` | 201 | `type-assertion` | Type assertion used | small |
| `src/server/resourceHandlers.ts` | 5 | `type-assertion` | Type assertion used | small |
| `src/server/resourceHandlers.ts` | 6 | `type-assertion` | Type assertion used | small |
| `src/server/configValidator.ts` | 145 | `type-assertion` | Type assertion used | small |
| `src/core/customRulesEngine.ts` | 123 | `type-assertion` | Type assertion used | small |

## Scan History

| Commit | Health | Issues | High | Med | Low | Remediation | Notes |
|--------|--------|--------|------|-----|-----|-------------|-------|
| `210c50a` | 42.4 | 118 | 12 | 49 | 57 | ~96h | Baseline — before ruleExclusions, nesting refactors |
| `8c4be30` | 95.6 | 12 | 0 | 5 | 7 | 12h | v2.0.2 release prep; 4 nesting hotspots + 7 type assertions + 1 non-null assertion |
| `e659739` | 95 | 13 | 0 | 6 | 7 | 14h | Post v2.0.2 merges (PR #167 TOCTOU + PR #168 ESLint/cheat sheet). New medium finding is `eslint.config.mjs:25` self-detection from the newly-added flat config (tseslint.config() call structure hits depth 5); `configValidator.ts` type-assertion shifted from line 8 → line 145 after the TOCTOU refactor |

## Files Analyzed

- **Total Files:** 49
- **Languages:** TypeScript, JavaScript
- **Package Managers:** npm
