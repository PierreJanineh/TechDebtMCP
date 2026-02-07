import { TechDebtIssue, TechDebtConfig } from '../types/index.js';
import { BaseAnalyzer } from './baseAnalyzer.js';

/**
 * Python-specific analyzer
 */
export class PythonAnalyzer extends BaseAnalyzer {
  constructor(config: TechDebtConfig = {}) {
    super('python', config);
  }

  protected async performLanguageSpecificChecks(
    filePath: string,
    content: string
  ): Promise<TechDebtIssue[]> {
    const issues: TechDebtIssue[] = [];

    // Bare except clauses
    issues.push(...this.checkPattern(filePath, content, /except\s*:/g, {
      category: 'code-quality',
      severity: 'high',
      title: 'Bare except clause',
      description: 'Bare except catches all exceptions including KeyboardInterrupt and SystemExit',
      suggestion: 'Catch specific exceptions or use "except Exception:"',
      effort: 'small',
      rule: 'bare-except',
      tags: ['error-handling', 'best-practice'],
    }));

    // pass statement in except
    issues.push(...this.checkPattern(filePath, content, /except.*:\s*\n\s*pass\b/g, {
      category: 'code-quality',
      severity: 'medium',
      title: 'Silent exception handling',
      description: 'Catching exceptions and doing nothing can hide bugs',
      suggestion: 'Log the exception or handle it appropriately',
      effort: 'small',
      rule: 'silent-except',
      tags: ['error-handling'],
    }));

    // print statements (should use logging)
    issues.push(...this.checkPattern(filePath, content, /\bprint\s*\(/g, {
      category: 'code-quality',
      severity: 'low',
      title: 'print() statement found',
      description: 'print() should be replaced with proper logging in production code',
      suggestion: 'Use the logging module instead of print()',
      effort: 'trivial',
      rule: 'print-statement',
      tags: ['debug', 'cleanup'],
    }));

    // global keyword usage
    issues.push(...this.checkPattern(filePath, content, /\bglobal\s+\w+/g, {
      category: 'code-quality',
      severity: 'medium',
      title: 'global keyword used',
      description: 'Using global variables can make code harder to understand and test',
      suggestion: 'Pass values as function arguments or use a class',
      effort: 'medium',
      rule: 'global-usage',
      tags: ['architecture', 'testability'],
    }));

    // exec usage
    issues.push(...this.checkPattern(filePath, content, /\bexec\s*\(/g, {
      category: 'security',
      severity: 'critical',
      title: 'exec() usage detected',
      description: 'exec() can execute arbitrary code and is a security risk',
      suggestion: 'Avoid using exec(). Use safer alternatives',
      effort: 'medium',
      rule: 'exec-usage',
      tags: ['security', 'critical'],
    }));

    // eval usage
    issues.push(...this.checkPattern(filePath, content, /\beval\s*\(/g, {
      category: 'security',
      severity: 'critical',
      title: 'eval() usage detected',
      description: 'eval() can execute arbitrary code and is a security risk',
      suggestion: 'Avoid using eval(). Use ast.literal_eval() for parsing literals',
      effort: 'medium',
      rule: 'eval-usage',
      tags: ['security', 'critical'],
    }));

    // noqa comments
    issues.push(...this.checkPattern(filePath, content, /#\s*noqa(?!\s*:\s*\w)/g, {
      category: 'code-quality',
      severity: 'medium',
      title: 'Blanket noqa comment',
      description: 'noqa without specific codes suppresses all warnings',
      suggestion: 'Specify which warnings to suppress (e.g., # noqa: E501)',
      effort: 'trivial',
      rule: 'noqa-blanket',
      tags: ['linting'],
    }));

    // type: ignore comments
    issues.push(...this.checkPattern(filePath, content, /#\s*type:\s*ignore(?!\s*\[)/g, {
      category: 'code-quality',
      severity: 'medium',
      title: 'Blanket type: ignore comment',
      description: 'type: ignore without specific codes suppresses all type errors',
      suggestion: 'Specify which errors to ignore (e.g., # type: ignore[arg-type])',
      effort: 'trivial',
      rule: 'type-ignore-blanket',
      tags: ['typing'],
    }));

    // Import * (wildcard imports)
    issues.push(...this.checkPattern(filePath, content, /from\s+\S+\s+import\s+\*/g, {
      category: 'code-quality',
      severity: 'medium',
      title: 'Wildcard import used',
      description: 'Wildcard imports make it unclear what names are in scope',
      suggestion: 'Import specific names instead of using *',
      effort: 'small',
      rule: 'wildcard-import',
      tags: ['imports', 'readability'],
    }));

    // Mutable default arguments
    issues.push(...this.checkMutableDefaults(filePath, content));

    return issues;
  }

  private checkMutableDefaults(filePath: string, content: string): TechDebtIssue[] {
    const issues: TechDebtIssue[] = [];
    const lines = content.split('\n');
    const mutableDefaultPattern = /def\s+\w+\s*\([^)]*(?:=\s*\[\]|=\s*\{\}|=\s*set\(\))/g;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (mutableDefaultPattern.test(line)) {
        issues.push({
          id: `mutable-default-${i + 1}`,
          category: 'code-quality',
          severity: 'high',
          file: filePath,
          line: i + 1,
          title: 'Mutable default argument',
          description: 'Mutable default arguments are shared between function calls',
          suggestion: 'Use None as default and create the mutable object inside the function',
          effort: 'small',
          language: this.language,
          rule: 'mutable-default',
          tags: ['bug-prone', 'best-practice'],
        });
      }
      mutableDefaultPattern.lastIndex = 0;
    }

    return issues;
  }
}
