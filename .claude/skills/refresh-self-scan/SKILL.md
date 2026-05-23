---
name: refresh-self-scan
description: Run tech-debt-mcp-local against this repo, refresh TECH_DEBT_SCAN.md, and propagate Health / Debt Score / Issues / Remediation to README.md, ARCHITECTURE.md, CONTRIBUTING.md in a single commit.
disable-model-invocation: true
---

# Refresh Self-Scan

`CLAUDE.md` declares `TECH_DEBT_SCAN.md` as the canonical source of truth for the four self-scan metrics. Three derivative documents (`README.md` Self-Scan Results, `ARCHITECTURE.md` Current Status, `CONTRIBUTING.md` Configuration Impact) must agree with it and must be updated **in the same commit**. This skill performs that synchronization end-to-end.

## When to run

After any of:
- A code change that could plausibly move the metrics (new analyzer, new rule, custom-rules engine change).
- A `.techdebtrc.json` change.
- An MCPB / plugin release where the README is publicly visible.

Do **not** run as part of routine bug fixes or docs-only PRs — the rule in `.claude/rules/docs-maintenance.md` only requires a refresh when the numbers actually move.

## Procedure

### 1. Run the scan

Use the locally installed dogfood MCP (`tech-debt-mcp-local`), not the published package — the published version may lag behind `src/`.

```
mcp__tech-debt-mcp-local__analyze_project { path: "<repo-root>" }
mcp__tech-debt-mcp-local__get_sqale_metrics { path: "<repo-root>" }
```

Capture: **Health Score**, **Debt Score**, **Total Issues**, **Remediation Time** (and SQALE rating if it changed).

### 2. Compare against `TECH_DEBT_SCAN.md`

Read `TECH_DEBT_SCAN.md`. If any of the four metrics moved by more than the noise threshold (≥0.1 health/debt point, ≥1 issue, ≥5 min remediation), continue. Otherwise stop and report "no change."

### 3. Update `TECH_DEBT_SCAN.md` first

`TECH_DEBT_SCAN.md` is the canonical source — edit it before any derivative file so a partial commit can never produce divergence. Update:
- The four metric values
- "Last Updated" timestamp (ISO date)
- Any top-issue or category-breakdown sections that depend on the scan

### 4. Propagate to the three derivative files

In the **same commit**, update:

| File | Block to touch |
|------|----------------|
| `README.md` | "Self-Scan Results" block |
| `ARCHITECTURE.md` | "Current Status" block |
| `CONTRIBUTING.md` | "Configuration Impact" block |

Grep each file for the old metric values to find the exact lines — do not rely on positional offsets, the surrounding prose changes.

### 5. Verify consistency

Before staging, grep for each metric value across the four files. The same number should appear in all four (or in `TECH_DEBT_SCAN.md` only, if the derivative file phrases it differently — note that exception in the commit message).

### 6. Commit

Conventional commit form, single commit:

```
docs: refresh self-scan metrics (health <X>, debt <Y>, issues <N>)
```

Include the four metric deltas in the body. Open a PR via the bot token per `.claude/rules/git-workflow.md` — never push directly to `develop` if `src/` was also touched in the parent PR.

## Failure modes

- **Scan returns an error**: stop, surface the error, do not edit any docs. A broken scan is a code bug to fix, not a docs problem.
- **Metrics diverge between `analyze_project` and `get_sqale_metrics`**: the SQALE engine uses different weighting; `TECH_DEBT_SCAN.md` records both, so capture both and report any unexpected gap.
- **README block missing**: the file may have been refactored. Stop and ask the user — don't invent placement.
