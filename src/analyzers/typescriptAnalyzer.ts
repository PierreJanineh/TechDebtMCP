import { TechDebtIssue, TechDebtConfig } from '../types/index.js';
import { BaseAnalyzer } from './baseAnalyzer.js';

/**
 * TypeScript-specific analyzer
 */
export class TypeScriptAnalyzer extends BaseAnalyzer {
  constructor(config: TechDebtConfig = {}) {
    super('typescript', config);
  }

  protected async performLanguageSpecificChecks(
    filePath: string,
    content: string
  ): Promise<TechDebtIssue[]> {
    const issues: TechDebtIssue[] = [];

    // 'any' type usage
    issues.push(...this.checkPattern(filePath, content, /:\s*any\b/g, {
      category: 'code-quality',
      severity: 'medium',
      title: 'any type usage',
      description: 'Using "any" defeats the purpose of TypeScript type checking',
      suggestion: 'Replace with a proper type definition or use "unknown"',
      effort: 'small',
      rule: 'any-type',
      tags: ['typing', 'type-safety'],
    }));

    // @ts-ignore comments
    issues.push(...this.checkPattern(filePath, content, /@ts-ignore/g, {
      category: 'code-quality',
      severity: 'high',
      title: '@ts-ignore comment found',
      description: '@ts-ignore suppresses TypeScript errors which may hide bugs',
      suggestion: 'Fix the underlying type error or use @ts-expect-error with explanation',
      effort: 'small',
      rule: 'ts-ignore',
      tags: ['typing', 'suppression'],
    }));

    // Check for @ts-expect-error comments without explanation
    issues.push(...this.checkPattern(filePath, content, /@ts-expect-error(?!\s+\S)/g, {
      category: 'code-quality',
      severity: 'medium',
      title: '@ts-expect-error without explanation',
      description: '@ts-expect-error should have an explanation for why it\'s needed',
      suggestion: 'Add a comment explaining why this error suppression is necessary',
      effort: 'trivial',
      rule: 'ts-expect-error',
      tags: ['typing', 'documentation'],
    }));

    // Non-null assertion (!)
    issues.push(...this.checkNonNullAssertions(filePath, content));

    // Type assertions (as Type)
    issues.push(...this.checkPattern(filePath, content, /\s+as\s+\w+(?:\[\])?(?:\s*[,;)\]}]|$)/g, {
      category: 'code-quality',
      severity: 'low',
      title: 'Type assertion used',
      description: 'Type assertions can bypass TypeScript\'s type checking',
      suggestion: 'Consider using type guards or proper type narrowing',
      effort: 'small',
      rule: 'type-assertion',
      tags: ['typing', 'type-safety'],
    }));

    // Console statements (inherited behavior)
    issues.push(...this.checkPattern(filePath, content, /console\.(log|debug|info|warn|error)\s*\(/g, {
      category: 'code-quality',
      severity: 'low',
      title: 'Console statement found',
      description: 'Console statements should be removed in production code',
      suggestion: 'Remove console statement or use a proper logging library',
      effort: 'trivial',
      rule: 'console-log',
      tags: ['debug', 'cleanup'],
    }));

    // Debugger statements
    issues.push(...this.checkPattern(filePath, content, /\bdebugger\b/g, {
      category: 'code-quality',
      severity: 'high',
      title: 'Debugger statement found',
      description: 'Debugger statements should never be committed',
      suggestion: 'Remove the debugger statement',
      effort: 'trivial',
      rule: 'debugger',
      tags: ['debug', 'critical'],
    }));

    // ESLint disable comments
    issues.push(...this.checkPattern(filePath, content, /\/[/*]\s*eslint-disable(?!-next-line)/g, {
      category: 'code-quality',
      severity: 'medium',
      title: 'ESLint disabled for file/block',
      description: 'Disabling ESLint for entire files or blocks may hide issues',
      suggestion: 'Fix the underlying issues or use eslint-disable-next-line',
      effort: 'small',
      rule: 'eslint-disable',
      tags: ['linting'],
    }));

    // Explicit 'any' in generics
    issues.push(...this.checkPattern(filePath, content, /<any>/g, {
      category: 'code-quality',
      severity: 'medium',
      title: 'Generic with any type',
      description: 'Using <any> in generics defeats type safety',
      suggestion: 'Use a proper type parameter or <unknown>',
      effort: 'small',
      rule: 'generic-any',
      tags: ['typing', 'generics'],
    }));

    return issues;
  }

  private checkNonNullAssertions(filePath: string, content: string): TechDebtIssue[] {
    const issues: TechDebtIssue[] = [];
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // Match non-null assertions but exclude !== and !=
      const matches = line.match(/\w+!(?:\.|\[|;|,|\)|\s|$)/g);
      if (matches) {
        // Filter out false positives
        const filtered = matches.filter(m => !m.startsWith('!'));
        if (filtered.length > 0) {
          issues.push({
            id: `non-null-assertion-${i + 1}`,
            category: 'code-quality',
            severity: 'medium',
            file: filePath,
            line: i + 1,
            title: 'Non-null assertion operator used',
            description: 'The ! operator bypasses TypeScript\'s null checks',
            suggestion: 'Use optional chaining (?.) or proper null checks',
            effort: 'small',
            language: this.language,
            rule: 'non-null-assertion',
            tags: ['typing', 'null-safety'],
          });
        }
      }
    }

    return issues;
  }
}
