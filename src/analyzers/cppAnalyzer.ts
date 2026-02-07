import { TechDebtIssue, TechDebtConfig } from '../types/index.js';
import { BaseAnalyzer } from './baseAnalyzer.js';

/**
 * C++ specific analyzer
 */
export class CppAnalyzer extends BaseAnalyzer {
  constructor(config: TechDebtConfig = {}) {
    super('cpp', config);
  }

  protected async performLanguageSpecificChecks(
    filePath: string,
    content: string
  ): Promise<TechDebtIssue[]> {
    const issues: TechDebtIssue[] = [];

    // Raw pointers (new without smart pointers)
    issues.push(...this.checkPattern(filePath, content, /\bnew\s+\w+(?:<[^>]+>)?\s*(?:\([^)]*\)|\[[^\]]*\])/g, {
      category: 'code-quality',
      severity: 'medium',
      title: 'Raw pointer allocation',
      description: 'Using new without smart pointers can lead to memory leaks',
      suggestion: 'Use std::unique_ptr or std::shared_ptr instead',
      effort: 'small',
      rule: 'raw-pointer',
      tags: ['memory', 'modern-cpp'],
    }));

    // Manual memory management (delete)
    issues.push(...this.checkPattern(filePath, content, /\bdelete\s+(?:\[\])?\s*\w+/g, {
      category: 'code-quality',
      severity: 'medium',
      title: 'Manual memory management',
      description: 'Manual delete can lead to memory leaks or double-free bugs',
      suggestion: 'Use RAII and smart pointers for automatic memory management',
      effort: 'medium',
      rule: 'manual-memory',
      tags: ['memory', 'safety'],
    }));

    // C-style casts
    issues.push(...this.checkPattern(filePath, content, /\(\s*(?:int|float|double|char|long|short|unsigned|void)\s*\*?\s*\)\s*\w+/g, {
      category: 'code-quality',
      severity: 'medium',
      title: 'C-style cast used',
      description: 'C-style casts bypass type checking and are harder to find',
      suggestion: 'Use static_cast, dynamic_cast, const_cast, or reinterpret_cast',
      effort: 'small',
      rule: 'c-style-cast',
      tags: ['typing', 'modern-cpp'],
    }));

    // goto statements
    issues.push(...this.checkPattern(filePath, content, /\bgoto\s+\w+/g, {
      category: 'code-quality',
      severity: 'high',
      title: 'goto statement used',
      description: 'goto makes code flow difficult to follow and maintain',
      suggestion: 'Restructure using loops, functions, or exceptions',
      effort: 'medium',
      rule: 'goto-statement',
      tags: ['control-flow', 'maintainability'],
    }));

    // using namespace std (in headers especially)
    issues.push(...this.checkPattern(filePath, content, /using\s+namespace\s+std\s*;/g, {
      category: 'code-quality',
      severity: filePath.endsWith('.h') || filePath.endsWith('.hpp') ? 'high' : 'medium',
      title: 'using namespace std',
      description: 'Pollutes namespace and can cause name collisions',
      suggestion: 'Use specific imports (using std::vector) or fully qualified names',
      effort: 'small',
      rule: 'using-namespace-std',
      tags: ['namespace', 'best-practice'],
    }));

    // Deprecated headers
    const deprecatedHeaders = [
      { pattern: /<cstdio>/g, replacement: '<iostream>' },
      { pattern: /<stdio\.h>/g, replacement: '<cstdio> or <iostream>' },
      { pattern: /<stdlib\.h>/g, replacement: '<cstdlib>' },
      { pattern: /<string\.h>/g, replacement: '<cstring>' },
      { pattern: /<math\.h>/g, replacement: '<cmath>' },
    ];

    for (const header of deprecatedHeaders) {
      issues.push(...this.checkPattern(filePath, content, header.pattern, {
        category: 'code-quality',
        severity: 'low',
        title: 'C-style header used',
        description: 'C-style headers are deprecated in C++',
        suggestion: `Use ${header.replacement} instead`,
        effort: 'trivial',
        rule: 'deprecated-headers',
        tags: ['modernization', 'headers'],
      }));
    }

    // printf/scanf (prefer iostream or fmt)
    issues.push(...this.checkPattern(filePath, content, /\b(printf|scanf|sprintf|sscanf)\s*\(/g, {
      category: 'code-quality',
      severity: 'low',
      title: 'C-style I/O function',
      description: 'printf/scanf are type-unsafe and can have security issues',
      suggestion: 'Use iostream or std::format (C++20) / fmt library',
      effort: 'small',
      rule: 'c-style-io',
      tags: ['safety', 'modern-cpp'],
    }));

    // Macro abuse (function-like macros)
    issues.push(...this.checkMacroAbuse(filePath, content));

    // std::endl (performance)
    issues.push(...this.checkPattern(filePath, content, /std::endl/g, {
      category: 'performance',
      severity: 'low',
      title: 'std::endl usage',
      description: 'std::endl flushes the buffer which can hurt performance',
      suggestion: 'Use "\\n" unless flushing is explicitly needed',
      effort: 'trivial',
      rule: 'iostream-sync',
      tags: ['performance'],
    }));

    // Magic numbers
    issues.push(...this.checkMagicNumbers(filePath, content));

    // Missing virtual destructor in base class
    issues.push(...this.checkMissingVirtualDestructor(filePath, content));

    return issues;
  }

  private checkMacroAbuse(filePath: string, content: string): TechDebtIssue[] {
    const issues: TechDebtIssue[] = [];
    const lines = content.split('\n');
    let macroCount = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // Function-like macros
      if (/^#define\s+\w+\s*\([^)]*\)/.test(line)) {
        macroCount++;
      }
    }

    if (macroCount > 5) {
      issues.push({
        id: 'macro-abuse',
        category: 'code-quality',
        severity: 'medium',
        file: filePath,
        title: 'Excessive macro usage',
        description: `File has ${macroCount} function-like macros`,
        suggestion: 'Use constexpr functions, templates, or inline functions instead',
        effort: 'medium',
        language: this.language,
        rule: 'macro-abuse',
        tags: ['modernization', 'maintainability'],
      });
    }

    return issues;
  }

  private checkMagicNumbers(filePath: string, content: string): TechDebtIssue[] {
    const issues: TechDebtIssue[] = [];
    const lines = content.split('\n');
    const magicNumberPattern = /(?<![.\w])\b(?!0x)[1-9]\d{2,}\b(?!\.\d)/g;
    let magicCount = 0;

    for (const line of lines) {
      if (line.trim().startsWith('//') || line.trim().startsWith('/*')) continue;
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
        suggestion: 'Use constexpr constants for magic numbers',
        effort: 'small',
        language: this.language,
        rule: 'magic-numbers',
        tags: ['readability', 'maintainability'],
      });
    }

    return issues;
  }

  private checkMissingVirtualDestructor(filePath: string, content: string): TechDebtIssue[] {
    const issues: TechDebtIssue[] = [];
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // Check for class with virtual methods
      if (/\bclass\s+\w+/.test(line)) {
        // Look ahead for virtual methods and destructor
        let hasVirtualMethod = false;
        let hasVirtualDestructor = false;
        let classEnd = i;
        let braceCount = 0;

        for (let j = i; j < Math.min(i + 100, lines.length); j++) {
          const checkLine = lines[j];
          braceCount += (checkLine.match(/{/g) || []).length;
          braceCount -= (checkLine.match(/}/g) || []).length;

          if (/\bvirtual\s+(?!~)/.test(checkLine)) {
            hasVirtualMethod = true;
          }
          if (/virtual\s+~\w+/.test(checkLine)) {
            hasVirtualDestructor = true;
          }

          if (braceCount === 0 && j > i) {
            classEnd = j;
            break;
          }
        }

        if (hasVirtualMethod && !hasVirtualDestructor) {
          issues.push({
            id: `missing-virtual-destructor-${i + 1}`,
            category: 'code-quality',
            severity: 'high',
            file: filePath,
            line: i + 1,
            title: 'Missing virtual destructor',
            description: 'Class with virtual methods should have virtual destructor',
            suggestion: 'Add virtual ~ClassName() = default; or define a virtual destructor',
            effort: 'trivial',
            language: this.language,
            rule: 'missing-virtual-destructor',
            tags: ['memory', 'polymorphism'],
          });
        }
      }
    }

    return issues;
  }
}
