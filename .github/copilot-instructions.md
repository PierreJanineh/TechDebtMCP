# AI Agent Instructions for Tech Debt MCP

## Project Overview

Tech Debt MCP is a Model Context Protocol server for analyzing technical debt across **14 programming languages**. It integrates with GitHub Copilot and other MCP-compatible clients.
## Architecture

```
src/
├── index.ts              # MCP Server entry point and tool routing
├── types/
│   └── index.ts          # All TypeScript interfaces (single source of truth)
├── config/
│   └── languages.ts      # Language configurations (extensible)
├── core/
│   └── analysisEngine.ts # Main orchestrator
├── analyzers/
│   ├── baseAnalyzer.ts   # Abstract base class (shared logic)
│   ├── index.ts          # Factory pattern for creating analyzers
│   └── [language]Analyzer.ts # One file per language
└── utils/
    └── fileUtils.ts      # File system helpers
```

## Key Principles

1. **Single Responsibility** — Each file/class does one thing
2. **Factory Pattern** — Use `createAnalyzer()` for language analyzers
3. **Base Class Inheritance** — Common logic in `BaseAnalyzer`, language-specific in subclasses
4. **Configuration-Driven** — Languages, rules, and thresholds in config files
5. **Types First** — All interfaces in `src/types/index.ts`
6. **Offline-First** — No external API calls by default

## Coding Standards

- TypeScript strict mode enabled
- Use `async/await`, no callbacks
- All functions must have JSDoc comments
- No `any` types (use `unknown` if absolutely needed)
- Prefer `const` over `let`
- Use ES modules with `.js` extensions in imports (required for `module: NodeNext` / `moduleResolution: NodeNext` in tsconfig.json)

## Adding a New Language Analyzer

1. Create `src/analyzers/[language]Analyzer.ts`
2. Extend `BaseAnalyzer`:
   ```typescript
   export class [Language]Analyzer extends BaseAnalyzer {
     constructor(config: Partial<TechDebtConfig> = {}) {
       super('[language]', config);
     }

     protected async performLanguageSpecificChecks(
       filePath: string,
       content: string
     ): Promise<TechDebtIssue[]> {
       const issues: TechDebtIssue[] = [];
       // Add language-specific checks using this.checkPattern()
       return issues;
     }
   }
   ```
3. Add to factory in `src/analyzers/index.ts`:
   ```typescript
   import { [Language]Analyzer } from './[language]Analyzer.js';
   // In createAnalyzer() switch:
   case '[language]':
     return new [Language]Analyzer(config);
   ```
4. Add config in `src/config/languages.ts` (if it does not exist)
5. Add type to `SupportedLanguage` in `src/types/index.ts` (if it does not exist)

## Adding a New MCP Tool

1. Add tool definition in `ListToolsRequestSchema` handler in `src/index.ts`:
   ```typescript
   {
     name: 'tool_name',
     description: 'What the tool does',
     inputSchema: {
       type: 'object',
       properties: { /* ... */ },
       required: ['param1'],
     },
   }
   ```
2. Add case in `CallToolRequestSchema` switch:
   ```typescript
   case 'tool_name':
     return await this.handleToolName(args);
   ```
3. Create handler method:
   ```typescript
   private async handleToolName(args: Record<string, unknown>): Promise<{ content: Array<{ type: string; text: string }> }> {
     // Implementation
   }
   ```

## Using BaseAnalyzer's checkPattern Helper

```typescript
// In performLanguageSpecificChecks():
issues.push(...this.checkPattern(filePath, content, /pattern/g, {
  category: 'code-quality',
  severity: 'medium',
  title: 'Issue title',
  description: 'What the issue is',
  suggestion: 'How to fix it',
  effort: 'small',
  rule: 'rule-name',
  tags: ['tag1', 'tag2'],
}));
```

## Severity Levels

- `critical` — Security vulnerabilities, crashes, data loss
- `high` — Bugs, significant code smells
- `medium` — Code quality issues, minor smells
- `low` — Style issues, minor improvements

## Effort Levels

- `trivial` — < 5 minutes
- `small` — 5-30 minutes
- `medium` — 30 min - 2 hours
- `large` — 2-4 hours
- `xlarge` — 4+ hours

## Debt Categories

- `dependency` — Outdated or vulnerable dependencies
- `code-quality` — Code smells, anti-patterns, debug statements
- `architecture` — Structural issues, coupling problems
- `documentation` — Missing or outdated documentation
- `testing` — Test coverage and quality issues
- `security` — Security vulnerabilities and risks
- `performance` — Performance anti-patterns
- `maintainability` — Code that's hard to maintain

## Testing

- Test files go in `__tests__/` folders next to source
- Naming: `[filename].test.ts`
- Run tests: `npm test`
- **CRITICAL: ALWAYS verify tests pass before committing**

### Testing Workflow (REQUIRED)

Before every commit, follow this sequence:

```bash
# Step 1: Run all tests
npm test

# Expected output:
# PASS src/analyzers/__tests__/[name].test.ts
# Test Suites: X passed, X total
# Tests:       Y passed, Y total
# Snapshots:   0 total
```

Verify in output:
- ✅ All test suites show `PASS` (not `FAIL`)
- ✅ All tests show `✓` checkmarks (not `✕` crosses)
- ✅ `Test Suites: X passed, X total` (ALL must pass)
- ✅ `Tests: Y passed, Y total` (ALL must pass)
- ✅ No error messages in output

```bash
# Step 2: Verify build
npm run build

# Should show no TypeScript errors (warnings OK)
```

### Test Failure Protocol

If ANY test fails:
1. ❌ DO NOT commit
2. ❌ DO NOT push to GitHub
3. Read the error message and identify the failing test
4. Fix the code OR fix the test
5. Run `npm test` again
6. Repeat steps 4-5 until all tests pass
7. ONLY then proceed with commit

### Writing New Tests

When implementing features:
```bash
# Create test file alongside source
src/
├── [module]/
│   ├── [module].ts          # Source code
│   └── __tests__/
│       └── [module].test.ts # Tests
```

Test requirements:
- ✅ Write test FIRST or alongside implementation
- ✅ All imports must include `.js` extension
- ✅ Use descriptive test names
- ✅ Test both success and edge cases
- ✅ Run tests: `npm test`
- ✅ Ensure 100% of new tests pass before staging

## Commit Convention

Use conventional commits:
- `feat:` — New feature
- `fix:` — Bug fix
- `docs:` — Documentation only
- `refactor:` — Code change that neither fixes a bug nor adds a feature
- `test:` — Adding or updating tests
- `chore:` — Maintenance tasks

## Branch Naming

- Feature branches: `feature/issue-{number}-short-description`
- Bug fixes: `fix/issue-{number}-short-description`
- Documentation: `docs/issue-{number}-short-description`

## Pull Request Workflow

1. Create branch from `develop`
2. Make changes and write tests
3. **Verify tests pass** — Run `npm test` and check output for:
   - All `PASS` (no `FAIL`)
   - `✓` for each test (no `✕`)
   - `Test Suites: X passed, X total`
   - `Tests: Y passed, Y total`
4. **Fix any failing tests BEFORE committing** — Do not proceed if any tests fail
5. **Verify build succeeds** — Run `npm run build` with no errors
6. Create PR targeting `develop`
7. **Check Copilot review suggestions** — Review all automated suggestions and address them before merging
8. Merge after review

## CRITICAL REQUIREMENTS

**NEVER do these:**
- ❌ Commit code with failing tests
- ❌ Commit code that doesn't build
- ❌ Push to GitHub without verifying tests pass locally
- ❌ Merge a PR without checking Copilot review
- ❌ Merge a PR with failing tests

**ALWAYS do these:**
- ✅ Run `npm test` BEFORE staging changes
- ✅ Run `npm run build` to verify TypeScript compiles
- ✅ Fix ALL test failures before committing
- ✅ Verify test output shows 100% pass rate
- ✅ Read and address Copilot review suggestions
