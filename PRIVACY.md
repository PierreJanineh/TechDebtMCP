# Privacy Policy

**Last updated:** 2026-05-22

Tech Debt MCP is a Model Context Protocol (MCP) server that performs static analysis of source code on your local machine. This document describes what data the server handles and what it does not do.

The canonical, hosted version of this policy lives at <https://pierrejanineh.github.io/TechDebtMCP/privacy>.

## TL;DR

Tech Debt MCP runs entirely on your machine. Once installed, the server reads files you ask it to analyze, returns the results to your MCP client (Claude Code, Claude Desktop, Copilot, etc.), and does nothing else. The server itself has no telemetry, no analytics, no outbound network calls, and no third-party services. Installation via `npm`/`npx` contacts the npm registry — see [Installation and updates](#installation-and-updates) below.

## Data we collect

**None.** Tech Debt MCP does not collect, store, transmit, or share any personal data.

## Data the server processes locally

When you invoke a tool such as `analyze_project`, `analyze_file`, or `execute_custom_rules`, the server reads files from the paths you supply, parses them in-process, and returns issue reports to the MCP client over the local stdio transport. Inputs and outputs never leave your machine.

Specifically, the server may read:

- Source files in directories you explicitly pass as tool arguments.
- Package manifests (`package.json`, `requirements.txt`, `Cargo.toml`, `go.mod`, etc.) for dependency analysis.
- A project-local `.techdebtrc.json` configuration file, if present.

The server never writes to files it analyzes. Custom rules you define are stored in the in-memory engine for the lifetime of the session and are not persisted to disk by the server itself.

## Data transmitted to third parties

**None at runtime.** Once running, Tech Debt MCP makes no outbound HTTP, DNS, or socket calls. Dependency vulnerability checks operate on local manifests only — there is no online vulnerability database lookup. (Online vulnerability lookups are tracked as a future, opt-in feature; see [issues #31 and #32](https://github.com/PierreJanineh/TechDebtMCP/issues/31).)

## Installation and updates

How Tech Debt MCP reaches your machine depends on which installer you use:

- **Claude Code plugin / npm / `npx -y tech-debt-mcp@latest`** — the npm CLI (or `npx`) contacts the public npm registry (`registry.npmjs.org`) to resolve the package version and download the tarball plus its production dependencies. This is standard package-manager behavior, performed by `npm`/`npx`, not by the server itself. After the package is cached locally, subsequent invocations may still contact the registry to check whether `@latest` has changed (subject to npx's cache policy).
- **MCPB bundle (`.mcpb` for Claude Desktop)** — the bundle ships the server and all production dependencies pre-installed. After Claude Desktop installs it, **no further network access is needed** to run the server. Updates require downloading a new `.mcpb`.

In both cases, once the server process is running, no outbound network traffic is initiated.

## Telemetry and analytics

**None.** The server emits no usage events, crash reports, or performance metrics to any remote endpoint.

The companion documentation site at <https://pierrejanineh.github.io/TechDebtMCP/> uses a self-hosted, cookieless Plausible analytics instance for aggregate page-view counts. This applies only to visitors of the documentation site; it does not apply to the MCP server itself. No identifying information is collected, and the analytics instance is operated by the project maintainer (not a third-party SaaS).

## Third-party services

**None used by the server.** The server depends on standard Node.js runtime APIs and the npm packages listed in `package.json`. None of those packages are configured to make network calls during analysis.

## Children's privacy

Tech Debt MCP is a developer tool and is not directed at children under 13.

## Changes to this policy

Material changes to this policy will be announced in `CHANGELOG.md` and reflected in the **Last updated** date above. Historical versions are available via the git history of this file.

## Contact

Questions about this policy: open a GitHub Discussion at <https://github.com/PierreJanineh/TechDebtMCP/discussions> or email the maintainer at **janinehpierre@gmail.com**.

For security-sensitive reports, use [GitHub Security Advisories](https://github.com/PierreJanineh/TechDebtMCP/security/advisories/new) instead — see [`SECURITY.md`](./SECURITY.md) for the disclosure policy.
