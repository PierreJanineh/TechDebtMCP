---
title: Security Model
outline: deep
---

# Security Model

Tech Debt MCP runs in-process inside your MCP client and reads files from disk on your behalf. The threat surface is small but real — this page documents what's hardened and what isn't.

## Trust boundary

The MCP client is trusted. Anything that arrives via tool arguments — file paths, regex patterns, project roots — is **not** trusted and is validated at the handler boundary.

## Path arguments

All path parameters flow through `requireAbsolutePath` / `optionalAbsolutePath` (`src/server/inputParser.ts`):

- `path.isAbsolute()` rejected if false.
- Normalized via `path.resolve()` so `..` traversal collapses before use.
- An empty string for an optional path is treated as `undefined`.

Path parameters must never be read from `args` directly — they must flow through `requireAbsolutePath` or `optionalAbsolutePath`. Non-path fields (e.g., `includeDev`, `severity`) may be read from the validated record returned by `requireRecord()` after the path is extracted. This convention is enforced across `handlers.ts`, `configValidator.ts`, `customRulesHandlers.ts`, and `dependencyHandlers.ts`.

## User-supplied regex

Custom rules accept regex patterns. To prevent catastrophic backtracking and engine abuse:

- Pattern length capped at **`MAX_PATTERN_LENGTH = 1,000`** chars.
- Code chunks capped at **`MAX_CODE_LENGTH = 500,000`** chars.
- Files larger than **`MAX_FILE_SIZE_BYTES = 500,000`** bytes are rejected with an `InvalidParams` error before pattern execution.
- Flags allowlisted to `dgimsuvy`; `u` and `v` are validated as mutually exclusive.
- Any captured string interpolated into `new RegExp()` is escaped through `escapeRegExp()` (`src/utils/regexUtils.ts`).

These constants live in `src/core/customRulesEngine.ts` — import them rather than hardcoding values.

## Error messages

Domain handlers sanitize paths in error output; unexpected non-`McpError` exceptions that escape to the top-level catch may still include implementation detail:

- `getRelativePath()` or `basename()` sanitize paths in error output.
- Raw `err.message` from domain-specific handlers (`customRulesHandlers.ts`, `configValidator.ts`, `dependencyHandlers.ts`) is caught and rethrown as an `McpError` with a safe message before it reaches the client.
- The top-level catch in `handlers.ts` wraps unexpected non-`McpError` exceptions using `error.message`; errors that escape domain handlers may therefore include implementation detail. Prefer throwing sanitized `McpError` instances from all code paths to avoid this.
- This rule applies to **every** handler file.

## Pre-commit hardening

Doc updates on `src/**` changes are enforced as a convention (see `CLAUDE.md`). The test suite enforces:

- Every entry in `TOOL_DEFINITIONS` carries an `annotations` object (`readOnlyHint` or `destructiveHint`).
- `mcpb/manifest.json` mirrors `TOOL_DEFINITIONS` exactly.

## Automated scanning

GitHub Actions runs CodeQL with `security-and-quality` queries on every push and PR — see [`.github/workflows/codeql.yml`](https://github.com/PierreJanineh/TechDebtMCP/blob/develop/.github/workflows/codeql.yml).

## Reporting

Found something? Use [GitHub Security Advisories](https://github.com/PierreJanineh/TechDebtMCP/security/advisories/new). Do **not** open a public issue for vulnerabilities.

See [`SECURITY.md`](https://github.com/PierreJanineh/TechDebtMCP/blob/develop/SECURITY.md) for the full disclosure policy.
