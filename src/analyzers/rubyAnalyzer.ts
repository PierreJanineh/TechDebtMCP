import { TechDebtIssue, TechDebtConfig } from '../types/index.js';
import { BaseAnalyzer } from './baseAnalyzer.js';

/**
 * Ruby language-specific analyzer
 */
export class RubyAnalyzer extends BaseAnalyzer {
  constructor(config: Partial<TechDebtConfig> = {}) {
    super('ruby', config);
  }

  protected async performLanguageSpecificChecks(
    filePath: string,
    content: string
  ): Promise<TechDebtIssue[]> {
    const issues: TechDebtIssue[] = [];

    // puts statements (debug output)
    issues.push(...this.checkPattern(filePath, content, /^\s*puts\s+/gm, {
      category: 'code-quality',
      severity: 'low',
      title: 'puts statement found',
      description: 'Debug output statements should be removed from production code',
      suggestion: 'Use a proper logging library or remove the statement',
      effort: 'trivial',
      rule: 'puts-statement',
      tags: ['debug', 'cleanup'],
    }));

    // binding.pry (debugger calls)
    issues.push(...this.checkPattern(filePath, content, /binding\.pry/g, {
      category: 'code-quality',
      severity: 'high',
      title: 'binding.pry debug call found',
      description: 'Debugger calls should never be committed to production code',
      suggestion: 'Remove the binding.pry statement immediately',
      effort: 'trivial',
      rule: 'binding-pry',
      tags: ['debug', 'critical', 'cleanup'],
    }));

    // rubocop:disable comments
    issues.push(...this.checkPattern(filePath, content, /#\s*rubocop:\s*disable/g, {
      category: 'code-quality',
      severity: 'medium',
      title: 'rubocop:disable comment found',
      description: 'Disabling cop checks may hide code quality issues',
      suggestion: 'Fix the underlying issue or add a detailed comment explaining the suppression',
      effort: 'small',
      rule: 'rubocop-disable',
      tags: ['linting', 'quality'],
    }));

    // eval() usage (code execution)
    issues.push(...this.checkPattern(filePath, content, /eval\s*\(/g, {
      category: 'security',
      severity: 'critical',
      title: 'eval() usage found',
      description: 'eval() executes arbitrary code and is a major security risk',
      suggestion: 'Use safer alternatives like case statements or method dispatching',
      effort: 'large',
      rule: 'eval-usage',
      tags: ['security', 'dangerous'],
    }));

    // Global variables ($var)
    issues.push(...this.checkPattern(filePath, content, /\$\w+/g, {
      category: 'maintainability',
      severity: 'medium',
      title: 'Global variable used',
      description: 'Global variables make code harder to understand and test',
      suggestion: 'Use instance variables (@var), class variables (@@var), or constants',
      effort: 'medium',
      rule: 'global-variable',
      tags: ['design', 'testability'],
    }));

    // Class variables (@@var)
    issues.push(...this.checkPattern(filePath, content, /@@\w+/g, {
      category: 'maintainability',
      severity: 'medium',
      title: 'Class variable used',
      description: 'Class variables can be problematic in inheritance hierarchies',
      suggestion: 'Consider using class instance variables (@) or other approaches',
      effort: 'medium',
      rule: 'class-variable',
      tags: ['design', 'inheritance'],
    }));

    // rescue Exception (catching all exceptions)
    issues.push(...this.checkPattern(filePath, content, /rescue\s+Exception/g, {
      category: 'code-quality',
      severity: 'high',
      title: 'rescue Exception found',
      description: 'Catching Exception is too broad and may hide serious errors',
      suggestion: 'Catch specific exception types instead',
      effort: 'small',
      rule: 'rescue-exception',
      tags: ['error-handling', 'quality'],
    }));

    return issues;
  }
}

