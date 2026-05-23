---
name: proactive-analysis
description: Automatically run a tech-debt scan before opening a pull request, after large refactors, or when the user asks for a code review — surface actionable findings without being asked.
---

# Proactive Tech-Debt Analysis

This skill teaches Claude when to invoke the tech-debt-mcp analyzer automatically, without the user having to type a command.

## When to run proactively

Trigger a tech-debt scan automatically in any of these situations:

| Trigger | Action |
|---------|--------|
| User asks to **open a PR** or **push a branch** | Scan the project root before creating the PR. Summarize findings in the PR description or as a pre-PR comment. |
| User asks to **review my code** or **what's wrong with this file** | Run `mcp__tech-debt-mcp__analyze_file` on the mentioned file. Weave the findings into the code review. |
| User **finishes a large refactor** (renamed module, restructured directory) | Scan the affected directory and report any new or resolved debt items. |
| User asks **is my code ready to merge** | Run `mcp__tech-debt-mcp__get_debt_summary` and `mcp__tech-debt-mcp__get_sqale_metrics`. If the health score is below 70 or there are any critical/high issues, surface them before approving merge-readiness. |
| User requests a **security audit** | Run `mcp__tech-debt-mcp__get_vulnerability_report` on the project root and fold the **offline dependency inventory** into the security report. Note: this tool does not perform CVE lookups — direct the user to cross-reference with OSV or Snyk for actual vulnerability data. |

## How to run

All analysis is delegated to MCP tools — no logic is duplicated here.

| Situation | Tool(s) to call |
|-----------|-----------------|
| Full project scan | `mcp__tech-debt-mcp__analyze_project` |
| Single file review | `mcp__tech-debt-mcp__analyze_file` |
| Aggregate health check | `mcp__tech-debt-mcp__get_debt_summary` + `mcp__tech-debt-mcp__get_sqale_metrics` |
| Dependency inventory (offline) | `mcp__tech-debt-mcp__get_vulnerability_report` |

Always pass absolute paths to tool arguments. If you only have a relative path, resolve it against the workspace root before calling a tool.

## How to present findings

- **Before a PR**: include a short "Tech Debt Check" section in the PR description draft with health score, debt score, and any critical/high issues. For SQALE rating, call `mcp__tech-debt-mcp__get_sqale_metrics` in addition to `analyze_project`. Offer to fix blockers before the PR is opened.
- **During code review**: annotate relevant lines with the debt finding and a one-line fix suggestion. Do not flood the review — surface at most the top 5 issues ranked by severity × effort.
- **Merge-readiness check**: give a pass/fail verdict. Pass = health ≥ 70 and no critical or high issues. Fail = list the blockers.

## When NOT to run proactively

- On documentation-only changes (`.md`, comments).
- When the user has already run `/techdebt-scan` in the current session and nothing has changed.
- When the user has explicitly said "skip the debt check" or "I know about the debt".

## Skill vs command split

- **This skill** governs proactive, context-triggered invocations — Claude decides when to run.
- **`/techdebt-scan`, `/techdebt-file`, `/techdebt-summary`** are explicit slash commands the user invokes on demand.

Use the commands for on-demand requests; use this skill for background, event-driven checks.
