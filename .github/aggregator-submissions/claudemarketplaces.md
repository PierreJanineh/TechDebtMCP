# claudemarketplaces.com — submission draft

**Site:** https://claudemarketplaces.com
**Submission method:** check the site's "Submit a plugin" / "Add marketplace" flow at submission time — it has historically been either a web form or a PR to a JSON registry. The fields below are what every aggregator we've seen has asked for.

## Marketplace entry

- **Marketplace name:** Tech Debt MCP
- **Marketplace owner:** PierreJanineh
- **Marketplace manifest URL:** `https://raw.githubusercontent.com/PierreJanineh/TechDebtMCP/main/.claude-plugin/marketplace.json`
- **Repository:** https://github.com/PierreJanineh/TechDebtMCP
- **Install command (for users):**
  ```
  /plugin marketplace add PierreJanineh/TechDebtMCP
  /plugin install tech-debt-mcp@techdebtmcp
  ```

## Plugin entry

- **Plugin name:** tech-debt-mcp
- **Display name:** Tech Debt MCP
- **Version:** tracks `package.json` (see `.claude-plugin/plugin.json`)
- **License:** MIT
- **Author:** Pierre Janineh
- **Homepage / docs:** https://pierrejanineh.github.io/TechDebtMCP/

## Short description (≤140 chars)

> Static technical-debt analysis across 14 languages — SQALE ratings, debt summaries, custom rules, dependency vulnerabilities — as MCP tools.

## Long description

Tech Debt MCP is a Model Context Protocol server that performs static technical-debt analysis across 14 languages (TypeScript, JavaScript, Python, Go, Rust, Java, Kotlin, Swift, C, C++, C#, Ruby, PHP, Scala). It exposes:

- **16 MCP tools** — project & per-file analysis, SQALE rating (A–E) and remediation-time estimates, severity/category filtering, dependency vulnerability reports, and CRUD for custom regex-based rules persisted in `.techdebtrc.json`.
- **MCP resources** — `debt://summary/{+projectPath}` and `debt://issues/{+projectPath}` for resource-style consumption.
- **3 slash commands** — `/techdebt-scan`, `/techdebt-file`, `/techdebt-summary`.
- **A `proactive-analysis` skill** — surfaces relevant scan output automatically when working on a project.

The server is published to npm as `tech-debt-mcp`; the plugin wraps it as `npx -y tech-debt-mcp@latest` so users always get the latest engine without re-installing the plugin.

## Categories / tags

`code-quality`, `static-analysis`, `developer-tools`, `mcp`, `sqale`

## Screenshots / asset suggestions

- Output of `/techdebt-scan` on a real repo (show SQALE rating + top issues).
- Output of `/techdebt-file` highlighting per-issue suggestions + remediation effort.
- Custom rule added via `add_custom_rule` → triggered in a follow-up scan.

(File these under `docs/site/public/screenshots/` when produced.)

## Maintainer contact

- GitHub: @PierreJanineh
- Email: janinehpierre@gmail.com
