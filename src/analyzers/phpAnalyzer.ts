import { TechDebtIssue, TechDebtConfig } from '../types/index.js';
import { BaseAnalyzer } from './baseAnalyzer.js';

/**
 * PHP language-specific analyzer
 */
export class PhpAnalyzer extends BaseAnalyzer {
  constructor(config: Partial<TechDebtConfig> = {}) {
    super('php', config);
  }

  protected async performLanguageSpecificChecks(
    filePath: string,
    content: string
  ): Promise<TechDebtIssue[]> {
    const issues: TechDebtIssue[] = [];

    // var_dump() calls
    issues.push(...this.checkPattern(filePath, content, /var_dump\s*\(/g, {
      category: 'code-quality',
      severity: 'medium',
      title: 'var_dump() found',
      description: 'var_dump() outputs debug information and should be removed from production code',
      suggestion: 'Use a proper logging library or remove the statement',
      effort: 'trivial',
      rule: 'var-dump',
      tags: ['debug', 'cleanup'],
    }));

    // print_r() calls
    issues.push(...this.checkPattern(filePath, content, /print_r\s*\(/g, {
      category: 'code-quality',
      severity: 'medium',
      title: 'print_r() found',
      description: 'print_r() outputs debug information and should be removed from production code',
      suggestion: 'Use a proper logging library or remove the statement',
      effort: 'trivial',
      rule: 'print-r',
      tags: ['debug', 'cleanup'],
    }));

    // die() and exit() calls
    issues.push(...this.checkPattern(filePath, content, /\b(?:die|exit)\s*\(/g, {
      category: 'code-quality',
      severity: 'high',
      title: 'die() or exit() found',
      description: 'Terminating execution directly makes code hard to test and control',
      suggestion: 'Use exceptions or return error codes instead',
      effort: 'medium',
      rule: 'die-exit',
      tags: ['error-handling', 'testability'],
    }));

    // eval() usage (code execution)
    issues.push(...this.checkPattern(filePath, content, /(?<![\w$])eval\s*\(/g, {
      category: 'security',
      severity: 'critical',
      title: 'eval() usage found',
      description: 'eval() executes arbitrary code and is a major security risk',
      suggestion: 'Use safer alternatives or refactor to avoid dynamic code execution',
      effort: 'large',
      rule: 'eval-usage',
      tags: ['security', 'dangerous'],
    }));

    // Error suppression operator (@)
    issues.push(...this.checkPattern(filePath, content, /(?:@\s*\$\w+|@\s*\w+\()/g, {
      category: 'code-quality',
      severity: 'medium',
      title: 'Error suppression operator (@) found',
      description: 'The @ operator hides errors and makes debugging harder',
      suggestion: 'Use proper error handling and check for errors explicitly',
      effort: 'small',
      rule: 'error-suppression',
      tags: ['error-handling', 'quality'],
    }));

    // global keyword (global variables)
    issues.push(...this.checkPattern(filePath, content, /\bglobal\s+\$\w+/g, {
      category: 'maintainability',
      severity: 'medium',
      title: 'global keyword usage',
      description: 'Global variables make code harder to understand, test, and maintain',
      suggestion: 'Use function parameters, class properties, or dependency injection instead',
      effort: 'medium',
      rule: 'global-usage',
      tags: ['design', 'testability'],
    }));

    // extract() function
    issues.push(...this.checkPattern(filePath, content, /(?<![\w$])extract\s*\(/g, {
      category: 'security',
      severity: 'high',
      title: 'extract() function found',
      description: 'extract() creates variables from array keys, which can be confusing and unsafe',
      suggestion: 'Use explicit variable assignment instead',
      effort: 'small',
      rule: 'extract-usage',
      tags: ['security', 'clarity'],
    }));

    // @phpcs:ignore comments
    issues.push(...this.checkPattern(filePath, content, /@phpcs:\s*ignore/g, {
      category: 'code-quality',
      severity: 'medium',
      title: '@phpcs:ignore comment found',
      description: 'Disabling CodeSniffer checks may hide code style issues',
      suggestion: 'Fix the underlying issue or add a detailed comment explaining the exception',
      effort: 'small',
      rule: 'phpcs-ignore',
      tags: ['linting', 'quality'],
    }));

    return issues;
  }
}
