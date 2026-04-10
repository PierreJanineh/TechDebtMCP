# Security Policy

## Supported Versions

Security fixes are applied to the latest minor release line only. If a vulnerability is found in an older version, please upgrade to the latest `2.x` release before reporting.

| Version | Supported          |
| ------- | ------------------ |
| 2.0.x   | :white_check_mark: |
| < 2.0   | :x:                |

## Reporting a Vulnerability

**Please do not report security vulnerabilities through public GitHub issues.**

Report vulnerabilities privately through GitHub's [Security Advisories](https://github.com/PierreJanineh/TechDebtMCP/security/advisories/new) flow. This keeps the details confidential until a fix is published.

### What to include

A good report contains:

- A description of the vulnerability and its impact
- Affected versions (including the exact `tech-debt-mcp` version from `npm list` or `package.json`)
- Steps to reproduce, ideally with a minimal example
- Any known mitigations or workarounds

### What to expect

Tech Debt MCP is a small open-source project maintained on a best-effort basis, but security reports are triaged with priority:

- **Acknowledgement:** within 7 days of the report
- **Initial assessment:** within 14 days (severity, affected versions, whether it reproduces)
- **Fix timeline:** depends on severity — critical issues are patched as quickly as possible, typically within 30 days
- **Disclosure:** coordinated with the reporter once a fix is released; credit is given in the release notes unless anonymity is requested

### Scope

In scope:

- MCP tool handlers and resource handlers (`src/server/`)
- Input validation and path handling (`src/server/inputParser.ts`, `argValidation.ts`)
- User-supplied regex compilation in custom rules (`src/core/customRulesEngine.ts`)
- Dependency parsers that read manifest files (`src/analyzers/dependencies/`)
- The npm-published package itself (supply-chain issues, malicious publish, etc.)

Out of scope:

- Findings that require the attacker to already have full filesystem or process access
- Denial-of-service via extremely large input files beyond the documented caps (see `MAX_FILE_SIZE_BYTES`, `MAX_PATTERN_LENGTH`, `MAX_CODE_LENGTH` in `src/core/customRulesEngine.ts`)
- Issues in third-party dependencies — please report those upstream and let us know so we can bump the dependency

## Automated Security Scanning

This repository runs the following automated scans:

- **CodeQL** — static analysis on every push to `develop`/`master`, every pull request to `develop`, and weekly on Mondays (see `.github/workflows/codeql.yml`)
- **Secret scanning** — GitHub-managed, enabled for all pushes
- **Dependabot alerts** — GitHub-managed, monitors runtime and dev dependencies for known CVEs

Findings from these scans are reviewed by the maintainers. If you notice a scan result that looks like a genuine vulnerability, you can still file a private report via the Security Advisories flow — we'd rather have duplicates than miss something.
