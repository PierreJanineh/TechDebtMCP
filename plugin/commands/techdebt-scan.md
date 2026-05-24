---
description: Scan a project directory for technical debt across all supported languages and print a prioritized summary of findings.
argument-hint: "[project-path]"
allowed-tools: ["mcp__tech-debt-mcp__analyze_project", "mcp__tech-debt-mcp__get_sqale_metrics"]
---

Scan the project for technical debt using the tech-debt-mcp analyzer.

## Steps

1. Resolve the project path:
   - If the user supplied a path argument (`$ARGUMENTS`), use it as-is (it must be an absolute path).
   - Otherwise, use the current working directory.

2. Call `mcp__tech-debt-mcp__analyze_project` with `{ "path": "<resolved-path>" }`.

3. Call `mcp__tech-debt-mcp__get_sqale_metrics` with `{ "path": "<resolved-path>" }`.

4. Present a concise summary:
   - Health score (from `mcp__tech-debt-mcp__analyze_project`) and SQALE rating (from `mcp__tech-debt-mcp__get_sqale_metrics`).
   - Total issue count broken down by severity (critical / high / medium / low).
   - Estimated total remediation time.
   - Top 5 issues ranked by severity from the `mcp__tech-debt-mcp__analyze_project` results, including file, line, and a one-line fix hint.

5. Offer to dive deeper into any specific file, category, or severity if the user wants more detail.

## Notes

- Do not duplicate MCP tool logic — all analysis is performed by the tools above.
- If the path is not an absolute path, tell the user and ask for the absolute path before proceeding.
