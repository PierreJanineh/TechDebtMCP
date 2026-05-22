---
title: Install
outline: deep
---

# Install

Tech Debt MCP ships through three channels. Pick whichever matches your client.

## npx (any MCP client)

The fastest path — no install, always the latest published version.

```bash
npx -y tech-debt-mcp@latest
```

Pin to a version if you want reproducibility:

```bash
npx -y tech-debt-mcp@2.0.2
```

## Claude Desktop (`claude_desktop_config.json`)

```json
{
  "mcpServers": {
    "tech-debt": {
      "command": "npx",
      "args": ["-y", "tech-debt-mcp@latest"]
    }
  }
}
```

Restart Claude Desktop after editing.

## Claude Code plugin

The repository ships its own marketplace via [`.claude-plugin/marketplace.json`](https://github.com/PierreJanineh/TechDebtMCP/blob/develop/.claude-plugin/marketplace.json). Install with:

```bash
/plugin marketplace add PierreJanineh/TechDebtMCP
/plugin install tech-debt-mcp@techdebtmcp
```

The plugin registers the MCP server via [`plugin.json → mcpServers`](https://github.com/PierreJanineh/TechDebtMCP/blob/develop/.claude-plugin/plugin.json), so there's nothing else to wire up.

## MCPB bundle (Claude Desktop one-click)

Every [GitHub Release](https://github.com/PierreJanineh/TechDebtMCP/releases) attaches a `tech-debt-mcp-<version>.mcpb` artifact. Double-click to install in Claude Desktop — no Node toolchain needed on the host.

## Global npm install (optional)

```bash
npm install -g tech-debt-mcp
tech-debt-mcp
```

Useful if you want to call the binary directly from custom scripts or another MCP client that expects a path.

## What's next

- Browse the [tool reference](/tools/).
- Set up [custom rules](/custom-rules).
- Read the [security model](/security) before running on untrusted projects.
