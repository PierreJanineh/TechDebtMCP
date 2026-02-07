# Tech Debt MCP Server

A Model Context Protocol (MCP) server for analyzing technical debt across multiple programming languages. Designed to integrate with GitHub Copilot and other MCP-compatible tools.

## Features

- **Multi-language support**: JavaScript, TypeScript, Python, Java, Swift, Kotlin, Objective-C, C++, C, C#, Go, Rust, Ruby, PHP
- **Comprehensive analysis**: Detects various types of tech debt including code quality issues, security vulnerabilities, and maintainability problems
- **Actionable recommendations**: Provides prioritized suggestions for addressing technical debt
- **Flexible filtering**: Filter results by severity, category, or language

## Supported Languages

| Language | Extensions | Key Checks |
|----------|------------|------------|
| JavaScript | .js, .mjs, .cjs, .jsx | console.log, debugger, eslint-disable, eval, var usage |
| TypeScript | .ts, .tsx, .mts, .cts | any type, @ts-ignore, non-null assertions, type assertions |
| Python | .py, .pyw, .pyi | bare except, print statements, global usage, eval/exec |
| Java | .java | System.out, printStackTrace, empty catch, @SuppressWarnings |
| Swift | .swift | force unwrap (!), force cast (as!), force try, retain cycles |
| Kotlin | .kt, .kts | !!, lateinit abuse, @Suppress, unchecked casts |
| Objective-C | .m, .mm, .h | NSLog, retain cycles, deprecated methods, massive view controllers |
| C++ | .cpp, .cc, .hpp, .h | raw pointers, C-style casts, goto, using namespace std |
| C | .c, .h | malloc without free, goto, unsafe functions, null checks |
| C# | .cs | Console.WriteLine, async void, empty catch, dispose pattern |

## Installation

```bash
npm install
npm run build
```

## Usage with GitHub Copilot

Add to your MCP settings:

```json
{
  "mcpServers": {
    "tech-debt": {
      "command": "node",
      "args": ["/path/to/TechDebtMCP/dist/index.js"]
    }
  }
}
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
```

## License

MIT
