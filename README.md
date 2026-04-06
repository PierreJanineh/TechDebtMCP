# Tech Debt MCP Server

[![npm version](https://img.shields.io/npm/v/tech-debt-mcp)](https://www.npmjs.com/package/tech-debt-mcp)
[![Add to MCP](https://img.shields.io/badge/MCP-Install_Server-6f42c1)](#installation)
[![SQALE Rating](https://img.shields.io/badge/SQALE-A_(2.9%25)-brightgreen)](#code-quality)

A Model Context Protocol (MCP) server for analyzing technical debt across multiple programming languages. Designed to integrate with GitHub Copilot and other MCP-compatible tools.

> **Built with Vibe Coding** - This project was developed using AI-assisted "vibe coding" techniques, leveraging GitHub Copilot to rapidly prototype and iterate on features while maintaining code quality and test coverage.
>
> **Quality Assurance** - This project practices what it preaches! Tech Debt MCP maintains an **A rating** (3.4% debt ratio) by regularly scanning itself and following strict code quality standards. See [Code Quality](#code-quality) for details.

## Features

- **Multi-language support**: JavaScript, TypeScript, Python, Java, Swift, Kotlin, Objective-C, C++, C, C#, Go, Rust, Ruby, PHP
- **Comprehensive analysis**: Detects various types of tech debt including code quality issues, security vulnerabilities, and maintainability problems
- **SQALE Metrics**: Calculate technical debt with SQALE rating system (A-E scale)
- **SwiftUI Analysis**: Specialized checks for SwiftUI patterns, state management, memory leaks, view nesting, and concurrency issues
- **Custom Rules**: Define your own pattern-based checks with regex support
- **Dependency Analysis**: Parse package manifests across 10 ecosystems (npm, pip, Maven/Gradle, Cargo, Go Modules, Composer, Bundler, NuGet, C/C++, Swift)
- **Inline Suppression**: Suppress false positives with `// techdebt-ignore-next-line` or block comments
- **Config Validation**: Validate `.techdebtrc.json` configuration files for schema correctness
- **Actionable recommendations**: Provides prioritized suggestions for addressing technical debt
- **Flexible filtering**: Filter results by severity, category, or language

## Supported Languages

| Language    | Extensions            | Key Checks                                                                         |
| ----------- | --------------------- | ---------------------------------------------------------------------------------- |
| JavaScript  | .js, .mjs, .cjs, .jsx | console.log, debugger, eslint-disable, eval, var usage                             |
| TypeScript  | .ts, .tsx, .mts, .cts | any type, @ts-ignore, non-null assertions, type assertions                         |
| Python      | .py, .pyw, .pyi       | bare except, print statements, global usage, eval/exec                             |
| Java        | .java                 | System.out, printStackTrace, empty catch, @SuppressWarnings                        |
| Swift       | .swift                | force unwrap (!), force cast (as!), force try, retain cycles, **SwiftUI patterns** |
| Kotlin      | .kt, .kts             | !!, lateinit abuse, @Suppress, unchecked casts                                     |
| Objective-C | .m, .mm, .h           | NSLog, retain cycles, deprecated methods, massive view controllers                 |
| C++         | .cpp, .cc, .hpp, .h   | raw pointers, C-style casts, goto, using namespace std                             |
| C           | .c, .h                | malloc without free, goto, unsafe functions, null checks                           |
| C#          | .cs                   | Console.WriteLine, async void, empty catch, dispose pattern                        |
| Go          | .go                   | ignored errors, blank imports, fmt.Print, panic, global variables                  |
| Rust        | .rs                   | unwrap, expect, unsafe, allow attributes, panic, println                           |
| Ruby        | .rb                   | puts, binding.pry, rubocop disable, eval, global variables                         |
| PHP         | .php                  | var_dump, print_r, die/exit, eval, error suppression                               |

## Installation

<details>
<summary><img src="https://img.shields.io/badge/VS_Code-Install%20Server-007ACC?logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PHBhdGggZD0iTTIzLjE1IDIuNTg3IDE4LjIxLjIxYTEuNDk0IDEuNDk0IDAgMCAwLTEuNzA1LjI5bC05LjQ2IDguNjMtNC4xMi0zLjEyOGEuOTk5Ljk5OSAwIDAgMC0xLjI3Ni4wNTdMLjMyNyA3LjI2MUExIDEgMCAwIDAgMCA4LjA2OGwzLjU5MiAzLjI5M0wwIDEzLjYxNmExIDEgMCAwIDAgLjMyNy44MDdsMS4zMTEgMS4zMTFhLjk5OS45OTkgMCAwIDAgMS4yNzYuMDU3bDQuMTItMy4xMjggOS40NiA4LjYzYTEuNDkyIDEuNDkyIDAgMCAwIDEuNzA0LjI5bDQuOTQyLTIuMzc3QTEuNSAxLjUgMCAwIDAgMjQgMTguMDE0VjUuOTg2YTEuNSAxLjUgMCAwIDAtLjg1LTEuMzk5ek0xOC41IDE2LjEyIDkuNDEgMTEuMzYxbDkuMDktNC43NTh6IiBmaWxsPSIjZmZmIi8+PC9zdmc+" alt="VS Code: Install Server"></summary>

**[One-Click Install](https://insiders.vscode.dev/redirect/mcp/install?name=tech-debt-mcp&config=%7B%22command%22%3A%22npx%22%2C%22args%22%3A%5B%22-y%22%2C%22tech-debt-mcp%40latest%22%5D%7D)**

**VS Code** (via Terminal):

```sh
code --add-mcp '{"name":"tech-debt-mcp","command":"npx","args":["-y","tech-debt-mcp@latest"]}'
```

</details>

<details>
<summary><img src="https://img.shields.io/badge/Cursor-Install%20Server-26251E?logo=cursor&logoColor=F7F7F4" alt="Cursor: Install Server"></summary>

**<a href="cursor://anysphere.cursor-deeplink/mcp/install?name=tech-debt-mcp&config=eyJjb21tYW5kIjoibnB4IC15IHRlY2gtZGVidC1tY3BAbGF0ZXN0In0=">One-Click Install</a>**

**Cursor** (via Terminal):

```sh
cursor --add-mcp '{"name":"tech-debt-mcp","command":"npx -y tech-debt-mcp@latest"}'
```

</details>

<details>
<summary><img src="https://img.shields.io/badge/Claude-Install%20Server-d97757?logo=Claude&logoColor=f5f5f5" alt="Claude: Install Server"></summary>

**Claude Code** (via Terminal):

```sh
claude mcp add tech-debt-mcp -- npx -y tech-debt-mcp@latest
```

**Claude Desktop** — add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "tech-debt-mcp": {
      "command": "npx",
      "args": ["-y", "tech-debt-mcp@latest"]
    }
  }
}
```

</details>

<details>
<summary><img src="https://img.shields.io/badge/Windsurf-Install%20Server-0B100F?logo=Windsurf&logoColor=f5f5f5" alt="Windsurf: Install Server"></summary>

Add to your Windsurf MCP configuration (`~/.codeium/windsurf/mcp_config.json`):

```json
{
  "mcpServers": {
    "tech-debt-mcp": {
      "command": "npx",
      "args": ["-y", "tech-debt-mcp@latest"]
    }
  }
}
```

</details>

<details>
<summary><img src="https://img.shields.io/badge/JetBrains-Install%20Server-FF0007?logo=jetbrains&logoColor=f5f5f5" alt="JetBrains: Install Server"></summary>

Via **AI Assistant** — open **Settings > Tools > AI Assistant > Model Context Protocol (MCP)**, click **+**, select **As JSON**, and paste:

```json
{
  "mcpServers": {
    "tech-debt-mcp": {
      "command": "npx",
      "args": ["-y", "tech-debt-mcp@latest"]
    }
  }
}
```

</details>

<details>
<summary><img src="https://img.shields.io/badge/Xcode-Install%20Server-147EFB?logo=xcode&logoColor=f5f5f5" alt="Xcode: Install Server"></summary>

Via **GitHub Copilot for Xcode** — open Settings > MCP tab > Edit Config (`mcp.json`):

```json
{
  "servers": {
    "tech-debt-mcp": {
      "command": "npx",
      "args": ["-y", "tech-debt-mcp@latest"]
    }
  }
}
```

</details>

### Manual Setup

Add to your MCP client config:

```json
{
  "mcpServers": {
    "tech-debt-mcp": {
      "command": "npx",
      "args": ["-y", "tech-debt-mcp@latest"]
    }
  }
}
```


## Usage

Start the MCP server:

```bash
tech-debt-mcp
```

Or for development:

```bash
npm run dev
```

## Available Tools

### `analyze_project`

Analyze an entire project for technical debt.

**Parameters:**

- `path` (required): Absolute path to the project root
- `languages` (optional): Array of languages to analyze
- `categories` (optional): Filter by debt categories
- `severity` (optional): Minimum severity level (low, medium, high, critical)
- `maxFiles` (optional): Maximum files to analyze

### `analyze_file`

Analyze a single file for technical debt.

**Parameters:**

- `path` (required): Absolute path to the file

### `get_debt_summary`

Get a quick summary of technical debt in a project.

**Parameters:**

- `path` (required): Absolute path to the project root

### `get_sqale_metrics`

Get SQALE technical debt metrics including remediation time, debt ratio, and rating.

**Parameters:**

- `path` (required): Absolute path to the project root
- `developmentTime` (optional): Estimated development time in hours (for debt ratio calculation)

**Output includes:**

- SQALE rating (A-E) with star visualization
- Total remediation time in human-readable format
- Debt ratio (if development time provided)
- Breakdown by severity (Critical, High, Medium, Low)
- Breakdown by category (code-quality, security, maintainability, etc.)

**Example:**

```bash
get_sqale_metrics --path=/path/to/project --developmentTime=2080
```

Returns:

```
# SQALE Technical Debt Metrics

**Overall Rating:** B ⭐⭐⭐⭐
**Total Remediation Time:** 4 hours 30 minutes
**Debt Ratio:** 8.5%

## Breakdown by Severity
| Severity | Time |
|----------|------|
| Critical | 30m |
| High | 1h 45m |
| Medium | 2h |
| Low | 15m |
```

### `list_supported_languages`

List all supported programming languages with their checks.

### `get_recommendations`

Get prioritized recommendations for addressing technical debt.

**Parameters:**

- `path` (required): Absolute path to the project root
- `limit` (optional): Maximum recommendations to return

### `get_issues_by_severity`

Get all issues of a specific severity level.

**Parameters:**

- `path` (required): Absolute path to the project root
- `severity` (required): low, medium, high, or critical

### `get_issues_by_category`

Get all issues of a specific category.

**Parameters:**

- `path` (required): Absolute path to the project root
- `category` (required): dependency, code-quality, architecture, documentation, testing, security, performance, or maintainability

### `add_custom_rule`

Add a custom pattern-based tech debt rule.

**Parameters:**

- `id` (required): Unique identifier for the rule
- `pattern` (required): Regex pattern to match
- `message` (required): Issue title/message
- `severity` (required): low, medium, high, or critical
- `category` (required): One of the debt categories
- `suggestion` (optional): How to fix the issue
- `languages` (optional): Apply only to specific languages
- `flags` (optional): Regex flags (g, i, m, s, etc.)

### `remove_custom_rule`

Remove a custom rule by ID.

**Parameters:**

- `id` (required): ID of the rule to remove

### `list_custom_rules`

List all active custom rules with their statistics.

### `execute_custom_rules`

Execute all custom rules against code or a file.

**Parameters:**

- `path` (optional): Path to the file to analyze
- `code` (optional): Code content to analyze directly
- `language` (optional): Programming language for filtering rules

_Note: Either `path` or `code` must be provided._

### `validate_custom_pattern`

Validate a custom pattern before adding it as a rule.

**Parameters:**

- `id` (required): Unique identifier for the rule
- `pattern` (required): Regex pattern to validate
- `message` (required): Issue title/message
- `severity` (required): low, medium, high, or critical
- `category` (required): One of the debt categories

## MCP Resources (Phase 6)

In addition to tools, Tech Debt MCP exposes passive MCP resources for reading tech debt data without triggering explicit tool calls:

### `debt://summary/{+projectPath}`

Returns a JSON summary of technical debt including health score, debt score, issue counts by severity/category, and SQALE metrics.

### `debt://issues/{+projectPath}`

Returns a filterable list of all technical debt issues.

**Query parameters:**
- `severity` — Filter by severity level (e.g., `high`)
- `category` — Filter by category (e.g., `security`)
- `limit` — Max issues to return (default: 100)

## Dependency Analysis (Phase 2)

Phase 2 adds comprehensive dependency parsing across multiple ecosystems and a new MCP tool `check_dependencies` that scans a project for package manifests and returns a structured dependency report.

Key capabilities:

- Detects package manifests for npm, pip, Maven/Gradle, Cargo, Go Modules, Composer, Bundler, NuGet, C/C++, and Swift Package Manager (Package.swift, Podfile, Cartfile)
- Separates production vs development dependencies
- Filters output by `includeDev` parameter
- Reports files that failed to parse for troubleshooting
- Offline-first design with future integration points for vulnerability databases

### `check_dependencies`

Scan a project for package manifests and return a structured dependency report.

**Parameters:**

- `path` (required): Absolute path to the project root
- `includeDev` (optional): boolean (default: true) — include dev/test dependencies

### `validate_config`

Validate a `.techdebtrc.json` configuration file for schema correctness.

**Parameters:**

- `path` (required): Absolute path to the project root directory or directly to a `.techdebtrc.json` file

### `get_vulnerability_report`

Generate an offline dependency inventory for vulnerability review. Lists all dependencies by ecosystem in a tabular format. Online CVE lookup is planned for Phase 2b.

**Parameters:**

- `path` (required): Absolute path to the project root
- `includeDev` (optional): boolean (default: false) — include dev dependencies in the report



## SQALE Metrics

Tech Debt MCP uses SQALE (Software Quality Assessment based on Lifecycle Expectations) methodology to quantify technical debt:

### Rating System (A-E Scale)

- **A**: ≤5% debt ratio (Excellent)
- **B**: 6-10% debt ratio (Good)
- **C**: 11-20% debt ratio (Fair)
- **D**: 21-50% debt ratio (Poor)
- **E**: >50% debt ratio (Critical)

### Metrics Provided

- **Remediation Time**: Estimated time to fix all issues
- **Debt Ratio**: Technical debt as percentage of development time
- **Formatted Time**: Human-readable time estimates (e.g., "2h 30m", "3d 4h")
- **Category Breakdown**: Remediation time per debt category
- **Severity Breakdown**: Remediation time per severity level

### Effort-to-Time Mapping

- **trivial**: ≤5 minutes
- **small**: 5-30 minutes
- **medium**: 30 min - 2 hours
- **large**: 2-4 hours
- **xlarge**: 4+ hours

## SwiftUI Analysis

Tech Debt MCP includes **14 specialized checks** for SwiftUI applications, detecting common anti-patterns, memory leaks, and performance issues.

### State Management Issues

- **Excessive @State Variables** - Detects views with >5 @State variables that should use a ViewModel
- **@ObservedObject Misuse** - Flags @ObservedObject with initialization (should use @StateObject)
- **Environment Value Safety** - Detects force unwrapping of @Environment values

### Memory & Lifecycle

- **Combine Circular References** - Finds missing [weak self] in Combine sinks
- **Missing Timer Cleanup** - Detects Timers without cleanup in onDisappear
- **Missing Task Cancellation** - Flags async Tasks without cancellation handling
- **Retain Cycles in Closures** - Detects self captures in onChange/onReceive without [weak self]

### Performance & View Hierarchy

- **Missing .id() Modifiers** - Detects ForEach without stable identifiers
- **Expensive View Body Calculations** - Flags reduce/sort/filter in view bodies
- **Deep View Nesting** - Warns when nesting depth exceeds 6 levels
- **GeometryReader Misuse** - Detects GeometryReader at view root

### SwiftUI Best Practices

- **AnyView Type Erasure** - Suggests using generics or @ViewBuilder instead
- **Deprecated NavigationLink** - Flags old-style NavigationLink patterns
- **Main Thread Safety** - Ensures UI updates happen on main thread

### Example SwiftUI Issues Detected

```swift
// ❌ Excessive @State - should use ViewModel
struct UserView: View {
  @State private var firstName = ""
  @State private var lastName = ""
  @State private var email = ""
  @State private var phone = ""
  @State private var address = ""
  @State private var city = ""  // 6+ @State variables!
  // ...
}

// ❌ @ObservedObject with initialization
struct ContentView: View {
  @ObservedObject var viewModel = UserViewModel()  // Should be @StateObject!
  // ...
}

// ❌ Missing Timer cleanup
struct TimerView: View {
  var body: some View {
    Text("Hello")
      .onAppear {
        Timer.scheduledTimer(...)  // Missing .onDisappear cleanup!
      }
  }
}

// ❌ Retain cycle in Combine
publisher
  .sink { value in
    self.updateUI(value)  // Missing [weak self]!
  }
```

All SwiftUI checks follow Apple's best practices and help prevent common bugs in production apps.

## Custom Rules

Define your own tech debt checks using regex patterns. Create rules in `.techdebtrc.json`:

```json
{
  "customPatterns": [
    {
      "id": "no-console-log",
      "pattern": "console\\.log",
      "severity": "low",
      "category": "code-quality",
      "message": "Remove console.log() statements",
      "suggestion": "Use proper logging library instead",
      "languages": ["javascript", "typescript"]
    },
    {
      "id": "no-eval",
      "pattern": "\\beval\\s*\\(",
      "severity": "critical",
      "category": "security",
      "message": "eval() is dangerous",
      "suggestion": "Refactor to avoid dynamic code execution",
      "flags": "g"
    }
  ]
}
```

### Pattern Options

- `id` (required): Unique identifier for the rule
- `pattern` (required): Regex pattern to match
- `message` (required): Issue title/message
- `severity` (required): low, medium, high, or critical
- `category` (required): One of the debt categories
- `suggestion` (optional): How to fix the issue
- `languages` (optional): Apply only to specific languages
- `flags` (optional): Regex flags (g, i, m, s, etc.)

### Example: Custom Rules for Your Team

```json
{
  "customPatterns": [
    {
      "id": "no-magic-numbers",
      "pattern": "=\\s*\\d{3,}",
      "severity": "medium",
      "category": "maintainability",
      "message": "Magic number detected",
      "suggestion": "Extract to named constant"
    },
    {
      "id": "forbidden-library",
      "pattern": "import.*moment.*from",
      "severity": "medium",
      "category": "dependency",
      "message": "moment.js is deprecated",
      "suggestion": "Use native Date or date-fns instead",
      "languages": ["javascript", "typescript"]
    }
  ]
}
```

## Debt Categories

- **dependency**: Outdated or vulnerable dependencies
- **code-quality**: Code smells, anti-patterns, debug statements
- **architecture**: Structural issues, coupling problems
- **documentation**: Missing or outdated documentation
- **testing**: Test coverage and quality issues
- **security**: Security vulnerabilities and risks
- **performance**: Performance anti-patterns
- **maintainability**: Code that's hard to maintain

## Configuration

Create a `.techdebtrc.json` file in your project root:

```json
{
  "ignore": ["vendor/**", "generated/**"],
  "rules": {
    "maxFileLines": 500,
    "maxFunctionLines": 50,
    "maxComplexity": 10,
    "maxNestingDepth": 4
  },
  "severity": {
    "todo-comment": "low",
    "console-log": "medium"
  },
  "ruleExclusions": {
    "debugger": ["**/src/analyzers/**"],
    "ts-ignore": ["**/src/analyzers/**"]
  }
}
```

### Rule Exclusions

Use `ruleExclusions` to suppress specific rules for files matching glob patterns. Patterns are matched against the file path using forward slashes (`/`) as separators on all platforms. Both absolute and relative paths are supported — use `**/` prefixed patterns (e.g., `**/src/analyzers/**`) for reliable matching regardless of path format. This is useful for eliminating false positives — for example, analyzer source files that contain regex patterns for detecting `debugger` or `@ts-ignore` should not be flagged by those same rules.

### Inline Suppression Comments

Suppress specific issues directly in source code using inline comments. This is useful when a particular line or block should not be flagged (e.g., pattern definitions in analyzer source files).

Both `//` and `#` comment prefixes are supported, so suppression directives work across all analyzed languages (e.g., `#` for Python/Ruby, `//` for TypeScript/JavaScript/Java/Go/etc.).

**Single-line suppression** — suppresses the immediately following line:

```typescript
// techdebt-ignore-next-line
debugger; // will not be reported

// techdebt-ignore-next-line debugger
debugger; // only the 'debugger' rule is suppressed
```

```python
# techdebt-ignore-next-line print-statement
print("debug output")  # will not be reported
```

**Block suppression** — suppresses all lines between start and end:

```typescript
// techdebt-ignore-start ts-ignore
issues.push(...this.checkPattern(filePath, content, /@ts-ignore/g, {
  title: '@ts-ignore comment found',
  description: '@ts-ignore suppresses TypeScript errors',
}));
// techdebt-ignore-end ts-ignore
```

Both forms accept an optional rule name. Without a rule name, all rules are suppressed. Blocks can be nested for multiple rules. Suppression comments must appear on their own line (not appended to code).

## Example Output

```
# Tech Debt Analysis Report

## Health Score: 72/100

### Issues by Severity
| Severity | Count |
|----------|-------|
| 🔴 Critical | 2 |
| 🟠 High | 15 |
| 🟡 Medium | 45 |
| 🟢 Low | 120 |

## Top Recommendations

1. **Address Critical Issues Immediately**
   Fix 2 critical security issues including eval() usage.

2. **Clean Up TODO/FIXME Comments**
   Found 45 TODO comments - consider creating tracked issues.
```

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Run in development
npm run dev

# Watch mode
npm run watch

# Run tests
npm test
```

## Documentation

- **[TECH_DEBT_SCAN.md](TECH_DEBT_SCAN.md)** - Self-scan results with before/after .techdebtrc.json comparison
- **[ROADMAP.md](ROADMAP.md)** - Development phases and future enhancements
- **[ARCHITECTURE.md](ARCHITECTURE.md)** - System architecture and design patterns
- **[CONTRIBUTING.md](CONTRIBUTING.md)** - Contribution guidelines
- **[CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)** - Community standards and expectations
- **[RELEASE.md](RELEASE.md)** - Release process and versioning guide
- **[CHANGELOG.md](CHANGELOG.md)** - Version history and changes

## Code Quality

**Tech Debt MCP practices what it preaches!** 🎯

### Self-Scan Results (March 2026)

- **SQALE Rating:** A ⭐⭐⭐⭐⭐ (Excellent)
- **Debt Ratio:** 4.6% (Target: <5%)
- **Total Issues:** 118 (0 critical, 12 high, 49 medium, 57 low)
- **Remediation Time:** ~96 hours
- **Health Score:** 42.4/100

> **📊 See [TECH_DEBT_SCAN.md](TECH_DEBT_SCAN.md)** for complete self-scan results. Issue count increased from 81 → 118 due to wider scan scope in v2.0.1 (more files analyzed), not regression.

### Quality Standards

We maintain high code quality through:

- **File size limits:** Max 500 lines per file
- **Complexity limits:** Max nesting depth of 4, cyclomatic complexity ≤10
- **Type safety:** No `any` types, strict TypeScript mode
- **Code review:** All PRs require review and pass automated checks
- **Self-scanning:** Regular tech debt analysis using our own tool
- **Test exclusions:** Test files excluded from production code analysis

### Configuration

Project-specific rules are defined in `.techdebtrc.json`:

```json
{
  "ignore": ["**/node_modules/**", "**/dist/**", "**/__tests__/**"],
  "rules": {
    "maxFileLines": 500,
    "maxNestingDepth": 4
  }
}
```

**Impact of Configuration:**
- Before: 101 issues, 70 hours remediation
- After: 81 issues, 60 hours remediation
- Improvement: -20 false positives, -10 hours

See [ARCHITECTURE.md](ARCHITECTURE.md#code-quality-standards) for detailed metrics and refactoring targets.

## Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines and [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) for our community standards.

## Releases

Tech Debt MCP uses automated releases via GitHub Actions:

- **Latest:** [![npm version](https://img.shields.io/npm/v/tech-debt-mcp.svg)](https://www.npmjs.com/package/tech-debt-mcp)
- **Releases:** [GitHub Releases](https://github.com/PierreJanineh/TechDebtMCP/releases)
- **Roadmap:** See [ROADMAP.md](ROADMAP.md) for planned features

## License

MIT
