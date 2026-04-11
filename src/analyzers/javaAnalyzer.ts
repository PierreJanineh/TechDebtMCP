import { TechDebtIssue, TechDebtConfig } from '../types/index.js';
import { BaseAnalyzer } from './baseAnalyzer.js';

/**
 * Java-specific analyzer
 */
export class JavaAnalyzer extends BaseAnalyzer {
  constructor(config: TechDebtConfig = {}) {
    super('java', config);
  }

  protected async performLanguageSpecificChecks(
    filePath: string,
    content: string
  ): Promise<TechDebtIssue[]> {
    const issues: TechDebtIssue[] = [];

    // System.out.println
    issues.push(...this.checkPattern(filePath, content, /System\.out\.print(ln)?\s*\(/g, {
      category: 'code-quality',
      severity: 'low',
      title: 'System.out.print usage',
      description: 'System.out should be replaced with proper logging',
      suggestion: 'Use a logging framework like SLF4J or Log4j',
      effort: 'trivial',
      rule: 'system-out',
      tags: ['debug', 'cleanup'],
    }));

    // System.err.println
    issues.push(...this.checkPattern(filePath, content, /System\.err\.print(ln)?\s*\(/g, {
      category: 'code-quality',
      severity: 'low',
      title: 'System.err.print usage',
      description: 'System.err should be replaced with proper logging',
      suggestion: 'Use a logging framework with appropriate log levels',
      effort: 'trivial',
      rule: 'system-err',
      tags: ['debug', 'cleanup'],
    }));

    // printStackTrace
    issues.push(...this.checkPattern(filePath, content, /\.printStackTrace\s*\(\s*\)/g, {
      category: 'code-quality',
      severity: 'medium',
      title: 'printStackTrace() usage',
      description: 'printStackTrace() should be replaced with proper logging',
      suggestion: 'Log the exception using a logging framework',
      effort: 'small',
      rule: 'printStackTrace',
      tags: ['error-handling', 'logging'],
    }));

    // Empty catch blocks
    issues.push(...this.checkEmptyCatch(filePath, content));

    // @SuppressWarnings
    issues.push(...this.checkPattern(filePath, content, /@SuppressWarnings\s*\(/g, {
      category: 'code-quality',
      severity: 'medium',
      title: '@SuppressWarnings annotation',
      description: 'Suppressing warnings may hide potential issues',
      suggestion: 'Fix the underlying warning or document why suppression is necessary',
      effort: 'small',
      rule: 'suppress-warnings',
      tags: ['warnings', 'suppression'],
    }));

    // @Deprecated without replacement note
    issues.push(...this.checkPattern(filePath, content, /@Deprecated(?!\s*\()/g, {
      category: 'documentation',
      severity: 'low',
      title: '@Deprecated without details',
      description: '@Deprecated should include replacement information',
      suggestion: 'Add since and forRemoval parameters or Javadoc explaining the replacement',
      effort: 'trivial',
      rule: 'deprecated-no-info',
      tags: ['documentation', 'deprecation'],
    }));

    // Raw types (generic without type parameter)
    issues.push(...this.checkPattern(filePath, content, /\b(List|Map|Set|Collection|Iterator|Iterable)\s+\w+\s*[=;]/g, {
      category: 'code-quality',
      severity: 'medium',
      title: 'Raw type usage',
      description: 'Using raw types bypasses generic type checking',
      suggestion: 'Use parameterized types (e.g., List<String>)',
      effort: 'small',
      rule: 'raw-types',
      tags: ['typing', 'generics'],
    }));

    // Thread.sleep in tests or main code
    issues.push(...this.checkPattern(filePath, content, /Thread\.sleep\s*\(/g, {
      category: 'code-quality',
      severity: 'medium',
      title: 'Thread.sleep() usage',
      description: 'Thread.sleep() can cause flaky tests and performance issues',
      suggestion: 'Use proper synchronization mechanisms or testing utilities',
      effort: 'medium',
      rule: 'thread-sleep',
      tags: ['concurrency', 'testing'],
    }));

    // new Exception() without specific type
    issues.push(...this.checkPattern(filePath, content, /throw\s+new\s+Exception\s*\(/g, {
      category: 'code-quality',
      severity: 'medium',
      title: 'Generic Exception thrown',
      description: 'Throwing generic Exception makes error handling difficult',
      suggestion: 'Use or create a specific exception type',
      effort: 'small',
      rule: 'generic-exception',
      tags: ['error-handling', 'best-practice'],
    }));

    // Catching generic Exception
    issues.push(...this.checkPattern(filePath, content, /catch\s*\(\s*Exception\s+\w+\s*\)/g, {
      category: 'code-quality',
      severity: 'medium',
      title: 'Generic Exception caught',
      description: 'Catching generic Exception may catch unexpected exceptions',
      suggestion: 'Catch specific exception types',
      effort: 'small',
      rule: 'catch-generic-exception',
      tags: ['error-handling'],
    }));

    return issues;
  }

  private checkEmptyCatch(filePath: string, content: string): TechDebtIssue[] {
    const issues: TechDebtIssue[] = [];
    const lines = content.split('\n');

    for (let i = 0; i < lines.length - 1; i++) {
      const line = lines[i];

      // Check for catch followed by empty or just whitespace/comments
      if (/catch\s*\([^)]+\)\s*\{/.test(line)) {
        // Look ahead for empty catch
        let j = i + 1;
        let isEmpty = true;
        while (j < lines.length && !lines[j].includes('}')) {
          const checkLine = lines[j].trim();
          if (checkLine && !checkLine.startsWith('//') && !checkLine.startsWith('/*')) {
            isEmpty = false;
            break;
          }
          j++;
        }

        if (isEmpty && lines[j]?.trim() === '}') {
          issues.push({
            id: `empty-catch-${i + 1}`,
            category: 'code-quality',
            severity: 'high',
            file: filePath,
            line: i + 1,
            title: 'Empty catch block',
            description: 'Empty catch blocks swallow exceptions silently',
            suggestion: 'Log the exception or handle it appropriately',
            effort: 'small',
            language: this.language,
            rule: 'empty-catch',
            tags: ['error-handling', 'bug-prone'],
          });
        }
      }
    }

    return issues;
  }
}
