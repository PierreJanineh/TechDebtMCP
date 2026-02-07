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
│   ├── analysisEngine.ts    # Main orchestrator
│   ├── sqaleEngine.ts       # ✅ SQALE metrics (Phase 1 - COMPLETE)
│   └── customRulesEngine.ts # ✅ Custom rules (Phase 5 - COMPLETE)
├── analyzers/
│   ├── baseAnalyzer.ts   # Abstract base class (shared logic)
│   ├── index.ts          # Factory pattern for creating analyzers
│   └── [language]Analyzer.ts # One file per language (14 total)
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

**CRITICAL: Follow Test-Driven Development (TDD) - Write Tests FIRST**

When implementing features:
1. ✅ **Write tests FIRST** (before any implementation code)
2. ✅ Create test file alongside source in `__tests__/` folder
3. ✅ Define test cases that describe the expected behavior
4. ✅ THEN implement the feature to make tests pass
5. ✅ Run tests to verify: `npm test`
6. ✅ Ensure 100% of new tests pass before committing

```bash
# Create test file FIRST
src/
├── [module]/
│   ├── [module].test.ts     # TEST FILE (write first!)
│   └── __tests__/
│       └── [module].test.ts # Tests

# THEN implement the source
├── [module]/
│   ├── [module].ts          # SOURCE CODE (write after tests)
│   └── __tests__/
│       └── [module].test.ts # Tests
```

Test requirements:
- ✅ **Write tests BEFORE implementation** (TDD principle)
- ✅ All imports must include `.js` extension
- ✅ Use descriptive test names that explain expected behavior
- ✅ Test both success cases AND edge cases
- ✅ Test error conditions and invalid inputs
- ✅ Aim for >80% code coverage minimum
- ✅ Run `npm test` after each change
- ✅ Ensure ALL tests pass (0 failures) before committing
- ✅ Do not commit code with failing tests

Example TDD Workflow:
```bash
# 1. Write tests first
touch src/myFeature/__tests__/myFeature.test.ts
# Edit test file with all test cases

# 2. Run tests (they should all FAIL initially)
npm test
# Expected: Tests fail because code doesn't exist yet

# 3. Implement just enough code to make tests pass
touch src/myFeature/myFeature.ts
# Write implementation

# 4. Run tests again
npm test
# Expected: All tests pass ✅

# 5. Refactor if needed, verify tests still pass
npm test
# Expected: All tests still pass ✅

# 6. Commit
git add .
git commit -m "feat: add myFeature with full test coverage"
```

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

### ⚠️ CRITICAL: Git Workflow Rules

**NEVER commit directly to `master` branch!**

1. ✅ **Always create a feature branch** from `develop`
2. ✅ **Branch naming:** `feature/issue-{number}-short-description`
3. ✅ **Commit to feature branch** (NOT master/main)
4. ✅ **Create PR** targeting `develop` (NOT master)
5. ✅ **After merge to develop**, only then release to master via version tag

**Workflow:**
```bash
# 1. Ensure on develop
git checkout develop
git pull origin develop

# 2. Create feature branch (from issue number)
git checkout -b feature/issue-16-add-sqale-metrics

# 3. Make changes, commit to feature branch
git add .
git commit -m "feat: add get_sqale_metrics MCP tool"

# 4. Push feature branch
git push origin feature/issue-16-add-sqale-metrics

# 5. Create PR on GitHub (target: develop)
# Do NOT target master!
```

### Standard Pull Request Steps

1. Create branch from `develop` (NOT master)
2. Make changes and write tests
3. **Update documentation** — Update README.md if:
   - Adding new features
   - Changing existing behavior
   - Adding new MCP tools
   - Adding new checks or patterns
   - Updating configuration options
4. **Verify tests pass** — Run `npm test` and check output for:
   - All `PASS` (no `FAIL`)
   - `✓` for each test (no `✕`)
   - `Test Suites: X passed, X total`
   - `Tests: Y passed, Y total`
5. **Fix any failing tests BEFORE committing** — Do not proceed if any tests fail
6. **Verify build succeeds** — Run `npm run build` with no errors
7. Create PR targeting `develop` (NOT master)
8. **Wait for Copilot review** — GitHub will automatically run Copilot code review
   - Wait 30-60 seconds for Copilot to analyze the PR
   - Check the PR page for review comments
   - Copilot will flag potential issues, improvements, and edge cases
9. **Address Copilot suggestions** — For each suggestion:
   - Read the suggestion carefully
   - Decide if it's relevant (some suggestions may not apply to your code)
   - If relevant: make the fix, commit, and push
   - If not relevant: add a comment explaining why you're skipping it
   - Re-run tests after any changes: `npm test`
   - Verify build still succeeds: `npm run build`
10. **Merge after Copilot review is complete** — Once all suggestions are addressed:
   - All tests must still pass
   - Build must still succeed
   - README must be updated if applicable
   - All Copilot suggestions must be resolved or documented
   - Use squash merge for clean git history

### Copilot Review Checklist

When Copilot review comments appear:
- [ ] Read all comments completely
- [ ] Identify which suggestions are relevant to your code
- [ ] For relevant suggestions: implement fixes and test again
- [ ] For irrelevant suggestions: add explanatory comments to PR
- [ ] Commit messages should reference which Copilot suggestions were addressed
- [ ] Run `npm test` after implementing any fixes
- [ ] Run `npm run build` after implementing any fixes
- [ ] Verify test output shows 100% pass rate

### Copilot Review Types

Copilot may suggest:
- **Code improvements** — Better patterns, cleaner syntax
- **Bug fixes** — Potential issues or edge cases
- **Type safety** — TypeScript improvements
- **Performance** — More efficient implementations
- **Documentation** — Missing comments or clarity issues
- **Testing** — Additional test cases to consider

Example response to Copilot:
```
✅ Addressed: Fixed nullish coalescing operator per suggestion
❌ Skipped: Suggestion about changing to "xl" conflicts with existing codebase types
```

## CRITICAL REQUIREMENTS

**NEVER do these:**
- ❌ Commit code with failing tests
- ❌ Commit code that doesn't build
- ❌ Push to GitHub without verifying tests pass locally
- ❌ Merge a PR without checking Copilot review
- ❌ Merge a PR with failing tests
- ❌ Merge a PR with unresolved Copilot suggestions (without comment explaining why)
- ❌ Merge a PR without updating README if features changed

**ALWAYS do these:**
- ✅ Run `npm test` BEFORE staging changes
- ✅ Run `npm run build` to verify TypeScript compiles
- ✅ Fix ALL test failures before committing
- ✅ Verify test output shows 100% pass rate
- ✅ Wait for Copilot review suggestions (30-60 seconds)
- ✅ Address all relevant Copilot suggestions before merging
- ✅ Document why you're skipping irrelevant suggestions
- ✅ Re-test after addressing Copilot suggestions
- ✅ Update README.md for new features/changes
- ✅ Read and address Copilot review suggestions
