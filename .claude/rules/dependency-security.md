---
description: How dependency CVEs (npm audit + Dependabot) are triaged, when a dev-only CVE may be ignored, and the current reconciled triage
paths:
  - "package.json"
  - "package-lock.json"
  - ".github/dependabot.yml"
  - "SECURITY.md"
---

# Dependency Security & Dev-Only-CVE Policy

This is the standing policy for triaging dependency vulnerabilities, plus the
current reconciled triage. It exists because `npm audit` and GitHub Dependabot
**disagree**, and the disagreement is easy to misread as "the alerts are noise."

Origin: TEC-76 / [#248](https://github.com/PierreJanineh/TechDebtMCP/issues/248).

## Why the two scanners disagree

Both are consulted; they measure different things:

| | `npm audit` | Dependabot Security tab |
|---|---|---|
| Reads | the resolved tree (`node_modules`, or `package-lock.json` with `--package-lock-only`) | the **committed `package-lock.json`** on the default branch |
| Advisory source | npm registry advisory DB (lags) | GitHub Advisory DB (fresher) |
| Counting | lists **every package in the vulnerable path** — parent + child | keys each alert to the **single vulnerable package** |
| Scope split | `--omit=dev` for prod-only | `dependency.scope: runtime | development` per alert |

Two consequences that repeatedly cause confusion:

1. **`npm audit` inflates counts.** One `tmp` CVE surfaces as ~5 audit rows
   (`tmp` + `external-editor` + `@inquirer/editor` + `@inquirer/prompts` +
   `@anthropic-ai/mcpb`) because each hop in the path is listed. Dependabot
   raises **one** `tmp` alert. When reconciling, collapse audit rows to their
   root vulnerable package before comparing.

2. **A stale lockfile makes Dependabot look worse than reality.** If the
   committed lockfile pins older-but-in-range transitives than a fresh
   `npm install` would resolve, Dependabot flags the old pins while local
   `npm audit` (reading a freshened tree) looks clean. **The fix is almost
   never "ignore" — it is to refresh the lockfile** (`npm update <pkgs>`), which
   pins the patched in-range versions and clears the alerts for real.
   > ⚠️ This repo's local dev machines may carry an untracked `.npmrc` with
   > `package-lock=false`, so a plain `npm install` updates `node_modules` but
   > **not** the lockfile. Use `npm update <pkgs> --package-lock=true` (or
   > `npm install --package-lock-only`) to actually persist the refresh, then
   > confirm `git diff package-lock.json` is non-empty.

## Triage decision tree (per alert)

For every alert, record **prod-vs-dev**, **fix availability**, and a **decision**:

1. **Is a patched version reachable within our declared semver ranges?**
   → **Upgrade.** Prefer a lockfile refresh (`npm update`) for transitives; bump
   `package.json` for direct deps. This is the default and covers most alerts.

2. **Is the only fix a MAJOR bump behind a dependency we don't control?**
   (e.g. a transitive whose parent pins the old major)
   - If the package is a **direct** dep → bump it (schedule the churn).
   - If it's a **transitive** whose parent blocks the fix, apply the
     reachability test below.

3. **Reachability test — may we ignore/accept?** A CVE may be **ignored** (in
   `.github/dependabot.yml`) or **accepted** only if **all** hold:
   - It is **dev-only** — not in the published package (`files` in `package.json`)
     and not loaded at runtime. The server uses `StdioServerTransport` **only**;
     anything reachable exclusively through the unused HTTP/`serve-static` path
     counts as unreachable. Record *why* it's unreachable.
   - There is **no in-range fix** (only a blocked major, or `fix:none`).
   - You add a `dependabot.yml` `ignore` entry **on the root vulnerable package**
     (not its path-echo parents) with a comment naming the GHSA(s) and the
     unreachability rationale, and set the `versions` range to the **current**
     advisory range so later CVEs on the same package stay covered.

   A production-reachable CVE with no fix is **never** silently ignored — force a
   patched version via `overrides` (see below) or escalate.

4. **Transitive prod CVE, patch out of the parent's range?** Use an npm
   [`overrides`](https://docs.npmjs.com/cli/configuring-npm/package-json#overrides)
   entry pinning the patched version, with a rationale comment. Justify safety by
   **reachability**, not by hope: prove the code path is never loaded, then
   confirm `npm run build` + `npm test` pass against the override.

## Regression guard

- **`npm audit --omit=dev` must stay at 0.** Any production alert is triaged as
  upgrade or override — never ignore.
- `.github/dependabot.yml`'s ignore list and the decisions in the triage table
  below must agree. When one changes, change the other in the same PR.

## Current triage (reconciled 2026-07-24, TEC-76)

Snapshot: Dependabot **16 open alerts** → **3** after the lockfile refresh; local
`npm audit` **8** (all dev-only) / `--omit=dev` **0**.

### Fixed

| Package | Scope | Advisory | Fix applied |
|---|---|---|---|
| `@hono/node-server` | runtime | GHSA-frvp-7c67-39w9 (`<2.0.5`) | **`overrides` → `^2.0.5`** (resolves 2.0.11). Transitive via `@modelcontextprotocol/sdk`, which pins `^1.19.9`; the vulnerable `serve-static` path is never loaded (stdio-only), so the major override is safe. |
| `hono` | runtime | GHSA-88fw-hqm2-52qc + 7 others (`<4.12.25`/`<4.12.27`) | **Lockfile refresh** 4.12.22 → 4.12.31 (in-range). |
| `body-parser` | runtime | GHSA-v422-hmwv-36x6 (`<2.3.0`) | **Lockfile refresh** 2.2.2 → 2.3.0 (in-range). |
| `brace-expansion` | runtime | GHSA-3jxr-9vmj-r5cp (`<5.0.7`) | **Lockfile refresh** 5.0.6 → 5.0.8 (in-range). Reachable via `glob`→`minimatch`, so this is a genuine prod fix. |
| `js-yaml` | dev | GHSA-h67p-54hq-rp68 (`<3.15.0`) | **Lockfile refresh** 3.14.2 → 3.15.0 (in-range). |
| `@babel/core` | dev | GHSA-4x5r-pxfx-6jf8 (`<=7.29.0`) | **Lockfile refresh** 7.29.0 → 7.29.7 (in-range). |

### Ignored (dev-only, no in-range fix — see `.github/dependabot.yml`)

| Package | Scope | Advisory | Rationale |
|---|---|---|---|
| `vite` | dev | GHSA-67mh-4wv8-2f99, GHSA-v6wh-96g9-6wx3, GHSA-fx2h-pf6j-xcff (`<=6.4.2`) | Docs build tool via `vitepress`. Fix is `>=6.4.3`; unreachable while `vitepress` 1.x pins `vite ^5`. Not shipped, not run at runtime. |
| `esbuild` | dev | GHSA-67mh-4wv8-2f99 (`<=0.24.2`) | Transitive under `vite` (same docs toolchain). Same rationale. |
| `tmp` | dev | GHSA-52f5-9888-hmc6, GHSA-ph9p-34f9-6g65 (`<0.2.6`) | Via the `@anthropic-ai/mcpb` bundler chain (`@inquirer/*` → `external-editor` → `tmp`). Only runs locally to build release artifacts; fix is a major bump behind mcpb's toolchain. |

### Not separately actionable (npm-audit path echoes)

`vitepress`, `external-editor`, `@inquirer/editor`, `@inquirer/prompts`, and
`@anthropic-ai/mcpb` show up in `npm audit` only as **parents** of the `vite`/`tmp`
advisories above. They are not independent Dependabot alerts and need no separate
`ignore` entry — ignoring the root package (`vite`/`tmp`) is what clears them.

## Re-running this triage

```bash
# Local view (reads node_modules / lockfile):
npm audit            # full
npm audit --omit=dev # production regression guard — must be 0

# Authoritative Dependabot view (needs a token with security_events read):
gh api repos/PierreJanineh/TechDebtMCP/dependabot/alerts --paginate \
  -q '.[] | select(.state=="open") |
      "\(.security_vulnerability.severity)\t\(.dependency.package.name)\t\(.dependency.scope)\t\(.security_vulnerability.vulnerable_version_range)"'
```

When comparing an alert's `vulnerable_version_range` with `semver`, note GitHub
writes the AND-separator as `", "` (comma), which `semver.satisfies` mis-parses —
replace `", "` with a space first, or the check silently reports false "patched".
