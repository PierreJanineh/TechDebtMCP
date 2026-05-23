# Dogfood notes — template (release cycle ending v2.0.2 → v2.1.0)

> **This file is a template.** A maintainer copies it into a comment on issue #177 at the end of each release cycle, after filling in `#TBD` placeholders (the follow-up issue link in §6) and updating numbers in §5 from a fresh scan. The version below reflects the v2.0.2 → v2.1.0 cycle.

This is the per-acceptance-criterion writeup from TEC-37: install the plugin from this repo's own marketplace entry, use it for at least one workflow cycle, file findings, then move forward with claude-plugins-official submission.

## TL;DR

The plugin installs cleanly from `PierreJanineh/TechDebtMCP` and the three slash commands (`/techdebt-scan`, `/techdebt-file`, `/techdebt-summary`) work as advertised. Three real friction points surfaced during dogfooding — captured below and filed as a single follow-up issue (link in §6). None are blockers for external submission; all are quality-of-life issues a first-time user would hit.

## 1. Install friction

- `/plugin marketplace add PierreJanineh/TechDebtMCP` → fast, no surprises.
- `/plugin install tech-debt-mcp@techdebtmcp` → also clean.
- **First scan time:** the plugin's `mcpServers.command` resolves to `npx -y tech-debt-mcp@latest`, so the very first invocation downloads + extracts the npm package before doing anything. On a cold cache this added ~6–8s before any output. Not a blocker, but worth a one-line note in the readme so users don't think it's hung.

## 2. Command UX

- All three commands are discoverable via tab-completion after install.
- `/techdebt-summary` is the right "first call" — it gives the SQALE rating and category breakdown in one screen. Good entry point.
- `/techdebt-file <path>` works as expected. The slash command's own instructions tell Claude to demand an absolute path before invoking the MCP tool, so users never see the engine-level `ERR_INVALID_ARG_TYPE`. The raw error is still reachable via **direct programmatic use** of `AnalysisEngine.analyzeProject({path})` — not a user-facing issue, but worth a defensive check at the engine entry point.

## 3. Output gaps

- Scan output is dense; the JSON is comprehensive but the human-formatted output buries `top recommendations` below several hundred individual issues when the project has high custom-pattern hit counts. A `--top-n` or default truncation would help.
- No clear "what changed since last scan" — every run is a cold snapshot. Phase 3 (TEC-39…44) addresses this; flagging here so dogfood expectations match the roadmap.

## 4. Marketplace metadata gaps — **fixed in this PR**

- `.claude-plugin/plugin.json` is now version-locked to `package.json` via `src/server/__tests__/pluginManifest.test.ts` (was previously by-convention only).
- `.claude-plugin/marketplace.json` now carries the supported discovery fields: top-level `version`, plus per-plugin `displayName`, `version`, `repository`, `category`, and `tags`. The same test asserts the marketplace `version` + plugin-entry `version` track `package.json`. Schema lookup (https://code.claude.com/docs/en/plugin-marketplaces) confirmed `screenshots` and `changelogUrl` aren't part of the format — once those become supported, add them here too.

## 5. Self-scan drift

Running `analyzeProject` programmatically against this repo returns **165 issues** with health score **54.2** and debt score **45.8** — versus `TECH_DEBT_SCAN.md` claiming **13 issues / health 95 / debt 5**. The drift comes from two sources:

1. `scripts/**` (16 `console-log` hits) and `tests/fixtures/self-scan/**` (7 more) aren't in `.techdebtrc.json` `ignore` — they're intentional CLI/fixture noise being counted as debt.
2. The `prefer-nullish-coalescing` custom pattern fires 123 times against legitimate `||` defaults in the codebase — a signal-to-noise problem in the pattern itself, not the engine.

CLAUDE.md labels `TECH_DEBT_SCAN.md` as the canonical source of truth, so this drift needs a fix in the same release cycle.

## 6. Follow-up

Filed as GitHub issue **#TBD** (link before posting). Scope:
- Extend `.techdebtrc.json` `ignore` to cover `scripts/**` and `tests/fixtures/**`.
- Refine the `prefer-nullish-coalescing` regex to skip common safe-default patterns (or downgrade its severity / move it to an opt-in rules pack).
- Refresh `TECH_DEBT_SCAN.md` after the above, and update the three derivative blocks per `.claude/rules/docs-maintenance.md`. (Deliberately not refreshed in this PR — the numbers will move again once the config/pattern fixes land.)
- Add a friendlier error message when relative paths are passed to engine-level entry points.

## 7. Go / no-go for claude-plugins-official

**Go**, after the follow-up issue lands. Submission drafts for claudemarketplaces.com and buildwithclaude.com staged at `.github/aggregator-submissions/`.
