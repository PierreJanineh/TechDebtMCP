# Tech Debt MCP — Claude Code Plugin

Static technical-debt analysis across 14 languages, delivered to Claude Code as an MCP server. Ask Claude to scan a project for debt, generate an offline dependency inventory for CVE review, or grade maintainability with SQALE — the plugin wires up the tools, Claude routes your prompts to them.

- **Engine source:** <https://github.com/PierreJanineh/TechDebtMCP>
- **Tool reference & docs:** <https://pierrejanineh.github.io/TechDebtMCP/>
- **Privacy policy:** <https://pierrejanineh.github.io/TechDebtMCP/privacy>
- **Security model:** <https://pierrejanineh.github.io/TechDebtMCP/security>

## Install

From a Claude Code session:

```text
/plugin marketplace add PierreJanineh/TechDebtMCP
/plugin install tech-debt-mcp@techdebtmcp
```

That's it. The plugin registers an MCP server (`tech-debt-mcp`) that Claude Code launches on demand via `npx -y tech-debt-mcp@latest` (tracks the npm `latest` dist-tag) — updates flow in automatically when you start a new session.

**Requirements:** Node.js ≥ 20.19.0 on your machine. The first invocation downloads the package (~160 KB + production dependencies); subsequent invocations use the npm/npx cache.

> Prefer a one-click install with no Node toolchain needed? Use the [MCPB bundle](https://github.com/PierreJanineh/TechDebtMCP/releases) for Claude Desktop — it ships the server pre-installed.

## What you get

Once installed, Claude has access to these MCP tools:

| Tool | Purpose | Type |
|---|---|---|
| `analyze_project` | Full project scan across all supported languages | Read |
| `analyze_file` | Single-file analysis | Read |
| `get_debt_summary` | Aggregate health score + counts | Read |
| `get_sqale_metrics` | SQALE rating and debt ratio | Read |
| `get_issues_by_severity` | Filter findings by severity | Read |
| `get_issues_by_category` | Filter findings by category | Read |
| `get_recommendations` | Prioritized remediation suggestions | Read |
| `get_vulnerability_report` | Offline dependency inventory for CVE review | Read |
| `check_dependencies` | Parse and inspect dependency files | Read |
| `list_supported_languages` | List the 14 supported languages | Read |
| `validate_config` | Lint a `.techdebtrc.json` | Read |
| `validate_custom_pattern` | Dry-run a regex rule | Read |
| `list_session_custom_rules` | List user-defined rules in this session (renamed from `list_custom_rules` in v2.0.3 / TEC-51 — does not surface `.techdebtrc.json` `customPatterns`) | Read |
| `add_custom_rule` | Add an in-memory custom rule | Write (session-scoped) |
| `remove_custom_rule` | Remove an in-memory custom rule | Write (session-scoped) |
| `execute_custom_rules` | Run all session custom rules over a file | Read |

Read tools are flagged `readOnlyHint: true`; `add_custom_rule` / `remove_custom_rule` mutate session state only (rules live in memory and disappear when the server process exits — they are never written to disk).

Full per-tool reference: <https://pierrejanineh.github.io/TechDebtMCP/tools/>.

## Slash commands

The plugin registers three slash commands for on-demand invocation:

| Command | Argument | Purpose |
|---------|----------|---------|
| `/techdebt-scan [project-path]` | Optional absolute path (defaults to cwd) | Full project scan — health score, SQALE rating, issue breakdown, and top 5 issues by severity |
| `/techdebt-file <file-path>` | Absolute path to a source file | Single-file analysis — line-numbered issue table sorted by severity |
| `/techdebt-summary [project-path]` | Optional absolute path (defaults to cwd) | Aggregate dashboard — health score, SQALE rating, counts by severity, remediation estimate |

Commands delegate to the MCP tools listed above — no logic is duplicated.

### Proactive analysis skill

The plugin also installs a **proactive-analysis** skill: Claude will automatically run the analyzer before you open a pull request, during code review, or when you ask "is my code ready to merge?" — without you needing to type a command. The skill governs event-triggered invocations; the slash commands above handle explicit on-demand requests.

## Example transcripts

You don't call tools by name — Claude routes your prompts to them. Here are two representative sessions.

### Example 1 — Scan a project for tech debt

> **You:** Scan this repo for tech debt and give me the top three things to fix first.
>
> **Claude:** *(calls `analyze_project` with the current working directory, then `get_recommendations`)*
>
> I scanned the project and found 47 issues — health score 68/100, SQALE rating B, estimated remediation 14h.
>
> *(Sample output below is illustrative — actual findings, paths, and line numbers depend on the project being scanned.)*
>
> The top three by impact:
>
> 1. **`src/server/handlers.ts:142` — deep nesting (depth 6).** Extract the inner conditional into a helper to drop to depth 3. *(effort: small, ~20m)*
> 2. **`src/server/dependencyHandlers.ts:88` — function length 124 lines.** Split into smaller focused functions. *(effort: medium, ~1h)*
> 3. **Three `@ts-ignore` directives** in `src/core/analysisEngine.ts`. Replace with `@ts-expect-error` plus a comment explaining each. *(effort: trivial, ~5m each)*
>
> Want me to start with #3 since they're quick wins?

### Example 2 — Vulnerability report on dependencies

> **You:** Are any of our npm dependencies known to be vulnerable?
>
> **Claude:** *(calls `get_vulnerability_report` against the project root)*
>
> I parsed your manifest files and produced an offline dependency inventory. The tool does not perform CVE lookups — that's a planned Phase 2b feature. Here's what I found:
>
> **Project:** my-app  
> **Package files found:** 1 across 1 ecosystem  
> **Total dependencies inventoried:** 47  
>
> | Package | Version |
> |---------|---------|
> | lodash | 4.17.20 |
> | axios | 0.21.0 |
> | … | … |
>
> **Next steps:** Cross-reference with [OSV](https://osv.dev) or [Snyk](https://snyk.io) to check these versions for known CVEs. Online CVE checking will be available in Phase 2b (opt-in, privacy-friendly).

## Security posture

The plugin invokes a Node MCP server over the local stdio transport. The server:

- **Reads files** only within the project/file paths you provide — including standard config files (`.gitignore`, `.techdebtrc.json`) discovered automatically under that root. Path arguments are validated with `isAbsolute()` and normalized with `resolve()` (via `requireAbsolutePath()`) at the handler boundary.
- **Never writes** to files it analyzes.
- **Never executes shell commands.** No `child_process`, no `eval`, no dynamic code loading.
- **Never makes outbound network calls** at runtime — no telemetry, no analytics, no third-party services. Vulnerability checks use local manifest data only.
- **Custom rules** you define live in the engine's memory for the session and are not persisted to disk.
- **User-supplied regex** is length-capped, flag-allowlisted, and isolated to safe execution (see [Security Model](https://pierrejanineh.github.io/TechDebtMCP/security)).

For the full privacy stance — including the npm-registry boundary on first install — see <https://pierrejanineh.github.io/TechDebtMCP/privacy>.

## Configuration

Drop a `.techdebtrc.json` at your project root to customize severity thresholds and exclude paths. Custom rules are added per-session via the `add_custom_rule` tool (not loaded from config). Schema and examples: <https://pierrejanineh.github.io/TechDebtMCP/custom-rules>.

## Troubleshooting

- **"Server failed to start"** — confirm `node --version` is `≥ 20.19.0`. The plugin invokes `npx -y tech-debt-mcp@latest`, which needs Node on PATH.
- **First run is slow** — the initial npx fetch (~160 KB tarball + production deps) can take 5–15 seconds. Subsequent runs use the npx cache.
- **Tools missing from the planner** — restart the Claude Code session after install; the MCP servers list refreshes on session start.

## Reporting issues

- General bugs and feature requests: <https://github.com/PierreJanineh/TechDebtMCP/issues>
- Security-sensitive reports: [GitHub Security Advisories](https://github.com/PierreJanineh/TechDebtMCP/security/advisories/new) — see the [Security Model page](https://pierrejanineh.github.io/TechDebtMCP/security) for the disclosure policy.

## License

MIT — see [`LICENSE`](https://github.com/PierreJanineh/TechDebtMCP/blob/develop/LICENSE) in the engine repository.
