import { TechDebtIssue, TechDebtConfig } from '../types/index.js';
import { BaseAnalyzer } from './baseAnalyzer.js';

/**
 * C# specific analyzer
 */
export class CSharpAnalyzer extends BaseAnalyzer {
  constructor(config: TechDebtConfig = {}) {
    super('csharp', config);
  }

  protected async performLanguageSpecificChecks(
    filePath: string,
    content: string
  ): Promise<TechDebtIssue[]> {
    const issues: TechDebtIssue[] = [];

    // Console.WriteLine
    issues.push(...this.checkPattern(filePath, content, /Console\.(WriteLine|Write)\s*\(/g, {
      category: 'code-quality',
      severity: 'low',
      title: 'Console.Write usage',
      description: 'Console output should be replaced with proper logging',
      suggestion: 'Use ILogger or a logging framework like Serilog',
      effort: 'trivial',
      rule: 'console-writeline',
      tags: ['debug', 'cleanup'],
    }));

    // Debug.WriteLine
    issues.push(...this.checkPattern(filePath, content, /Debug\.(WriteLine|Write)\s*\(/g, {
      category: 'code-quality',
      severity: 'low',
      title: 'Debug.Write usage',
      description: 'Debug output should be removed or replaced with logging',
      suggestion: 'Use ILogger for proper logging',
      effort: 'trivial',
      rule: 'debug-writeline',
      tags: ['debug', 'cleanup'],
    }));

    // #pragma warning disable
    issues.push(...this.checkPattern(filePath, content, /#pragma\s+warning\s+disable(?!\s+\d)/g, {
      category: 'code-quality',
      severity: 'medium',
      title: 'Blanket pragma warning disable',
      description: 'Disabling warnings without specific codes may hide issues',
      suggestion: 'Specify which warning codes to disable',
      effort: 'trivial',
      rule: 'pragma-disable',
      tags: ['warnings', 'suppression'],
    }));

    // [Obsolete] without message
    issues.push(...this.checkPattern(filePath, content, /\[Obsolete\s*\]/g, {
      category: 'documentation',
      severity: 'low',
      title: '[Obsolete] without message',
      description: '[Obsolete] should include a message explaining the replacement',
      suggestion: 'Add a descriptive message: [Obsolete("Use X instead")]',
      effort: 'trivial',
      rule: 'obsolete-no-message',
      tags: ['documentation', 'deprecation'],
    }));

    // [SuppressMessage] annotations
    issues.push(...this.checkPattern(filePath, content, /\[SuppressMessage/g, {
      category: 'code-quality',
      severity: 'medium',
      title: '[SuppressMessage] annotation',
      description: 'Suppressing code analysis may hide potential issues',
      suggestion: 'Fix the underlying issue or document justification',
      effort: 'small',
      rule: 'suppress-message',
      tags: ['warnings', 'suppression'],
    }));

    // Empty catch blocks
    issues.push(...this.checkEmptyCatch(filePath, content));

    // dynamic type
    issues.push(...this.checkPattern(filePath, content, /\bdynamic\s+\w+/g, {
      category: 'code-quality',
      severity: 'medium',
      title: 'dynamic type usage',
      description: 'dynamic bypasses compile-time type checking',
      suggestion: 'Use proper types, generics, or interfaces',
      effort: 'medium',
      rule: 'dynamic-type',
      tags: ['typing', 'type-safety'],
    }));

    // async void (except event handlers)
    issues.push(...this.checkAsyncVoid(filePath, content));

    // Missing Dispose pattern
    issues.push(...this.checkMissingDispose(filePath, content));

    // Thread.Sleep
    issues.push(...this.checkPattern(filePath, content, /Thread\.Sleep\s*\(/g, {
      category: 'code-quality',
      severity: 'medium',
      title: 'Thread.Sleep usage',
      description: 'Thread.Sleep blocks the thread; prefer async alternatives',
      suggestion: 'Use Task.Delay with async/await instead',
      effort: 'small',
      rule: 'thread-sleep',
      tags: ['async', 'performance'],
    }));

    // .Result or .Wait() on tasks (sync over async)
    issues.push(...this.checkPattern(filePath, content, /\.(Result|Wait\(\))/g, {
      category: 'code-quality',
      severity: 'high',
      title: 'Sync over async',
      description: '.Result and .Wait() can cause deadlocks',
      suggestion: 'Use await instead of .Result or .Wait()',
      effort: 'small',
      rule: 'sync-over-async',
      tags: ['async', 'deadlock-risk'],
    }));

    // Generic Exception
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

    // GC.Collect (usually a code smell)
    issues.push(...this.checkPattern(filePath, content, /GC\.Collect\s*\(/g, {
      category: 'performance',
      severity: 'medium',
      title: 'Manual GC.Collect call',
      description: 'Manual garbage collection is usually unnecessary and harmful',
      suggestion: 'Let the GC manage memory automatically',
      effort: 'small',
      rule: 'gc-collect',
      tags: ['performance', 'memory'],
    }));

    return issues;
  }

  private checkEmptyCatch(filePath: string, content: string): TechDebtIssue[] {
    const issues: TechDebtIssue[] = [];
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (/catch\s*(\([^)]*\))?\s*{/.test(line)) {
        // Look ahead for empty catch
        let j = i;
        let braceCount = 0;
        let hasContent = false;

        while (j < lines.length) {
          const checkLine = lines[j];
          braceCount += (checkLine.match(/{/g) || []).length;
          braceCount -= (checkLine.match(/}/g) || []).length;

          // Check if there's actual code (not just comments/whitespace)
          const trimmed = checkLine.trim();
          if (j > i && trimmed && !trimmed.startsWith('//') &&
              !trimmed.startsWith('/*') && !trimmed.startsWith('*') &&
              trimmed !== '{' && trimmed !== '}') {
            hasContent = true;
            break;
          }

          if (braceCount === 0 && j > i) break;
          j++;
        }

        if (!hasContent) {
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

  private checkAsyncVoid(filePath: string, content: string): TechDebtIssue[] {
    const issues: TechDebtIssue[] = [];
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // Match async void but not event handlers (which typically have sender, EventArgs)
      if (/\basync\s+void\s+\w+/.test(line) &&
          !line.includes('EventArgs') &&
          !line.includes('sender,')) {
        issues.push({
          id: `async-void-${i + 1}`,
          category: 'code-quality',
          severity: 'high',
          file: filePath,
          line: i + 1,
          title: 'async void method',
          description: 'async void methods cannot be awaited and exceptions cannot be caught',
          suggestion: 'Change to async Task and await the call',
          effort: 'small',
          language: this.language,
          rule: 'async-void',
          tags: ['async', 'error-handling'],
        });
      }
    }

    return issues;
  }

  private checkMissingDispose(filePath: string, content: string): TechDebtIssue[] {
    const issues: TechDebtIssue[] = [];
    const lines = content.split('\n');

    // Check for IDisposable implementation without Dispose pattern
    const hasIDisposable = content.includes(': IDisposable') || content.includes(', IDisposable');
    const hasDisposeMethod = /public\s+void\s+Dispose\s*\(/.test(content);
    const hasDisposePattern = content.includes('protected virtual void Dispose(bool');

    if (hasIDisposable && hasDisposeMethod && !hasDisposePattern) {
      // Find the class line
      for (let i = 0; i < lines.length; i++) {
        if (/class\s+\w+.*IDisposable/.test(lines[i])) {
          issues.push({
            id: `missing-dispose-pattern-${i + 1}`,
            category: 'code-quality',
            severity: 'medium',
            file: filePath,
            line: i + 1,
            title: 'Incomplete Dispose pattern',
            description: 'IDisposable implementation missing the full Dispose pattern',
            suggestion: 'Implement the full Dispose pattern with protected virtual Dispose(bool)',
            effort: 'medium',
            language: this.language,
            rule: 'dispose-pattern',
            tags: ['memory', 'resources'],
          });
          break;
        }
      }
    }

    // Check for disposable objects not in using statement
    const disposableTypes = ['StreamReader', 'StreamWriter', 'FileStream', 'SqlConnection',
                            'HttpClient', 'WebClient', 'SqlCommand', 'SqlDataReader'];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      for (const type of disposableTypes) {
        if (line.includes(`new ${type}(`) && !line.includes('using ') && !line.includes('using(')) {
          // Check if it's assigned to a using declaration
          if (!line.includes('using var') && !line.includes('using ')) {
            issues.push({
              id: `dispose-not-called-${i + 1}`,
              category: 'code-quality',
              severity: 'high',
              file: filePath,
              line: i + 1,
              title: `${type} not disposed properly`,
              description: `${type} should be disposed after use`,
              suggestion: 'Use a using statement or using declaration',
              effort: 'small',
              language: this.language,
              rule: 'dispose-not-called',
              tags: ['memory', 'resources'],
            });
          }
        }
      }
    }

    return issues;
  }
}
