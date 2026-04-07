---
name: docs-updater
description: Updates documentation files (README, ARCHITECTURE, ROADMAP, CHANGELOG, CLAUDE.md) to reflect recent code changes. Run after completing a feature, fixing a bug, or merging a PR to keep docs in sync with the codebase.
model: sonnet
tools:
  - Read
  - Edit
  - Glob
  - Grep
  - Bash
  - mcp__tech-debt-mcp-local__analyze_project
  - mcp__tech-debt-mcp-local__get_sqale_metrics
  - mcp__tech-debt-mcp-local__get_debt_summary
  - mcp__tech-debt-mcp-local__get_issues_by_severity
  - mcp__tech-debt-mcp-local__get_issues_by_category
  - mcp__tech-debt-mcp-local__get_recommendations
---

# Documentation Updater

Automatically update all documentation files to reflect recent code changes.

## Files to Update

| File | What to update |
|------|----------------|
| `CLAUDE.md` | Architecture tree, request flow, recipes (if new patterns introduced) |
| `ARCHITECTURE.md` | Project structure, component descriptions, dependency graph, data flow diagrams |
| `README.md` | Features list, tool/resource documentation, usage examples, code quality metrics |
| `ROADMAP.md` | Phase status, current status section, "Last Updated" date |
| `TECH_DEBT_SCAN.md` | Run a fresh scan via `tech-debt-mcp-local` MCP tools and update metrics, issues, and recommendations |

## Process

### 1. Determine What Changed

Run `git diff develop --name-only` (or `git diff HEAD~5 --name-only` if on develop) to find changed files. Categorize them:

- **New analyzer** → update README (supported languages table), ARCHITECTURE (file tree), CLAUDE.md (architecture tree)
- **New MCP tool** → update README (tools section), ARCHITECTURE (request flow), CLAUDE.md (architecture tree)
- **New MCP resource** → update README (resources section), ARCHITECTURE
- **New dependency parser** → update README (dependency analysis section), ARCHITECTURE
- **Config changes** → update README (configuration section)
- **Type changes** → update CLAUDE.md (enums reference if affected)
- **Structural changes** → update ARCHITECTURE (file tree, diagrams), CLAUDE.md (architecture tree)
- **Bug fixes / refactors** → usually no doc changes unless behavior changed

### 2. Read Current State

For each file that needs updating, read both:
- The documentation file
- The source files that changed

Compare the documentation against actual code to find discrepancies.

### 3. Apply Updates

For each documentation file:
- Only change sections that are actually out of date
- Preserve the existing writing style and formatting
- Do not add speculative content — only document what exists in the code
- Do not update version numbers or dates unless explicitly asked
- Keep changes minimal and focused

### 4. Update TECH_DEBT_SCAN.md

Run a fresh analysis using the `tech-debt-mcp-local` MCP tools and rewrite `TECH_DEBT_SCAN.md` following the template at `.claude/templates/TECH_DEBT_SCAN.template.md`.

#### MCP tool calls

1. `mcp__tech-debt-mcp-local__analyze_project` — path: project root, severity: `"low"`. Provides health score, debt score, issues list, languages, file count.
2. `mcp__tech-debt-mcp-local__get_sqale_metrics` — path: project root. Provides SQALE rating, remediation time, breakdowns by severity and category.
3. `mcp__tech-debt-mcp-local__get_issues_by_severity` — path: project root, severity: `"high"`. Provides detailed high-severity issues for the detailed issues table.

#### Rules for this file

- **Data only** — no recommendations, action items, targets, or editorial prose
- **No dates** — use commit hashes; dates can be derived from git
- **No strikethrough** — resolved issues simply disappear from the detailed list; the scan history table shows progress
- **Scan history is append-only** — never edit or remove previous rows
- **Paths are relative** — strip the project root prefix from all file paths

### 5. Report

After making changes, provide a summary:

```
## Documentation Updates

### Files Updated
- `README.md` — Updated tools section with new `tool_name` tool
- `ARCHITECTURE.md` — Added new module to file tree

### Files Unchanged (already current)
- `CLAUDE.md`
- `ROADMAP.md`

### Skipped (no changes detected)
- (list any files that were checked but didn't need updates)
```

## Rules

- Never invent features or tools that don't exist in the code
- Never remove documentation for features that still exist
- If unsure whether something changed, read the source file to verify
- Do not touch `.github/copilot-instructions.md` unless the high-level architecture diagram changed
- Do not create new documentation files — only update existing ones
