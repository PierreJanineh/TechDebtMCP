---
layout: home

hero:
  name: Tech Debt MCP
  text: Static tech-debt analysis as an MCP server
  tagline: 16 tools, 14 languages, custom rules, dependency vulnerability scanning — drop it into Claude Code, Copilot, or any MCP client.
  image:
    light: /icon-light.png
    dark: /icon.png
    alt: Tech Debt MCP
  actions:
    - theme: brand
      text: Install
      link: /install
    - theme: alt
      text: Tool Reference
      link: /tools/
    - theme: alt
      text: GitHub
      link: https://github.com/PierreJanineh/TechDebtMCP

features:
  - title: 14 languages out of the box
    details: TypeScript, JavaScript, Python, Java, Kotlin, Swift, Go, Rust, Ruby, PHP, C#, C/C++, plus dependency parsers for npm, pip, cargo, gradle, nuget, go.mod and more.
    link: /languages
  - title: SQALE metrics + 16 MCP tools
    details: Project + file-level analysis, severity/category filters, recommendations, dependency vulnerability reports, and a custom-rules engine — all exposed as MCP tools and resources.
    link: /tools/
  - title: Custom rules, no plugin needed
    details: Define regex-based rules in `.techdebtrc.json` with severity, category, and per-rule file globs. Validated at registration time with length and flag allowlists.
    link: /custom-rules
  - title: Distributed every way
    details: Install via npm, register via Claude Code plugin manifest, or one-click via the MCPB bundle attached to every GitHub Release.
    link: /install
---

## Quick start

```bash
# Run directly via npx
npx -y tech-debt-mcp@latest
```

Then add it to your MCP client config — see [Install](/install) for `claude_desktop_config.json`, Claude Code plugin, and MCPB bundle paths.

## What you get

- **16 MCP tools** for project-, file-, and rule-level analysis — see the [tool reference](/tools/).
- **Two MCP resource templates** (`debt://summary/{+path}`, `debt://issues/{+path}`) for read-only ingestion.
- **SQALE rating + remediation time** for every project.
- **Dependency vulnerability reports** across the major package managers.
- **Inline suppression** (`// techdebt-ignore-next-line <rule>`) to silence false positives without disabling rules globally.

## Project links

- [Architecture deep-dive](/architecture)
- [Roadmap](/roadmap)
- [Changelog](/changelog)
- [Security model](/security)
