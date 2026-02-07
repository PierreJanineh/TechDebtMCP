import { TechDebtIssue, TechDebtConfig } from '../types/index.js';
import { BaseAnalyzer } from './baseAnalyzer.js';

/**
 * Go language-specific analyzer
 */
export class GoAnalyzer extends BaseAnalyzer {
  constructor(config: Partial<TechDebtConfig> = {}) {
    super('go', config);
  }

  protected async performLanguageSpecificChecks(
    filePath: string,
    content: string
  ): Promise<TechDebtIssue[]> {
    const issues: TechDebtIssue[] = [];

    // Ignored error returns (e.g., _ = someFunc())
    issues.push(...this.checkPattern(filePath, content, /_\s*=\s*\w+\(/g, {
      category: 'code-quality',
      severity: 'medium',
      title: 'Ignored error return',
      description: 'Error return value is being ignored. This may hide bugs.',
      suggestion: 'Check the error return or use if err != nil to handle it properly',
      effort: 'small',
      rule: 'ignored-error',
      tags: ['error-handling', 'quality'],
    }));

    // Blank imports (e.g., import _ "pkg")
    issues.push(...this.checkPattern(filePath, content, /import\s+_\s+"[^"]+"/g, {
      category: 'code-quality',
      severity: 'low',
      title: 'Blank import',
      description: 'Importing a package only for its side effects without using it',
      suggestion: 'Add a comment explaining why the blank import is necessary',
      effort: 'small',
      rule: 'blank-import',
      tags: ['imports', 'clarity'],
    }));

    // fmt.Print, fmt.Println statements (debug output)
    issues.push(...this.checkPattern(filePath, content, /fmt\.Print(?:ln)?\s*\(/g, {
      category: 'code-quality',
      severity: 'low',
      title: 'fmt.Print statement found',
      description: 'Debug print statements should be removed in production code',
      suggestion: 'Use a proper logging library instead or remove the statement',
      effort: 'trivial',
      rule: 'fmt-print',
      tags: ['debug', 'cleanup'],
    }));

    // panic() usage
    issues.push(...this.checkPattern(filePath, content, /panic\s*\(/g, {
      category: 'code-quality',
      severity: 'high',
      title: 'panic() call found',
      description: 'panic() causes the program to crash. Use error handling instead.',
      suggestion: 'Return an error or use recover() if absolutely necessary',
      effort: 'medium',
      rule: 'panic-usage',
      tags: ['error-handling', 'reliability'],
    }));

    // init() function (implicit initialization)
    issues.push(...this.checkPattern(filePath, content, /^func\s+init\s*\(\)/gm, {
      category: 'maintainability',
      severity: 'medium',
      title: 'init() function found',
      description: 'init() functions run automatically and can be hard to debug. Prefer explicit initialization.',
      suggestion: 'Move initialization to explicit functions called during startup',
      effort: 'medium',
      rule: 'init-function',
      tags: ['initialization', 'maintainability'],
    }));

    // Global variables (e.g., var x = 5 at package level)
    issues.push(...this.checkPattern(filePath, content, /^var\s+\w+\s*=/gm, {
      category: 'maintainability',
      severity: 'medium',
      title: 'Global variable declared',
      description: 'Global variables can make code harder to understand and test',
      suggestion: 'Use function parameters or struct fields instead',
      effort: 'medium',
      rule: 'global-variable',
      tags: ['design', 'testability'],
    }));

    // nolint comments (disabling linter)
    issues.push(...this.checkPattern(filePath, content, /\/\/\s*nolint/g, {
      category: 'code-quality',
      severity: 'medium',
      title: 'nolint directive found',
      description: 'Disabling linter checks may hide potential issues',
      suggestion: 'Fix the underlying issue or add a comment explaining why the lint check must be disabled',
      effort: 'small',
      rule: 'nolint-comment',
      tags: ['linting', 'quality'],
    }));

    return issues;
  }
}

