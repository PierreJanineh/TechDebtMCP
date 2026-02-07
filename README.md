# Tech Debt MCP Server

A Model Context Protocol (MCP) server for analyzing technical debt across multiple programming languages. Designed to integrate with GitHub Copilot and other MCP-compatible tools.

## Features

- **Multi-language support**: JavaScript, TypeScript, Python, Java, Swift, Kotlin, Objective-C, C++, C, C#, Go, Rust, Ruby, PHP
- **Comprehensive analysis**: Detects various types of tech debt including code quality issues, security vulnerabilities, and maintainability problems
- **SQALE Metrics**: Calculate technical debt with SQALE rating system (A-E scale)
- **SwiftUI Analysis**: Specialized checks for SwiftUI patterns, state management, memory leaks, view nesting, and concurrency issues
- **Custom Rules**: Define your own pattern-based checks with regex support
- **Actionable recommendations**: Provides prioritized suggestions for addressing technical debt
- **Flexible filtering**: Filter results by severity, category, or language

## Supported Languages

| Language | Extensions | Key Checks |
|----------|------------|------------|
| JavaScript | .js, .mjs, .cjs, .jsx | console.log, debugger, eslint-disable, eval, var usage |
| TypeScript | .ts, .tsx, .mts, .cts | any type, @ts-ignore, non-null assertions, type assertions |
| Python | .py, .pyw, .pyi | bare except, print statements, global usage, eval/exec |
| Java | .java | System.out, printStackTrace, empty catch, @SuppressWarnings |
| Swift | .swift | force unwrap (!), force cast (as!), force try, retain cycles, **SwiftUI patterns** |
| Kotlin | .kt, .kts | !!, lateinit abuse, @Suppress, unchecked casts |
| Objective-C | .m, .mm, .h | NSLog, retain cycles, deprecated methods, massive view controllers |
| C++ | .cpp, .cc, .hpp, .h | raw pointers, C-style casts, goto, using namespace std |
| C | .c, .h | malloc without free, goto, unsafe functions, null checks |
| C# | .cs | Console.WriteLine, async void, empty catch, dispose pattern |
| Go | .go | ignored errors, blank imports, fmt.Print, panic, global variables |
| Rust | .rs | unwrap, expect, unsafe, allow attributes, panic, println |
| Ruby | .rb | puts, binding.pry, rubocop disable, eval, global variables |
| PHP | .php | var_dump, print_r, die/exit, eval, error suppression |

## Installation

### Option 1: From npm (Recommended)

```bash
npm install -g tech-debt-mcp
```

### Option 2: From GitHub Packages

Create or update `~/.npmrc`:
```
@PierreJanineh:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=YOUR_GITHUB_TOKEN
```

Then install:
```bash
npm install -g @PierreJanineh/tech-debt-mcp
```

For detailed setup instructions, see [GITHUB_PACKAGES.md](./GITHUB_PACKAGES.md).

### Option 3: Build from Source

```bash
git clone https://github.com/PierreJanineh/TechDebtMCP.git
cd TechDebtMCP
npm install
npm run build
npm link  # Makes available globally as 'tech-debt-mcp'
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

## Usage with GitHub Copilot

After installing globally, add to your MCP settings configuration:

```json
{
  "mcpServers": {
    "tech-debt": {
      "command": "tech-debt-mcp",
      "args": []
    }
  }
}
```

The MCP server will start on stdio and be ready to communicate with GitHub Copilot or other MCP clients.

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

*Note: Either `path` or `code` must be provided.*

### `validate_custom_pattern`
Validate a custom pattern before adding it as a rule.

**Parameters:**
- `id` (required): Unique identifier for the rule
- `pattern` (required): Regex pattern to validate
- `message` (required): Issue title/message
- `severity` (required): low, medium, high, or critical
- `category` (required): One of the debt categories

## SQALE Metrics

TechDebt MCP uses SQALE (Software Quality Assessment based on Lifecycle Expectations) methodology to quantify technical debt:

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
  }
}
```

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

- **[ROADMAP.md](ROADMAP.md)** - Development phases and future enhancements
- **[ARCHITECTURE.md](ARCHITECTURE.md)** - System architecture and design patterns
- **[CONTRIBUTING.md](CONTRIBUTING.md)** - Contribution guidelines
- **[RELEASE.md](RELEASE.md)** - Release process and versioning guide
- **[CHANGELOG.md](CHANGELOG.md)** - Version history and changes

## Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## Releases

Tech Debt MCP uses automated releases via GitHub Actions:
- **Latest:** [![npm version](https://img.shields.io/npm/v/tech-debt-mcp.svg)](https://www.npmjs.com/package/tech-debt-mcp)
- **Releases:** [GitHub Releases](https://github.com/PierreJanineh/TechDebtMCP/releases)
- **Roadmap:** See [ROADMAP.md](ROADMAP.md) for planned features

## License

MIT
