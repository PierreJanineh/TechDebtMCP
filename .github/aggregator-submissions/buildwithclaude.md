# buildwithclaude.com — submission draft

**Site:** https://buildwithclaude.com
**Submission method:** verify at submission time (likely a PR to a registry repo). Fields below are the universal core.

## Listing

- **Name:** Tech Debt MCP
- **Tagline:** Static tech-debt analysis across 14 languages, as MCP tools.
- **Type:** Claude Code Plugin (wraps an MCP server)
- **Repo:** https://github.com/PierreJanineh/TechDebtMCP
- **Docs:** https://pierrejanineh.github.io/TechDebtMCP/
- **License:** MIT
- **Author:** Pierre Janineh (@PierreJanineh)

## Install

```
/plugin marketplace add PierreJanineh/TechDebtMCP
/plugin install tech-debt-mcp@techdebtmcp
```

After install, the MCP server is launched on demand via `npx -y tech-debt-mcp@latest` — no separate npm install needed.

## What it does

Surfaces technical debt that lives between linter warnings and architectural reviews: complexity hotspots, missing tests, dependency drift, security smells, and per-language code-quality issues. Outputs a SQALE rating (A–E), a debt ratio, and remediation-time estimates for every project it scans.

**Supported languages (14):** TypeScript, JavaScript, Python, Go, Rust, Java, Kotlin, Swift, C, C++, C#, Ruby, PHP, Scala.

**Dependency ecosystems:** npm, pip / Poetry / Pipfile, Cargo, Gradle, NuGet, go.mod, vcpkg, and more.

## Try it

Three commands cover the common loops:

- `/techdebt-scan` — full project audit.
- `/techdebt-file <path>` — single-file deep-dive.
- `/techdebt-summary` — high-level health check (rating + debt ratio + top categories).

The `proactive-analysis` skill activates automatically when you're working in a project and surfaces relevant findings without you having to ask.

## Customize

Drop a `.techdebtrc.json` at the project root to add custom regex-based rules, override severities, or exclude paths. Validated via the `validate_config` tool before it takes effect.

## Why it's interesting

- Real SQALE ratings — not just a count of warnings.
- Custom rules are first-class: define, validate, and run them via MCP tools, no recompile needed.
- Inline suppression (`// techdebt-ignore-next-line <rule>`) so false positives don't pollute long-running scans.

## Contact

@PierreJanineh on GitHub · janinehpierre@gmail.com
