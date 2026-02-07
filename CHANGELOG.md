# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-02-07

### Added

#### Phase 0: Language Support
- Support for 14 programming languages: JavaScript, TypeScript, Python, Java, Swift, Kotlin, Objective-C, C++, C, C#, Go, Rust, Ruby, PHP
- BaseAnalyzer with factory pattern for extensibility
- Language-specific tech debt detection patterns
- Comprehensive test coverage for all analyzers

#### Phase 1: SQALE Metrics ✅
- SQALE Engine with A-E rating system
- Remediation time calculations
- Debt ratio metrics (percentage of development time)
- Category and severity breakdowns
- Human-readable time formatting
- **NEW:** `get_sqale_metrics` MCP tool for dedicated SQALE reporting
- **NEW:** SQALE metrics integrated into all analysis reports

#### Phase 5: Custom Rules
- CustomRulesEngine for pattern-based checks
- 5 MCP tools for rule management:
  - `add_custom_rule` - Add custom pattern rules
  - `remove_custom_rule` - Remove rules by ID
  - `list_custom_rules` - Show all active rules
  - `execute_custom_rules` - Run rules against code
  - `validate_custom_pattern` - Validate patterns
- Regex support with configurable flags
- Language-specific rule filtering
- Multiple matches per line
- Cross-platform line ending support (\r\n and \n)

#### MCP Tools (14 total)
1. `analyze_project` - Full project technical debt analysis
2. `analyze_file` - Single file analysis
3. `get_debt_summary` - Quick debt summary
4. `get_sqale_metrics` - SQALE metrics with rating and remediation time
5. `list_supported_languages` - Show supported languages
6. `get_recommendations` - Prioritized suggestions
7. `get_issues_by_severity` - Filter issues by severity
8. `get_issues_by_category` - Filter issues by category
9. `add_custom_rule` - Add custom pattern rules
10. `remove_custom_rule` - Remove custom rules
11. `list_custom_rules` - List all custom rules
12. `execute_custom_rules` - Execute custom rules
13. `validate_custom_pattern` - Validate custom patterns

### Documentation
- Comprehensive README with installation and usage instructions
- ARCHITECTURE.md describing system design and patterns
- CONTRIBUTING.md with contribution guidelines
- AI agent instructions for Copilot
- Full API documentation for all MCP tools

### Testing
- 72 comprehensive tests across 6 test suites
- 100% test pass rate
- Tests for all language analyzers
- Tests for SQALE engine
- Tests for custom rules engine

[1.0.0]: https://github.com/PierreJanineh/TechDebtMCP/releases/tag/v1.0.0

