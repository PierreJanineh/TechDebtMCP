---
description: Analyze a single source file for technical debt and print a line-by-line breakdown of issues found.
argument-hint: "<absolute-file-path>"
allowed-tools: ["mcp__tech-debt-mcp__analyze_file"]
---

Analyze a single file for technical debt using the tech-debt-mcp analyzer.

## Steps

1. Resolve the file path from `$ARGUMENTS`.
   - The path must be absolute. If the user supplied a relative path, resolve it against the current working directory and confirm with the user before proceeding.

2. Call `mcp__tech-debt-mcp__analyze_file` with `{ "path": "<absolute-file-path>" }`.

3. Present the results:
   - File name, detected language, and total issue count.
   - A table of issues sorted by severity (critical first), including: line number, severity, category, title, and suggested fix.
   - Estimated remediation time for all issues combined.

4. If no issues are found, say so — do not invent issues.

## Notes

- Do not duplicate MCP tool logic — all analysis is performed by `analyze_file`.
- If no argument is provided, ask the user for the absolute path to the file they want to analyze.
