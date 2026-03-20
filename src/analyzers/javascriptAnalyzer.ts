import { TechDebtIssue, TechDebtConfig } from '../types/index.js';
import { BaseAnalyzer } from './baseAnalyzer.js';

/**
 * JavaScript-specific analyzer
 */
export class JavaScriptAnalyzer extends BaseAnalyzer {
  constructor(config: TechDebtConfig = {}) {
    super('javascript', config);
  }

  protected async performLanguageSpecificChecks(
    filePath: string,
    content: string
  ): Promise<TechDebtIssue[]> {
    const issues: TechDebtIssue[] = [];

    // Console.log statements
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

    // Debugger statements — match debugger as a statement (standalone, inline, with trailing comment)
    // Negative lookbehind rejects lines where debugger appears inside // or /* or * comments
    issues.push(...this.checkPattern(filePath, content, /(?<!\/\/.*|\/\*.*|\*\s*)\bdebugger\s*;?\s*(?:\/\/.*)?$/gm, {
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
      suggestion: 'Fix the underlying issues or use eslint-disable-next-line for specific lines',
      effort: 'small',
      rule: 'eslint-disable',
      tags: ['linting'],
    }));

    // var usage (should use let/const)
    issues.push(...this.checkPattern(filePath, content, /\bvar\s+\w+/g, {
      category: 'code-quality',
      severity: 'low',
      title: 'var keyword used',
      description: 'var has function scoping which can lead to bugs',
      suggestion: 'Use let or const instead of var',
      effort: 'trivial',
      rule: 'var-usage',
      tags: ['modernization'],
    }));

    // eval usage
    issues.push(...this.checkPattern(filePath, content, /\beval\s*\(/g, {
      category: 'security',
      severity: 'critical',
      title: 'eval() usage detected',
      description: 'eval() is a security risk and can execute arbitrary code',
      suggestion: 'Avoid using eval(). Use safer alternatives like JSON.parse()',
      effort: 'medium',
      rule: 'eval-usage',
      tags: ['security', 'critical'],
    }));

    // Alert usage
    issues.push(...this.checkPattern(filePath, content, /\balert\s*\(/g, {
      category: 'code-quality',
      severity: 'low',
      title: 'alert() usage detected',
      description: 'alert() blocks the UI and should not be used in production',
      suggestion: 'Use a modal dialog or toast notification instead',
      effort: 'small',
      rule: 'alert-usage',
      tags: ['ui', 'cleanup'],
    }));

    // Promise without catch
    issues.push(...this.checkPromiseWithoutCatch(filePath, content));

    return issues;
  }

  private checkPromiseWithoutCatch(filePath: string, content: string): TechDebtIssue[] {
    const issues: TechDebtIssue[] = [];
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // Simple heuristic: .then( without .catch( on same or next line
      if (line.includes('.then(') && !line.includes('.catch(')) {
        const nextLine = lines[i + 1] || '';
        if (!nextLine.includes('.catch(') && !line.includes('await')) {
          issues.push({
            id: `promise-no-catch-${i + 1}`,
            category: 'code-quality',
            severity: 'medium',
            file: filePath,
            line: i + 1,
            title: 'Promise without error handling',
            description: 'Promise chain may not have error handling',
            suggestion: 'Add .catch() to handle potential errors',
            effort: 'small',
            language: this.language,
            rule: 'promise-no-catch',
            tags: ['error-handling'],
          });
        }
      }
    }

    return issues;
  }
}
