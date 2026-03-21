import { TechDebtIssue, TechDebtConfig } from '../types/index.js';
import { BaseAnalyzer } from './baseAnalyzer.js';

/**
 * Rust language-specific analyzer
 */
export class RustAnalyzer extends BaseAnalyzer {
  constructor(config: Partial<TechDebtConfig> = {}) {
    super('rust', config);
  }

  protected async performLanguageSpecificChecks(
    filePath: string,
    content: string
  ): Promise<TechDebtIssue[]> {
    const issues: TechDebtIssue[] = [];

    // .unwrap() calls
    issues.push(...this.checkPattern(filePath, content, /\.unwrap\s*\(\)/g, {
      category: 'code-quality',
      severity: 'high',
      title: 'unwrap() call found',
      description: 'unwrap() will panic if the value is None/Err. This can crash the program.',
      suggestion: 'Use match, if let, or error propagation (?) instead',
      effort: 'small',
      rule: 'unwrap-usage',
      tags: ['error-handling', 'reliability'],
    }));

    // .expect() calls
    issues.push(...this.checkPattern(filePath, content, /\.expect\s*\([^)]*\)/g, {
      category: 'code-quality',
      severity: 'medium',
      title: 'expect() call found',
      description: 'expect() will panic if the value is None/Err, similar to unwrap()',
      suggestion: 'Use proper error handling with ? or match statements',
      effort: 'small',
      rule: 'expect-usage',
      tags: ['error-handling', 'reliability'],
    }));

    // unsafe blocks
    issues.push(...this.checkPattern(filePath, content, /unsafe\s*\{/g, {
      category: 'security',
      severity: 'high',
      title: 'unsafe block found',
      description: 'unsafe code bypasses Rust safety checks and can introduce memory bugs',
      suggestion: 'Minimize unsafe code; ensure it\'s well-documented and thoroughly reviewed',
      effort: 'large',
      rule: 'unsafe-block',
      tags: ['safety', 'security'],
    }));

    // #[allow(clippy::...)] attributes (check first to avoid double reporting)
    issues.push(...this.checkPattern(filePath, content, /#\[allow\(clippy::[^)]+\)\]/g, {
      category: 'code-quality',
      severity: 'medium',
      title: 'clippy lint suppression found',
      description: 'Suppressing clippy lints may hide code quality issues',
      suggestion: 'Address the lint warning or document why it must be suppressed',
      effort: 'small',
      rule: 'clippy-allow',
      tags: ['linting', 'quality'],
    }));

    // #[allow(...)] attributes (excluding clippy to avoid double reporting)
    issues.push(...this.checkPattern(filePath, content, /#\[allow\s*\((?!clippy::)[^)]+\)\]/g, {
      category: 'code-quality',
      severity: 'medium',
      title: 'allow attribute found',
      description: 'Suppressing compiler warnings may hide potential issues',
      suggestion: 'Fix the underlying issue or add a detailed comment explaining the suppression',
      effort: 'small',
      rule: 'allow-attribute',
      tags: ['warnings', 'quality'],
    }));

    // techdebt-ignore-start non-null-assertion
    // panic! macro
    issues.push(...this.checkPattern(filePath, content, /panic!\s*\(/g, {
      category: 'code-quality',
      severity: 'high',
      title: 'panic! macro found',
      description: 'panic!() will crash the program. Use proper error handling instead.',
      suggestion: 'Return a Result or use Option with proper error handling',
      effort: 'medium',
      rule: 'panic-macro',
      tags: ['error-handling', 'reliability'],
    }));

    // println! macro (debug output)
    issues.push(...this.checkPattern(filePath, content, /println!\s*\(/g, {
      category: 'code-quality',
      severity: 'low',
      title: 'println! macro found',
      description: 'Debug output should be removed from production code',
      suggestion: 'Use a proper logging library or remove the statement',
      effort: 'trivial',
      rule: 'println-macro',
      tags: ['debug', 'cleanup'],
    }));

    // dbg! macro
    issues.push(...this.checkPattern(filePath, content, /dbg!\s*\(/g, {
      category: 'code-quality',
      severity: 'medium',
      title: 'dbg! macro found',
      description: 'dbg! is a debugging macro that should not be in production code',
      suggestion: 'Remove the dbg! macro or use a proper logging library',
      effort: 'trivial',
      rule: 'dbg-macro',
      tags: ['debug', 'cleanup'],
    }));

    // todo! macro
    issues.push(...this.checkPattern(filePath, content, /todo!\s*\(/g, {
      category: 'code-quality',
      severity: 'high',
      title: 'todo! macro found',
      description: 'todo!() will panic when executed. This indicates incomplete code.',
      suggestion: 'Implement the functionality or use a proper error handling approach',
      effort: 'medium',
      rule: 'todo-macro',
      tags: ['incomplete-code', 'reliability'],
    }));

    // unimplemented! macro
    issues.push(...this.checkPattern(filePath, content, /unimplemented!\s*\(/g, {
      category: 'code-quality',
      severity: 'high',
      title: 'unimplemented! macro found',
      description: 'unimplemented!() will panic when executed. This indicates incomplete code.',
      suggestion: 'Implement the functionality or handle the case appropriately',
      effort: 'medium',
      rule: 'unimplemented-macro',
      tags: ['incomplete-code', 'reliability'],
    }));
    // techdebt-ignore-end non-null-assertion

    return issues;
  }
}

