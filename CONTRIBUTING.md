# Contributing to Tech Debt MCP

Thank you for your interest in contributing to **Tech Debt MCP** (repository: `TechDebtMCP`)! This document provides guidelines for contributing to the project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [How to Contribute](#how-to-contribute)
- [Coding Guidelines](#coding-guidelines)
- [Commit Messages](#commit-messages)
- [Pull Request Process](#pull-request-process)
- [Testing](#testing)
- [Reporting Issues](#reporting-issues)

## Code of Conduct

Please be respectful and constructive in all interactions. We aim to maintain a welcoming and inclusive community.

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/TechDebtMCP.git`
3. Add upstream remote: `git remote add upstream https://github.com/PierreJanineh/TechDebtMCP.git`

## Development Setup

### Prerequisites

- Node.js >=20.19.0 and npm
- Git

### Installation

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Run in development mode
npm run dev

# Watch mode for development
npm run watch
```

### Project Structure

```
src/
├── index.ts                    # Entry point — creates server, attaches handlers + resources, runs
├── server/
│   ├── setup.ts                # McpServer instantiation and transport wiring
│   ├── handlers.ts             # Core MCP tool request handlers (CallToolRequestSchema)
│   ├── tools.ts                # TOOL_DEFINITIONS array (tool schemas/descriptions)
│   ├── inputParser.ts          # Tool argument validation (requireString, optionalString, etc.)
│   ├── argValidation.ts        # Argument coercion and constraint checks
│   ├── resourceHandlers.ts     # MCP resource templates (debt://summary, debt://issues)
│   ├── formatters.ts           # Output formatting helpers
│   ├── configValidator.ts      # .techdebtrc.json validation handler
│   ├── customRulesHandlers.ts  # Custom rules CRUD & execution handlers
│   └── dependencyHandlers.ts   # Dependency analysis & vulnerability report handlers
├── types/index.ts              # Single source of truth for all TypeScript interfaces
├── config/languages.ts         # Per-language config: extensions, package files, patterns
├── core/
│   ├── analysisEngine.ts       # Project-level orchestrator: discovers files, fans out to analyzers
│   ├── sqaleEngine.ts          # SQALE rating/debt ratio calculation
│   └── customRulesEngine.ts    # User-defined pattern rules (.techdebtrc.json)
├── analyzers/
│   ├── baseAnalyzer.ts         # Abstract base — shared logic, checkPattern(), applyRuleExclusions()
│   ├── index.ts                # createAnalyzer() factory
│   ├── [language]Analyzer.ts   # 14 language-specific analyzers
│   ├── swiftUiChecks.ts        # SwiftUI Phase 1 checks (companion to swiftAnalyzer)
│   ├── swiftUiChecksPhase2.ts  # SwiftUI Phase 2 checks (advanced patterns)
│   └── dependencies/
│       ├── baseParser.ts       # Abstract dependency parser
│       ├── index.ts            # createDependencyParser() factory
│       └── [ecosystem]Parser.ts # npm, pip, cargo, gradle, nuget, go.mod, etc.
└── utils/
    ├── fileUtils.ts            # fs helpers (readFile, fileExists, getRelativePath)
    └── regexUtils.ts           # escapeRegExp() — safe RegExp construction helper
```

## Claude Code Contributor Tooling

The repository ships a small set of Claude Code automation files that improve the contributor workflow. The `.claude/` contributor automation is **excluded from all end-user distribution channels** (npm tarball, MCPB bundle, and Claude Code plugin marketplace sessions) — end users who install `tech-debt-mcp` via any of those channels are not affected. Note that the plugin marketplace distributes `.claude-plugin/plugin.json` (the plugin manifest, which runs `npx -y tech-debt-mcp@latest`) — that is separate from the `.claude/` contributor automation.

### Scoping

| Distribution channel | Dev files included? | Mechanism |
|---|---|---|
| npm (`npm publish`) | No | `package.json` `files` allowlist (`dist/`, `README.md`, `LICENSE`) — deny-by-default; everything else is excluded |
| MCPB bundle (`npm run mcpb:pack`) | No | `scripts/build-mcpb.mjs` only stages `package.json`, `package-lock.json`, `README.md`, `LICENSE`, `dist/`, and the MCPB manifest/icon |
| Claude Code plugin marketplace | No | Plugin install distributes `.claude-plugin/plugin.json` (which runs `npx -y tech-debt-mcp@latest`); it does not load the source repo's `.claude/settings.json` into end users' sessions |

The following contributor-only and dev-only files are excluded from the npm package:

- **`.claude/`** — Claude Code contributor automation (hooks, rules, skills, settings)
- **`.claude-plugin/`** — Claude Code plugin/marketplace manifest (excluded from the npm tarball; the plugin marketplace distributes `plugin.json` directly from the repo)
- **`CLAUDE.md`**, **`CONTRIBUTING.md`**, **`ARCHITECTURE.md`**, **`ROADMAP.md`**, **`TECH_DEBT_SCAN.md`**, **`CHANGELOG.md`**, **`RELEASE.md`**, **`QUICK_RELEASE.md`**, **`GITHUB_PACKAGES.md`**, **`CODE_OF_CONDUCT.md`**, **`SECURITY.md`**, **`PRIVACY.md`**
- **`src/`** (TypeScript source — compiled output ships as `dist/`)
- **`tests/`**, **`src/**/__tests__/`**, **`*.test.ts`** (test infrastructure)
- **`scripts/`** — build helpers (`build-mcpb.mjs`, `gen-docs-tools.mjs`, `scan-showcase.mjs`)
- **`docs/`** — VitePress docs site (served via GitHub Pages, not npm)
- **`mcpb/`** — MCPB bundle source (separate distribution channel, not npm)
- **`.github/`** — CI workflows and GitHub configuration
- **`eslint.config.mjs`**, **`jest.config.js`**, **`tsconfig.json`** — dev tool configuration
- **`.techdebtrc.json`** — project's own self-scan config (not useful to library consumers)
- **`.env.example`**, **`npm-deps.txt`** — development helpers

### Distributed files

The following files are force-added (`git add -f`) so contributors get them on checkout:

- **`.claude/settings.json`** — enables `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` (required for the multi-agent PR review and feature-dev automations used by maintainers) and registers the two hooks below.
- **`.claude/hooks/block-npm-publish.sh`** — PreToolUse hook that hard-blocks any Bash tool call containing `npm publish` without `--dry-run`. Prevents accidental local publishes that would bypass the OIDC tag workflow.
- **`.claude/hooks/check-tools-manifest-sync.sh`** — PostToolUse hook that warns when `src/server/tools.ts` is edited but `mcpb/manifest.json` has no pending changes, prompting you to keep them in sync.
- **`.claude/skills/`** — contributor skills (`add-config-block`, `refresh-self-scan`) that encode project-specific procedures for Claude Code.
- **`.claude/rules/git-workflow.md`, `.claude/rules/docs-maintenance.md`, `.claude/rules/code-quality.md`** — rule files referenced by the skills and loaded into Claude Code's context automatically.

### Local-only (gitignored)

The following remain personal/local and are never committed:

- `.claude/settings.local.json` — personal overrides
- `.claude/hookify.*.local.md` — personal hookify rules
- `.claude/hooks/pre-pr-docs-check.sh` — personal pre-PR docs gate

## How to Contribute

### Types of Contributions

- **Bug fixes** — Fix issues reported in GitHub Issues
- **New features** — Add new language analyzers, MCP tools, or analysis capabilities
- **Documentation** — Improve README, guides, or code comments
- **Tests** — Add or improve test coverage

### Workflow

1. **Find or create an issue** — Check if an issue exists for what you want to work on
2. **Comment on the issue** — Let others know you're working on it
3. **Create a branch** — Use the naming convention below
4. **Make your changes** — Follow the coding guidelines
5. **Test your changes** — Ensure all tests pass
6. **Submit a pull request** — Follow the PR template

## Coding Guidelines

### TypeScript Standards

- **Strict mode enabled** — No implicit any types
- **Use async/await** — No callbacks
- **JSDoc comments required** — Document all public functions
- **No `any` types** — Use `unknown` if type is truly unknown
- **Prefer `const`** — Use `let` only when reassignment is needed
- **ES modules** — Use `.js` extensions in imports

### Tech Debt Compliance (SQALE Rating: A ⭐⭐⭐⭐⭐)

**Project maintains A SQALE rating (0.7% debt ratio · Debt Score 5/100) — follow these rules to keep it excellent:**

> **📊 See [TECH_DEBT_SCAN.md](TECH_DEBT_SCAN.md)** for the complete self-scan history, including the documented `210c50a` baseline (118 issues) and later scans showing 12/13 issues.

#### File Size & Complexity Limits
- **Max file length:** 500 lines (split larger files into modules)
- **Max nesting depth:** 4 levels (use early returns and helper functions)
- **Max function length:** 50 lines
- **Max cyclomatic complexity:** 10

#### Code Quality Rules (Enforced)
- ❌ **NO `debugger` statements** in production code
- ❌ **NO `@ts-ignore`** - Use `@ts-expect-error` with explanation
- ❌ **NO `console.log`** in production code - Remove or use proper logging
- ✅ **USE early returns** to reduce nesting
- ✅ **EXTRACT complex logic** into well-named helper functions
- ✅ **REPLACE `!` operator** with optional chaining (`?.`) or null checks
- ✅ **ADD JSDoc** to all public APIs

#### Known Refactoring Targets (Don't make worse)
1. ~~`src/index.ts` - 883 lines~~ ✅ Resolved in v2.0.0 (split into `src/server/` modules)
2. ~~`src/analyzers/csharpAnalyzer.ts:267` - Deep nesting (14 levels)~~ ✅ Resolved in PR #113 (refactored to ≤4 levels)
3. ~~Non-null assertions at `src/index.ts:804, 809`~~ ✅ Resolved in v2.0.0

#### Configuration Impact
**Current (v2.0.2, April 2026):** 13 issues, 14h remediation, Health 95/100, Debt Score 5/100, debt ratio 0.7%, SQALE A. No critical or high-severity issues; remaining debt is 5 nesting hotspots (4 in server/core modules + 1 in `eslint.config.mjs` itself from the flat-config structure), 7 type-assertion usages, and 1 non-null assertion. (Debt Score /100 and debt ratio % are distinct SQALE metrics; both are reported here because they scale differently.)
**Baseline (v2.0.1, March 2026):** 118 issues, ~96h remediation, Health 42.4/100 — before the v2.0.2 security hardening, `ruleExclusions` config, nesting refactors (#113, #118, #131, #146), and custom-rules handler extraction (#145).
**Original (Feb 2026):** 101 issues, 70h → 81 issues, 60h after initial `.techdebtrc.json`.

**Configuration:** See `.techdebtrc.json` for project-specific rules.

### Code Style

```typescript
/**
 * Example function with proper documentation
 * @param filePath Absolute path to the file
 * @param content File content to analyze
 * @returns Object containing analysis result with issues array
 */
async function analyzeCode(filePath: string, content: string): Promise<{ issues: TechDebtIssue[] }> {
  const issues: TechDebtIssue[] = [];
  // Implementation
  return { issues };
}
```

### Adding a New Language Analyzer

See [`.github/copilot-instructions.md`](.github/copilot-instructions.md) for detailed instructions on:
- Creating a new language analyzer
- Adding MCP tools
- Using the BaseAnalyzer helpers

## Commit Messages

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>: <description>

[optional body]

[optional footer]
```

### Types

- `feat:` — New feature
- `fix:` — Bug fix
- `docs:` — Documentation only
- `refactor:` — Code refactoring
- `test:` — Adding or updating tests
- `chore:` — Maintenance tasks (dependencies, build config, etc.)
- `perf:` — Performance improvements
- `style:` — Code style changes (formatting, semicolons, etc.)

### Examples

```
feat: add Rust language analyzer

- Implement RustAnalyzer extending BaseAnalyzer
- Add checks for unwrap(), unsafe blocks, panic!()
- Update factory to include Rust support

Closes #7
```

```
fix: correct cyclomatic complexity calculation for nested loops

The previous implementation was counting loop conditions incorrectly.
This fix ensures each loop adds exactly 1 to the complexity score.

Fixes #45
```

## Pull Request Process

### Review Process

1. **Automated checks** — CI/CD runs tests and linting
2. **Copilot review** — Review automated suggestions and address relevant ones
3. **Human review** — Maintainer reviews the code
4. **Address feedback** — Make requested changes
5. **Merge** — Squash and merge into `develop`

### Before Submitting

1. ✅ **Run tests** — `npm test` (all tests must pass)
2. ✅ **Build succeeds** — `npm run build` (no TypeScript errors)
3. ✅ **Update documentation** — If you changed functionality
4. ✅ **Add tests** — For new features or bug fixes
5. ✅ **Include docs for Phase 2 features** — If your change touches dependency parsing or adds MCP tools (e.g., `check_dependencies`), update README, ARCHITECTURE.md, and CHANGELOG.md in the same branch

### Branch Naming

- Primary: `feature/tec-{N}-short-description` or `fix/tec-{N}-...` where `TEC-N` is the Linear issue ID — this triggers Linear's two-way sync on PR merge
- Fallback for issues without a Linear ticket: `feature/issue-{N}-...` or `fix/issue-{N}-...`

Examples:
- `feature/tec-49-custom-patterns-wiring` (primary — Linear-tracked)
- `fix/tec-58-language-overrides`
- `feature/issue-203-rust-analyzer` (fallback — GitHub-only issue)

### PR Target

- Ongoing work targets `develop`
- During an active release cycle, targets the `release/vX.Y.Z` branch
- **Never target `main` directly** — main only receives back-merges from release branches

### PR Template

The PR template at [`.github/PULL_REQUEST_TEMPLATE.md`](.github/PULL_REQUEST_TEMPLATE.md) auto-populates when you open a PR. Fill in: Summary, Related issue, Type of change, the dev-loop checklist, and Test plan.

## Testing

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run specific test file
npm test -- goAnalyzer.test.ts

# Run with coverage
npm test -- --coverage
```

### Writing Tests

- Place tests in `__tests__/` folders next to source files
- Name test files: `[filename].test.ts`
- Use descriptive test names
- Jest is configured with ts-jest for TypeScript support

```typescript
describe('TypeScriptAnalyzer', () => {
  const analyzer = new TypeScriptAnalyzer();

  it('detects any type usage', async () => {
    const result = await analyzer.analyze('test.ts', 'const x: any = 5;');
    
    expect(result.issues).toContainEqual(
      expect.objectContaining({
        rule: 'any-type',
        severity: 'medium'
      })
    );
  });
});
```

## Reporting Issues

Open issues on GitHub — they're synced to Linear automatically.

- **Bugs:** [`.github/ISSUE_TEMPLATE/bug_report.yml`](.github/ISSUE_TEMPLATE/bug_report.yml) — required fields cover description, repro steps, version, Node version, OS, and MCP client.
- **Features:** [`.github/ISSUE_TEMPLATE/feature_request.yml`](.github/ISSUE_TEMPLATE/feature_request.yml) — problem, proposed solution, alternatives, and scope.
- **Security vulnerabilities:** do **not** file a public issue. Use [GitHub Security Advisories](https://github.com/PierreJanineh/TechDebtMCP/security/advisories/new) instead.

## Questions?

- Check existing [GitHub Issues](https://github.com/PierreJanineh/TechDebtMCP/issues)
- Read the [README](README.md)
- Review [`.github/copilot-instructions.md`](.github/copilot-instructions.md)

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

