# TechDebtMCP — Phase 6, Bug #73, Phase 3, Phase 4 Design

**Date:** 2026-03-19
**Author:** Pierre Janineh + Claude
**Status:** Approved

## Overview

Three PRs delivering remaining roadmap phases plus docs cleanup:

1. **PR 1 (v2.0.1):** Phase 6 MCP Resources + Bug #73 doc fix + docs update
2. **PR 2 (v2.1.0):** Phase 3 Snapshot & Trend Tracking
3. **PR 3 (v2.2.0):** Phase 4 Complexity Metrics

Approach: batch quick wins first, then one PR per major phase.

---

## PR 1: Phase 6 + Bug #73 + Docs (v2.0.1)

### Phase 6: MCP Resources (#50, #51, #52)

**Goal:** Expose `debt://summary/{+projectPath}` and `debt://issues/{+projectPath}` as MCP resources for passive data access.

#### Files modified

| File | Change |
|------|--------|
| `src/server/resourceHandlers.ts` | New — registers resource templates via `McpServer.registerResource()` |
| `src/server/__tests__/resourceHandlers.test.ts` | New — 8 tests covering registration, reads, filters, limits, error paths |
| `src/index.ts` | Wires `attachResources()` into server startup |

No changes to `setup.ts` or `handlers.ts` — the SDK auto-registers `resources` capability on first `registerResource()` call.

#### Resource definitions

| URI Template | Name | Returns |
|---|---|---|
| `debt://summary/{+projectPath}` | Tech Debt Summary | `{ timestamp, healthScore, debtScore, totalIssues, bySeverity, byCategory, sqale }` |
| `debt://issues/{+projectPath}` | Tech Debt Issues | `{ timestamp, totalCount, issues[] }` |

RFC 6570 `{+projectPath}` reserved expansion allows slashes in path variables.

#### Query parameters (issues resource)

- `severity` — Filter by severity level
- `category` — Filter by category
- `limit` — Max issues to return (default: 100, validated as finite positive integer)

#### Implementation

1. `resourceHandlers.ts`: `attachResources(mcpServer)` registers both resource templates
2. Uses `McpServer.registerResource()` high-level API (not low-level schema handlers)
3. `ResourceTemplate` constructed with `{ list: undefined }` (required by SDK types, marks as non-enumerable)
4. Each callback:
   - Extracts `projectPath` from SDK-provided `variables`
   - Runs `AnalysisEngine.analyzeProject({ path: projectPath })`
   - Returns JSON response with `application/json` mime type
   - Catches errors and returns `{ error: message }` JSON
5. Issues resource parses `uri.searchParams` for filtering/limiting

### Bug #73: Custom Rule Suppression (#73)

**Resolution:** Documentation-only. Close with comment explaining:

1. Custom rules (`customPatterns` in `.techdebtrc.json`) are for adding new pattern checks, not suppressing existing analyzer warnings
2. To suppress false positives: use `ignore` glob array to exclude files, or `severity` overrides to downgrade rules
3. The reported regex `@ObservedObject\s*\(.*\)\s*var` doesn't match Swift syntax — `@ObservedObject private var` has no parentheses after the attribute

No code changes required.

### Docs Update

#### ROADMAP.md

- Mark v2.0.0 as released (remove "pending PR merge")
- Update "Current Status" section: latest release = v2.0.0, next phase = v2.1.0
- Update "Last Updated" date to 2026-03-19

#### CLAUDE.md

Add missing useful content from copilot-instructions.md to make it the single source of truth:

- `isDev` convention for dependency parsers
- `checkPattern()` usage example
- Severity/effort/category enum values
- Adding a new dependency parser recipe
- No duplication of existing content

#### copilot-instructions.md

Trim from ~716 to ~200 lines:

- Keep: project overview, architecture diagram, Copilot-specific PR review sections
- Replace: all duplicated conventions/workflows with "See CLAUDE.md for coding standards, conventions, and recipes"
- Remove: verbose test failure protocol, documentation checklists, example workflows

---

## PR 2: Phase 3 — Snapshot & Trend Tracking (v2.1.0)

### Goal

Enable baseline snapshots and historical trend analysis to track technical debt over time.

### New files

| File | Purpose |
|------|---------|
| `src/core/snapshotManager.ts` | Save, load, compare, trend calculation, prune |
| `src/core/__tests__/snapshotManager.test.ts` | Unit tests with mocked file system |
| `src/server/snapshotHandlers.ts` | MCP tool handlers (keeps handlers.ts under 500 lines) |

### Modified files

| File | Change |
|------|--------|
| `src/types/index.ts` | Add `AnalysisSnapshot`, `SnapshotComparison`, `TrendData` |
| `src/server/tools.ts` | Add 5 tool definitions |
| `src/server/handlers.ts` | Add 5 cases dispatching to `snapshotHandlers.ts` |

### New types (`src/types/index.ts`)

```typescript
interface AnalysisSnapshot {
  id: string;
  timestamp: string;
  projectPath: string;
  summary: DebtSummary;
  sqale?: SQALEMetrics;
  issueCount: number;
  issuesByRule: Record<string, number>;
}

interface SnapshotComparison {
  baseline: AnalysisSnapshot;
  current: AnalysisSnapshot;
  debtScoreDelta: number;
  healthScoreDelta: number;
  issueCountDelta: number;
  byCategoryDelta: Record<string, number>;
  bySeverityDelta: Record<string, number>;
}

interface TrendData {
  snapshots: AnalysisSnapshot[];
  period: { start: string; end: string };
  trend: 'improving' | 'stable' | 'degrading';
  averageDebtScore: number;
  debtScoreTrend: number; // slope
}
```

### MCP tools

| Tool | Params | Description |
|------|--------|-------------|
| `save_baseline` | `path`, `name?` | Run analysis, save to `.techdebt/snapshots/baseline.json` (or named snapshot) |
| `compare_with_baseline` | `path` | Run analysis, diff against saved baseline |
| `get_trend` | `path`, `limit?` (default 10) | Load snapshots, calculate trajectory |
| `list_snapshots` | `path` | List saved snapshots with metadata |
| `delete_snapshot` | `path`, `id` | Remove a snapshot by ID |

### Storage

```
.techdebt/
├── .gitignore          # Contains "*" — auto-created by save_baseline
└── snapshots/
    ├── baseline.json
    ├── 2026-03-19T10-30-00.json
    └── 2026-03-18T15-45-00.json
```

Snapshots store summary counts only (not full issue objects) for space efficiency.

### Trend calculation

Compare first and last snapshot health scores over the requested window:
- Change > +5%: `improving`
- Change < -5%: `degrading`
- Otherwise: `stable`

### SnapshotManager API

```typescript
class SnapshotManager {
  constructor(projectPath: string);
  async saveSnapshot(report: TechDebtReport, name?: string): Promise<AnalysisSnapshot>;
  async saveBaseline(report: TechDebtReport): Promise<AnalysisSnapshot>;
  async loadBaseline(): Promise<AnalysisSnapshot | null>;
  async loadSnapshots(): Promise<AnalysisSnapshot[]>;
  compare(baseline: AnalysisSnapshot, current: TechDebtReport): SnapshotComparison;
  calculateTrend(snapshots: AnalysisSnapshot[]): TrendData;
  async pruneSnapshots(keepCount: number): Promise<number>;
  async deleteSnapshot(id: string): Promise<boolean>;
}
```

---

## PR 3: Phase 4 — Complexity Metrics (v2.2.0)

### Goal

Calculate cyclomatic and cognitive complexity to identify overly complex functions across all 14 languages.

### Approach

**Regex-based, no tree-sitter.** Tree-sitter is a heavy native dependency for an MCP server distributed via `npx`. Regex-based function extraction is sufficient for hotspot identification and keeps the package lightweight.

### New files

| File | Purpose |
|------|---------|
| `src/core/complexityAnalyzer.ts` | Function extraction, cyclomatic + cognitive calculation |
| `src/core/__tests__/complexityAnalyzer.test.ts` | Unit tests per language family |

### Modified files

| File | Change |
|------|--------|
| `src/types/index.ts` | Add `FunctionComplexity`, `FileComplexity`, `ComplexityReport`, `ComplexityThresholds` |
| `src/server/tools.ts` | Add `get_complexity_report` tool definition |
| `src/server/handlers.ts` | Add 1 case |
| `src/analyzers/baseAnalyzer.ts` | Integrate complexity into `calculateMetrics()` |

### New types (`src/types/index.ts`)

```typescript
interface FunctionComplexity {
  name: string;
  startLine: number;
  endLine: number;
  cyclomaticComplexity: number;
  cognitiveComplexity: number;
  lineCount: number;
  parameterCount: number;
}

interface FileComplexity {
  file: string;
  language: SupportedLanguage;
  functions: FunctionComplexity[];
  averageCyclomaticComplexity: number;
  maxCyclomaticComplexity: number;
  averageCognitiveComplexity: number;
  maxCognitiveComplexity: number;
  totalFunctions: number;
}

interface ComplexityReport {
  timestamp: string;
  projectPath: string;
  files: FileComplexity[];
  summary: {
    totalFiles: number;
    totalFunctions: number;
    averageCyclomaticComplexity: number;
    averageCognitiveComplexity: number;
    highComplexityFunctions: number;
    hotspots: FunctionComplexity[];
  };
}

interface ComplexityThresholds {
  cyclomaticWarning: number;   // default: 10
  cyclomaticError: number;     // default: 20
  cognitiveWarning: number;    // default: 15
  cognitiveError: number;      // default: 25
}
```

### Complexity algorithms

**Cyclomatic (McCabe):** Base 1 + count of decision points per function.

| Language Family | Decision Keywords |
|---|---|
| C-style (JS, TS, Java, C#, C, C++, Go, Rust, PHP) | `if`, `else if`, `for`, `while`, `switch`, `case`, `catch`, `&&`, `\|\|`, `?:` |
| Python | `if`, `elif`, `for`, `while`, `except`, `and`, `or` |
| Ruby | `if`, `elsif`, `unless`, `case`, `when`, `while`, `until`, `rescue`, `&&`, `\|\|` |
| Swift | `if`, `guard`, `for`, `while`, `switch`, `case`, `catch`, `&&`, `\|\|` |
| Kotlin | `if`, `when`, `for`, `while`, `catch`, `&&`, `\|\|` |

**Cognitive (SonarQube-style):** Increment for:
- Each nesting level adds +1 per nested control structure
- Breaks in linear flow (`break`, `continue`)
- Boolean operators in conditions
- Recursion detection (function calls own name)

### Function extraction

Regex patterns per language family:
- **C-style:** `function name(`, `name(` as method, `=> {`, `func name(`
- **Python:** `def name(`
- **Ruby:** `def name` ... `end`
- **Swift/Kotlin:** `func name(` / `fun name(`

### MCP tool

| Tool | Params | Description |
|------|--------|-------------|
| `get_complexity_report` | `path`, `threshold?` (default 10), `limit?` (default 20) | Summary stats, health breakdown, hotspots ranked by complexity |

### BaseAnalyzer integration

In `calculateMetrics()`, run `ComplexityAnalyzer.analyzeFile()` and populate the existing optional `complexity` and `functions` fields in `FileMetrics`. When `maxCyclomaticComplexity > config.rules.maxComplexity` (default 10), generate a `maintainability` severity `high` issue.

### ComplexityAnalyzer API

```typescript
class ComplexityAnalyzer {
  analyzeFile(filePath: string, content: string, language: SupportedLanguage): FileComplexity;
  private extractFunctions(content: string, language: SupportedLanguage): ExtractedFunction[];
  private calculateCyclomatic(code: string, language: SupportedLanguage): number;
  private calculateCognitive(code: string, language: SupportedLanguage): number;
}
```

---

## Execution Order

1. **PR 1 (v2.0.1):** Phase 6 + #73 + docs → branch `feature/issue-50-mcp-resources`
2. **PR 2 (v2.1.0):** Phase 3 → branch `feature/issue-39-trend-tracking`
3. **PR 3 (v2.2.0):** Phase 4 → branch `feature/issue-45-complexity-metrics`

Each PR: branch from `develop`, target `develop`, run `npm test && npm run build` before merge.
