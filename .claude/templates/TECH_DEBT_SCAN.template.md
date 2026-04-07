# Tech Debt Scan

**Tool:** Tech Debt MCP v{version from package.json}
**Configuration:** `.techdebtrc.json` (test files excluded)

## Current Metrics

| Metric | Value |
|--------|-------|
| SQALE Rating | {rating} |
| Health Score | {healthScore}/100 |
| Debt Score | {debtScore}/100 |
| Total Issues | {totalIssues} |
| Remediation Time | {formattedTime} |

## Issues Breakdown

### By Severity

| Severity | Count | Remediation |
|----------|-------|-------------|
| 🔴 Critical | {count} | {time} |
| 🟠 High | {count} | {time} |
| 🟡 Medium | {count} | {time} |
| 🟢 Low | {count} | {time} |

### By Category

| Category | Count | Remediation |
|----------|-------|-------------|
| {category} | {count} | {time} |

## Detailed Issues

### 🟠 High ({count})

| File | Line | Rule | Title | Effort |
|------|------|------|-------|--------|
| {relative path} | {line} | {rule} | {title} | {effort} |

### 🟡 Medium ({count})

| File | Line | Rule | Title | Effort |
|------|------|------|-------|--------|
| {relative path} | {line} | {rule} | {title} | {effort} |

### 🟢 Low ({count})

For low-severity issues, list the first 10 rows then summarize the rest:

| File | Line | Rule | Title | Effort |
|------|------|------|-------|--------|
| {relative path} | {line} | {rule} | {title} | {effort} |
| ... | | | *({remaining} more — mostly {dominant rule} in {dominant area})* | |

## Scan History

Append-only table. Add a new row for each scan. Never modify or remove previous rows. Do not add a row if the commit hash matches the last row (no code changed).
Use `git log -1 --format="%h"` to get the current short commit hash.

| Commit | Health | Issues | High | Med | Low | Remediation | Notes |
|--------|--------|--------|------|-----|-----|-------------|-------|

## Files Analyzed

- **Total Files:** {count}
- **Languages:** {list}
- **Package Managers:** {list}
