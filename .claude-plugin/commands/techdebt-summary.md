---
description: Print an aggregate debt summary (health score, SQALE rating, issue counts, remediation estimate) for a project without listing individual findings.
argument-hint: "[project-path]"
allowed-tools: ["mcp__tech-debt-mcp__get_debt_summary", "mcp__tech-debt-mcp__get_sqale_metrics"]
---

Fetch and display the aggregate technical-debt summary for a project.

## Steps

1. Resolve the project path:
   - If the user supplied a path argument (`$ARGUMENTS`), use it as-is (it must be an absolute path).
   - Otherwise, use the current working directory.

2. Call `mcp__tech-debt-mcp__get_debt_summary` with `{ "path": "<resolved-path>" }`.

3. Call `mcp__tech-debt-mcp__get_sqale_metrics` with `{ "path": "<resolved-path>" }`.

4. Present a concise dashboard:
   - **Health score** (0–100) and its grade, computed from the numeric score using this deterministic mapping: A (≥ 90), B (70–89), C (50–69), D (25–49), E (< 25). Do not guess — derive the grade directly from the number.
   - **SQALE rating** (A–E) and debt ratio (note: debt ratio is only calculated when the `developmentTime` parameter is provided; otherwise it will appear as N/A — prompt the user to supply it if they want a percentage).
   - **Issue counts** by severity: critical / high / medium / low.
   - **Total estimated remediation time**.

5. Suggest running `/techdebt-scan` for the full issue list or `/techdebt-file <path>` to drill into a specific file.

## Notes

- This command intentionally omits individual file-level findings — use `/techdebt-scan` for those.
- Do not duplicate MCP tool logic — all data is fetched by `mcp__tech-debt-mcp__get_debt_summary` and `mcp__tech-debt-mcp__get_sqale_metrics`.
- If the path is not absolute, ask the user for the absolute path before proceeding.
