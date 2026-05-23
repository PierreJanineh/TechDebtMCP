# Aggregator submissions

Reference drafts describing how **Tech Debt MCP** should appear on community Claude Code marketplaces. The two big aggregators we've checked are **auto-discovery only** — there is no submission form or registry PR to file. Once `.claude-plugin/marketplace.json` exists on the default branch, the next crawl picks the marketplace up.

Tracked in-repo so the prepared copy (tagline, install commands, screenshots checklist) stays in lockstep with `plugin.json` / `marketplace.json` and can be reused if a manual submission flow ever appears.

| File | Target | Submission flow |
|------|--------|-----------------|
| `claudemarketplaces.md` | https://claudemarketplaces.com | **Auto-discovery.** Per [noobsaire/claudemarketplaces](https://github.com/noobsaire/claudemarketplaces) README: "The site automatically searches GitHub daily … no submission required." Verify on the site after the next crawl. |
| `buildwithclaude.md` | https://buildwithclaude.com | **Auto-discovery for third-party marketplaces.** [davepoon/buildwithclaude](https://github.com/davepoon/buildwithclaude) `CONTRIBUTING.md` accepts PRs that add individual components to *their own* marketplace; it has no flow for registering an external marketplace. Verify on the site after the next crawl. |
| `issue-177-dogfood-notes.md` | Comment template for GitHub issue [#177](https://github.com/PierreJanineh/TechDebtMCP/issues/177), used to record dogfood friction at the end of each release cycle | n/a |

**Maintainer action:** none right now. Re-check both sites a week after any release that changes `marketplace.json`; if a listing is missing or stale, open an issue against the relevant aggregator repo.
