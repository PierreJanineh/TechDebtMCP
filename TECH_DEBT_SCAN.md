# Tech Debt Scan

**Tool:** Tech Debt MCP v2.0.2
**Configuration:** `.techdebtrc.json` (test files excluded)

## Current Metrics

| Metric | Value |
|--------|-------|
| SQALE Rating | A |
| Health Score | 95.6/100 |
| Debt Score | 4.4/100 |
| Total Issues | 12 |
| Remediation Time | 12h |

## Issues Breakdown

### By Severity

| Severity | Count | Remediation |
|----------|-------|-------------|
| 🔴 Critical | 0 | 0m |
| 🟠 High | 0 | 0m |
| 🟡 Medium | 5 | 8h 30m |
| 🟢 Low | 7 | 3h 30m |

### By Category

| Category | Count | Remediation |
|----------|-------|-------------|
| Code Quality | 8 | 4h |
| Maintainability | 4 | 8h |

## Detailed Issues

### 🟡 Medium (5)

| File | Line | Rule | Title | Effort |
|------|------|------|-------|--------|
| `src/server/handlers.ts` | 273 | `nesting-depth` | Deep nesting detected | medium |
| `src/server/dependencyHandlers.ts` | 228 | `nesting-depth` | Deep nesting detected | medium |
| `src/core/customRulesEngine.ts` | 156 | `nesting-depth` | Deep nesting detected (depth 6) | medium |
| `src/core/analysisEngine.ts` | 257 | `nesting-depth` | Deep nesting detected | medium |
| `src/analyzers/swiftAnalyzer.ts` | 174 | `non-null-assertion` | Non-null assertion operator used | small |

### 🟢 Low (7)

| File | Line | Rule | Title | Effort |
|------|------|------|-------|--------|
| `src/utils/fileUtils.ts` | 73 | `type-assertion` | Type assertion used | small |
| `src/types/index.ts` | 277 | `type-assertion` | Type assertion used | small |
| `src/server/tools.ts` | 201 | `type-assertion` | Type assertion used | small |
| `src/server/resourceHandlers.ts` | 5 | `type-assertion` | Type assertion used | small |
| `src/server/resourceHandlers.ts` | 6 | `type-assertion` | Type assertion used | small |
| `src/server/configValidator.ts` | 8 | `type-assertion` | Type assertion used | small |
| `src/core/customRulesEngine.ts` | 123 | `type-assertion` | Type assertion used | small |

## Scan History

| Commit | Health | Issues | High | Med | Low | Remediation | Notes |
|--------|--------|--------|------|-----|-----|-------------|-------|
| `210c50a` | 42.4 | 118 | 12 | 49 | 57 | ~96h | Baseline — before ruleExclusions, nesting refactors |
| `8c4be30` | 95.6 | 12 | 0 | 5 | 7 | 12h | v2.0.2 release prep; remaining debt is 4 nesting hotspots + type assertions + one non-null assertion |

## Files Analyzed

- **Total Files:** 48
- **Languages:** TypeScript
- **Package Managers:** npm
