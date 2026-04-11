import { TechDebtIssue, TechDebtConfig } from '../types/index.js';
import { BaseAnalyzer } from './baseAnalyzer.js';

/**
 * C specific analyzer
 */
export class CAnalyzer extends BaseAnalyzer {
  constructor(config: TechDebtConfig = {}) {
    super('c', config);
  }

  protected async performLanguageSpecificChecks(
    filePath: string,
    content: string
  ): Promise<TechDebtIssue[]> {
    const issues: TechDebtIssue[] = [];

    // malloc without free tracking (basic heuristic)
    issues.push(...this.checkMemoryManagement(filePath, content));

    // goto statements
    issues.push(...this.checkPattern(filePath, content, /\bgoto\s+\w+/g, {
      category: 'code-quality',
      severity: 'high',
      title: 'goto statement used',
      description: 'goto makes code flow difficult to follow and maintain',
      suggestion: 'Restructure using loops and functions',
      effort: 'medium',
      rule: 'goto-statement',
      tags: ['control-flow', 'maintainability'],
    }));

    // Unsafe functions
    const unsafeFunctions = [
      { pattern: /\bgets\s*\(/g, name: 'gets', alternative: 'fgets' },
      { pattern: /\bstrcpy\s*\(/g, name: 'strcpy', alternative: 'strncpy or strlcpy' },
      { pattern: /\bstrcat\s*\(/g, name: 'strcat', alternative: 'strncat or strlcat' },
      { pattern: /\bsprintf\s*\(/g, name: 'sprintf', alternative: 'snprintf' },
      { pattern: /\bscanf\s*\([^,]*%s/g, name: 'scanf with %s', alternative: 'scanf with width specifier or fgets' },
    ];

    for (const func of unsafeFunctions) {
      issues.push(...this.checkPattern(filePath, content, func.pattern, {
        category: 'security',
        severity: 'high',
        title: `Unsafe function ${func.name}`,
        description: `${func.name} can cause buffer overflows`,
        suggestion: `Use ${func.alternative} instead`,
        effort: 'small',
        rule: 'unsafe-functions',
        tags: ['security', 'buffer-overflow'],
      }));
    }

    // Missing null checks after malloc
    issues.push(...this.checkMissingNullCheck(filePath, content));

    // Magic numbers
    issues.push(...this.checkMagicNumbers(filePath, content));

    // Global variables
    issues.push(...this.checkGlobalVariables(filePath, content));

    // Function too long (C functions tend to be longer)
    issues.push(...this.checkLongFunctions(filePath, content));

    // printf format string issues (basic check)
    issues.push(...this.checkPrintfFormatStrings(filePath, content));

    return issues;
  }

  private checkMemoryManagement(filePath: string, content: string): TechDebtIssue[] {
    const issues: TechDebtIssue[] = [];
    const lines = content.split('\n');

    let mallocCount = 0;
    let freeCount = 0;

    for (const line of lines) {
      if (/\b(malloc|calloc|realloc)\s*\(/.test(line)) {
        mallocCount++;
      }
      if (/\bfree\s*\(/.test(line)) {
        freeCount++;
      }
    }

    if (mallocCount > freeCount + 2) {
      issues.push({
        id: 'malloc-no-free',
        category: 'code-quality',
        severity: 'high',
        file: filePath,
        title: 'Potential memory leak',
        description: `Found ${mallocCount} allocations but only ${freeCount} frees`,
        suggestion: 'Ensure all allocated memory is properly freed',
        effort: 'medium',
        language: this.language,
        rule: 'malloc-no-free',
        tags: ['memory', 'leak-risk'],
      });
    }

    return issues;
  }

  private checkMissingNullCheck(filePath: string, content: string): TechDebtIssue[] {
    const issues: TechDebtIssue[] = [];
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // Check for malloc/calloc assignment
      if (/\w+\s*=\s*(malloc|calloc|realloc)\s*\(/.test(line)) {
        // Check if next few lines have null check
        const nextLines = lines.slice(i + 1, i + 4).join('\n');
        if (!nextLines.includes('== NULL') &&
            !nextLines.includes('!= NULL') &&
            !nextLines.includes('if (') &&
            !nextLines.includes('if(')) {
          issues.push({
            id: `missing-null-check-${i + 1}`,
            category: 'code-quality',
            severity: 'high',
            file: filePath,
            line: i + 1,
            title: 'Missing NULL check after allocation',
            description: 'Memory allocation may fail and return NULL',
            suggestion: 'Always check for NULL after malloc/calloc/realloc',
            effort: 'trivial',
            language: this.language,
            rule: 'missing-null-check',
            tags: ['safety', 'null-pointer'],
          });
        }
      }
    }

    return issues;
  }

  private checkMagicNumbers(filePath: string, content: string): TechDebtIssue[] {
    const issues: TechDebtIssue[] = [];
    const lines = content.split('\n');
    const magicNumberPattern = /(?<![.\w])\b(?!0x)[1-9]\d{2,}\b(?!\.\d)/g;
    let magicCount = 0;

    for (const line of lines) {
      if (line.trim().startsWith('//') || line.trim().startsWith('/*') || line.trim().startsWith('#define')) continue;
      const matches = line.match(magicNumberPattern);
      if (matches) {
        magicCount += matches.length;
      }
    }

    if (magicCount > 5) {
      issues.push({
        id: 'magic-numbers',
        category: 'code-quality',
        severity: 'medium',
        file: filePath,
        title: 'Magic numbers detected',
        description: `File contains ${magicCount} magic numbers`,
        suggestion: 'Use #define constants or enum for magic numbers',
        effort: 'small',
        language: this.language,
        rule: 'magic-numbers',
        tags: ['readability', 'maintainability'],
      });
    }

    return issues;
  }

  private checkGlobalVariables(filePath: string, content: string): TechDebtIssue[] {
    const issues: TechDebtIssue[] = [];

    // Only check .c files, not headers
    if (!filePath.endsWith('.c')) return issues;

    const lines = content.split('\n');
    let globalCount = 0;
    let braceDepth = 0;

    for (const line of lines) {
      // Track if we're inside a function
      braceDepth += (line.match(/{/g) || []).length;
      braceDepth -= (line.match(/}/g) || []).length;

      if (braceDepth === 0) {
        // Look for variable declarations outside functions
        if (/^(?!#|\/\/|\/\*|\s*\*|typedef|struct|enum|union|extern)\s*\w+\s+\w+\s*(=|;)/.test(line)) {
          globalCount++;
        }
      }
    }

    if (globalCount > 3) {
      issues.push({
        id: 'global-variables',
        category: 'code-quality',
        severity: 'medium',
        file: filePath,
        title: 'Excessive global variables',
        description: `File has ${globalCount} global variables`,
        suggestion: 'Minimize global state; pass data through function parameters',
        effort: 'medium',
        language: this.language,
        rule: 'global-variable',
        tags: ['architecture', 'testability'],
      });
    }

    return issues;
  }

  private checkLongFunctions(filePath: string, content: string): TechDebtIssue[] {
    const issues: TechDebtIssue[] = [];
    const lines = content.split('\n');
    const maxFunctionLines = this.config.rules?.maxFunctionLines || 100;

    let functionStart = -1;
    let functionName = '';
    let braceDepth = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Detect function definition
      const funcMatch = line.match(/^(?:\w+\s+)+(\w+)\s*\([^)]*\)\s*{?$/);
      if (funcMatch && braceDepth === 0) {
        functionStart = i;
        functionName = funcMatch[1];
      }

      braceDepth += (line.match(/{/g) || []).length;
      braceDepth -= (line.match(/}/g) || []).length;

      // Function ended
      if (braceDepth === 0 && functionStart >= 0) {
        const functionLength = i - functionStart + 1;
        if (functionLength > maxFunctionLines) {
          issues.push({
            id: `long-function-${functionStart + 1}`,
            category: 'maintainability',
            severity: functionLength > maxFunctionLines * 2 ? 'high' : 'medium',
            file: filePath,
            line: functionStart + 1,
            title: 'Function is too long',
            description: `Function '${functionName}' has ${functionLength} lines (max: ${maxFunctionLines})`,
            suggestion: 'Break down into smaller, focused functions',
            effort: 'medium',
            language: this.language,
            rule: 'long-function',
            tags: ['maintainability', 'complexity'],
          });
        }
        functionStart = -1;
      }
    }

    return issues;
  }

  private checkPrintfFormatStrings(filePath: string, content: string): TechDebtIssue[] {
    const issues: TechDebtIssue[] = [];
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // Check for printf with variable as format string (security risk)
      if (/\bprintf\s*\(\s*\w+\s*\)/.test(line)) {
        issues.push({
          id: `printf-format-${i + 1}`,
          category: 'security',
          severity: 'critical',
          file: filePath,
          line: i + 1,
          title: 'Format string vulnerability',
          description: 'Using variable as printf format string is a security risk',
          suggestion: 'Use printf("%s", variable) instead',
          effort: 'trivial',
          language: this.language,
          rule: 'format-string-vulnerability',
          tags: ['security', 'critical'],
        });
      }
    }

    return issues;
  }
}
