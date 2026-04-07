# Tech Debt MCP Server

[![npm version](https://img.shields.io/npm/v/tech-debt-mcp)](https://www.npmjs.com/package/tech-debt-mcp)
[![Add to MCP](https://img.shields.io/badge/MCP-Install_Server-6f42c1)](#installation)
[![SQALE Rating](https://img.shields.io/badge/SQALE-A_(4.6%25)-brightgreen)](#code-quality)

**16 Tools** · **2 Resources** · **14 Languages** · **10 Dependency Ecosystems**

A Model Context Protocol (MCP) server for analyzing technical debt across multiple programming languages. Designed to integrate with GitHub Copilot, Claude, Cursor, and other MCP-compatible tools.

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
| JavaScript  | .js, .mjs, .cjs, .jsx | console.log, debugger, eslint-disable, usage of dynamic code execution, var usage  |
| TypeScript  | .ts, .tsx, .mts, .cts | any type, @ts-ignore, non-null assertions, type assertions                         |
| Python      | .py, .pyw, .pyi       | bare except, print statements, global usage, dynamic code execution                |
| Java        | .java                 | System.out, printStackTrace, empty catch, @SuppressWarnings                        |
| Swift       | .swift                | force unwrap (!), force cast (as!), force try, retain cycles, **SwiftUI patterns** |
| Kotlin      | .kt, .kts             | !!, lateinit abuse, @Suppress, unchecked casts                                     |
| Objective-C | .m, .mm, .h           | NSLog, retain cycles, deprecated methods, massive view controllers                 |
| C++         | .cpp, .cc, .hpp, .h   | raw pointers, C-style casts, goto, using namespace std                             |
| C           | .c, .h                | malloc without free, goto, unsafe functions, null checks                           |
| C#          | .cs                   | Console.WriteLine, async void, empty catch, dispose pattern                        |
| Go          | .go                   | ignored errors, blank imports, fmt.Print, panic, global variables                  |
| Rust        | .rs                   | unwrap, expect, unsafe, allow attributes, panic, println                           |
| Ruby        | .rb                   | puts, binding.pry, rubocop disable, dynamic code execution, global variables       |
| PHP         | .php                  | var_dump, print_r, die/exit, dynamic code execution, error suppression             |

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

For development: `npm run dev`

## Tools

| Category | Tool | Description |
|----------|------|-------------|
| **Analysis** | `analyze_project` | Analyze entire project — filter by language, category, severity, maxFiles |
| | `analyze_file` | Analyze a single file |
| | `get_debt_summary` | Quick summary with health score and issue counts |
| | `get_sqale_metrics` | SQALE rating, remediation time, debt ratio, breakdowns |
| **Filtering** | `get_recommendations` | Prioritized fix suggestions (configurable limit) |
| | `get_issues_by_severity` | Issues filtered by severity level |
| | `get_issues_by_category` | Issues filtered by debt category |
| | `list_supported_languages` | All languages with their checks |
| **Custom Rules** | `add_custom_rule` | Add regex-based tech debt rule |
| | `remove_custom_rule` | Remove a custom rule by ID |
| | `list_custom_rules` | List active rules with stats |
| | `execute_custom_rules` | Run custom rules against code or file |
| | `validate_custom_pattern` | Test a pattern before adding it |
| **Dependencies** | `check_dependencies` | Scan package manifests across 10 ecosystems |
| | `get_vulnerability_report` | Offline dependency inventory for CVE review |
| | `validate_config` | Validate `.techdebtrc.json` schema |

<details>
<summary><strong>Full parameter reference</strong></summary>

### `analyze_project`

Analyze an entire project for technical debt.

- `path` (required): Absolute path to the project root
- `languages` (optional): Array of languages to analyze
- `categories` (optional): Filter by debt categories
- `severity` (optional): Minimum severity level (low, medium, high, critical)
- `maxFiles` (optional): Maximum files to analyze

### `analyze_file`

Analyze a single file for technical debt.

- `path` (required): Absolute path to the file

### `get_debt_summary`

Get a quick summary of technical debt in a project.

- `path` (required): Absolute path to the project root

### `get_sqale_metrics`

Get SQALE technical debt metrics including remediation time, debt ratio, and rating.

- `path` (required): Absolute path to the project root
- `developmentTime` (optional): Estimated development time in hours (for debt ratio calculation)

Output includes SQALE rating (A-E) with star visualization, total remediation time, debt ratio, and breakdowns by severity and category.

### `get_recommendations`

Get prioritized recommendations for addressing technical debt.

- `path` (required): Absolute path to the project root
- `limit` (optional): Maximum recommendations to return

### `get_issues_by_severity`

Get all issues of a specific severity level.

- `path` (required): Absolute path to the project root
- `severity` (required): low, medium, high, or critical

### `get_issues_by_category`

Get all issues of a specific category.

- `path` (required): Absolute path to the project root
- `category` (required): dependency, code-quality, architecture, documentation, testing, security, performance, or maintainability

### `list_supported_languages`

List all supported programming languages with their checks. No parameters.

### `add_custom_rule`

Add a custom pattern-based tech debt rule.

- `id` (required): Unique identifier for the rule
- `pattern` (required): Regex pattern to match
- `message` (required): Issue title/message
- `severity` (required): low, medium, high, or critical
- `category` (required): One of the debt categories
- `suggestion` (optional): How to fix the issue
- `languages` (optional): Apply only to specific languages
- `flags` (optional): Regex flags for `add_custom_rule` — only `g`, `i`, `m`, `s`, `u`, and `y` are accepted; any other character causes validation to reject the rule outright

  > **Note:** At execution time, unsupported flag characters are still stripped as a defense-in-depth safeguard if a rule bypasses normal validation, and duplicate characters are de-duplicated to prevent `RegExp` construction errors. If stripping and deduplication leave no valid flags, execution defaults to `g`.

**Example custom rules:**

```json
[
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
```

### `remove_custom_rule`

Remove a custom rule by ID.

- `id` (required): ID of the rule to remove

### `list_custom_rules`

List all active custom rules with their statistics. No parameters.

### `execute_custom_rules`

Run all custom rules against code or a file.

- `path` (optional): Path to the file to analyze
- `code` (optional): Code content to analyze directly (limited to 500,000 characters)
- `language` (optional): Programming language for filtering rules

_Either `path` or `code` must be provided._

### `validate_custom_pattern`

Validate a custom pattern before adding it as a rule. Enforces the same 1,000-character pattern cap as `add_custom_rule`.

- `id` (required): Unique identifier for the rule
- `pattern` (required): Regex pattern to validate (limited to 1,000 characters)
- `message` (required): Issue title/message
- `severity` (required): low, medium, high, or critical
- `category` (required): One of the debt categories

### `check_dependencies`

Scan a project for package manifests and return a structured dependency report.

- `path` (required): Absolute path to the project root
- `includeDev` (optional): boolean (default: true) — include dev/test dependencies

Detects manifests for npm, pip, Maven/Gradle, Cargo, Go Modules, Composer, Bundler, NuGet, C/C++, and Swift Package Manager. Separates production vs development dependencies and reports files that failed to parse.

### `validate_config`

Validate a `.techdebtrc.json` configuration file for schema correctness.

- `path` (required): Absolute path to the project root directory or directly to a `.techdebtrc.json` file

### `get_vulnerability_report`

Generate an offline dependency inventory for vulnerability review. Lists all dependencies by ecosystem in a tabular format. See [ROADMAP.md](ROADMAP.md) for planned online CVE lookup.

- `path` (required): Absolute path to the project root
- `includeDev` (optional): boolean (default: false) — include dev dependencies in the report

</details>

## Resources

| URI | Description |
|-----|-------------|
| `debt://summary/{+projectPath}` | Health score, debt score, issue counts, SQALE metrics (JSON) |
| `debt://issues/{+projectPath}` | Filterable list of all tech debt issues (JSON) — supports `severity`, `category`, `limit` query params |

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
  },
  "customPatterns": [
    {
      "id": "no-console-log",
      "pattern": "console\\.log",
      "severity": "low",
      "category": "code-quality",
      "message": "Remove console.log() statements",
      "suggestion": "Use proper logging library instead",
      "languages": ["javascript", "typescript"]
    }
  ]
}
```

### Rule Exclusions

Use `ruleExclusions` to suppress specific rules for files matching glob patterns. Patterns use forward slashes (`/`) on all platforms. Use `**/` prefixed patterns (e.g., `**/src/analyzers/**`) for reliable matching regardless of path format.

### Inline Suppression

Suppress specific issues directly in source code. Both `//` and `#` comment prefixes are supported across all languages.

**Single-line** — suppresses the next line:

```typescript
// techdebt-ignore-next-line debugger
debugger; // only the 'debugger' rule is suppressed
```

```python
# techdebt-ignore-next-line print-statement
print("debug output")  # will not be reported
```

**Block** — suppresses all lines between start and end:

```typescript
// techdebt-ignore-start ts-ignore
issues.push(...this.checkPattern(filePath, content, /@ts-ignore/g, { ... }));
// techdebt-ignore-end ts-ignore
```

Without a rule name, all rules are suppressed. Blocks can be nested. Suppression comments must appear on their own line.

## SQALE Metrics

Tech Debt MCP uses [SQALE](https://www.sqale.org/) methodology to quantify technical debt:

| Rating | Debt Ratio | Quality |
|--------|-----------|---------|
| **A** | ≤5% | Excellent |
| **B** | 6-10% | Good |
| **C** | 11-20% | Fair |
| **D** | 21-50% | Poor |
| **E** | >50% | Critical |

**Effort-to-time mapping:** trivial (≤5m) · small (5-30m) · medium (30m-2h) · large (2-4h) · xlarge (4h+)

## SwiftUI Analysis

14 specialized checks for SwiftUI apps covering **state management** (excessive @State, @ObservedObject misuse, environment value safety), **memory & lifecycle** (Combine retain cycles, timer cleanup, task cancellation, closure retain cycles), **performance** (missing .id() modifiers, expensive body calculations, deep nesting, GeometryReader misuse), and **best practices** (AnyView type erasure, deprecated NavigationLink, main thread safety).

<details>
<summary><strong>View all SwiftUI checks with examples</strong></summary>

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

### Example Issues Detected

```swift
// Excessive @State - should use ViewModel
struct UserView: View {
  @State private var firstName = ""
  @State private var lastName = ""
  @State private var email = ""
  @State private var phone = ""
  @State private var address = ""
  @State private var city = ""  // 6+ @State variables!
}

// @ObservedObject with initialization
struct ContentView: View {
  @ObservedObject var viewModel = UserViewModel()  // Should be @StateObject!
}

// Missing Timer cleanup
struct TimerView: View {
  var body: some View {
    Text("Hello")
      .onAppear {
        Timer.scheduledTimer(...)  // Missing .onDisappear cleanup!
      }
  }
}

// Retain cycle in Combine
publisher
  .sink { value in
    self.updateUI(value)  // Missing [weak self]!
  }
```

</details>

## Example Output

```
# Tech Debt Analysis Report

## Health Score: 72/100

### Issues by Severity
| Severity | Count |
|----------|-------|
| Critical | 2 |
| High | 15 |
| Medium | 45 |
| Low | 120 |

## Top Recommendations

1. **Address Critical Issues Immediately**
   Fix 2 critical security issues.

2. **Clean Up TODO/FIXME Comments**
   Found 45 TODO comments - consider creating tracked issues.
```

## Code Quality

Tech Debt MCP practices what it preaches — built with AI-assisted vibe coding, it maintains an A rating by regularly scanning itself.

### Self-Scan Results (March 2026)

- **SQALE Rating:** A (Excellent)
- **Debt Ratio:** 4.6% (Target: <5%)
- **Total Issues:** 118 (0 critical, 12 high, 49 medium, 57 low)
- **Remediation Time:** ~96 hours
- **Health Score:** 42.4/100

> Issue count increased from 81 to 118 due to wider scan scope in v2.0.1 (more files analyzed), not regression. See [TECH_DEBT_SCAN.md](TECH_DEBT_SCAN.md) for full results.

## Development

```bash
npm install       # Install dependencies
npm run build     # Compile TypeScript
npm run dev       # Run with ts-node
npm run watch     # Watch mode
npm test          # Run tests
```

## Documentation

- **[ARCHITECTURE.md](ARCHITECTURE.md)** - System architecture and design patterns
- **[ROADMAP.md](ROADMAP.md)** - Development phases and future enhancements
- **[CONTRIBUTING.md](CONTRIBUTING.md)** - Contribution guidelines
- **[CHANGELOG.md](CHANGELOG.md)** - Version history and changes
- **[RELEASE.md](RELEASE.md)** - Release process and versioning guide
- **[TECH_DEBT_SCAN.md](TECH_DEBT_SCAN.md)** - Self-scan results with before/after comparison
- **[CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)** - Community standards

## Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines and [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) for our community standards.

## Releases

- **Latest:** [![npm version](https://img.shields.io/npm/v/tech-debt-mcp.svg)](https://www.npmjs.com/package/tech-debt-mcp)
- **Releases:** [GitHub Releases](https://github.com/PierreJanineh/TechDebtMCP/releases)
- **Roadmap:** See [ROADMAP.md](ROADMAP.md) for planned features

## License

MIT
