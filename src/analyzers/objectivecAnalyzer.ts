import { TechDebtIssue, TechDebtConfig } from '../types/index.js';
import { BaseAnalyzer } from './baseAnalyzer.js';

/**
 * Objective-C specific analyzer
 */
export class ObjectiveCAnalyzer extends BaseAnalyzer {
  constructor(config: TechDebtConfig = {}) {
    super('objectivec', config);
  }

  protected async performLanguageSpecificChecks(
    filePath: string,
    content: string
  ): Promise<TechDebtIssue[]> {
    const issues: TechDebtIssue[] = [];

    // NSLog statements
    issues.push(...this.checkPattern(filePath, content, /\bNSLog\s*\(/g, {
      category: 'code-quality',
      severity: 'low',
      title: 'NSLog statement found',
      description: 'NSLog is slow and should be removed or replaced in production',
      suggestion: 'Use os_log or a logging framework, or wrap in DEBUG macro',
      effort: 'trivial',
      rule: 'nslog-statement',
      tags: ['debug', 'performance'],
    }));

    // Retain cycle risk (strong self in blocks)
    issues.push(...this.checkRetainCycleRisk(filePath, content));

    // Deprecated methods
    issues.push(...this.checkPattern(filePath, content, /\b(stringWithCString|initWithCString|stringWithContentsOfFile:|initWithContentsOfFile:)\b/g, {
      category: 'dependency',
      severity: 'medium',
      title: 'Deprecated method usage',
      description: 'Using deprecated methods that may be removed in future iOS versions',
      suggestion: 'Use the modern replacement APIs with encoding parameters',
      effort: 'small',
      rule: 'deprecated-method',
      tags: ['deprecation', 'compatibility'],
    }));

    // UIWebView (deprecated)
    issues.push(...this.checkPattern(filePath, content, /\bUIWebView\b/g, {
      category: 'dependency',
      severity: 'high',
      title: 'Deprecated UIWebView usage',
      description: 'UIWebView is deprecated and will cause App Store rejection',
      suggestion: 'Migrate to WKWebView',
      effort: 'large',
      rule: 'deprecated-uiwebview',
      tags: ['deprecation', 'app-store'],
    }));

    // Magic numbers
    issues.push(...this.checkMagicNumbers(filePath, content));

    // ARC bridge casts without proper annotation
    issues.push(...this.checkPattern(filePath, content, /\(__bridge(?:_transfer|_retained)?\s+\w+\s*\*?\s*\)/g, {
      category: 'code-quality',
      severity: 'medium',
      title: 'ARC bridge cast',
      description: 'Bridge casts require careful memory management',
      suggestion: 'Ensure the bridge cast type is correct to avoid memory leaks',
      effort: 'small',
      rule: 'arc-bridge-cast',
      tags: ['memory', 'arc'],
    }));

    // performSelector (can cause leaks and crashes)
    issues.push(...this.checkPattern(filePath, content, /\bperformSelector\s*:/g, {
      category: 'code-quality',
      severity: 'medium',
      title: 'performSelector usage',
      description: 'performSelector can cause memory leaks and crashes with ARC',
      suggestion: 'Use direct method calls or blocks instead',
      effort: 'small',
      rule: 'perform-selector',
      tags: ['memory', 'safety'],
    }));

    // @synchronized (performance concern)
    issues.push(...this.checkPattern(filePath, content, /@synchronized\s*\(/g, {
      category: 'performance',
      severity: 'low',
      title: '@synchronized usage',
      description: '@synchronized has overhead; modern alternatives may be faster',
      suggestion: 'Consider using dispatch queues or os_unfair_lock',
      effort: 'medium',
      rule: 'synchronized-block',
      tags: ['performance', 'concurrency'],
    }));

    // Checking massive view controller (large .m files)
    if (filePath.endsWith('.m')) {
      const lineCount = content.split('\n').length;
      if (lineCount > 500) {
        issues.push({
          id: 'massive-view-controller',
          category: 'architecture',
          severity: lineCount > 1000 ? 'high' : 'medium',
          file: filePath,
          title: 'Massive View Controller',
          description: `Implementation file has ${lineCount} lines, suggesting MVC violation`,
          suggestion: 'Extract logic into separate managers, view models, or extensions',
          effort: 'large',
          language: this.language,
          rule: 'massive-view-controller',
          tags: ['architecture', 'mvc'],
        });
      }
    }

    return issues;
  }

  private checkRetainCycleRisk(filePath: string, content: string): TechDebtIssue[] {
    const issues: TechDebtIssue[] = [];
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // Look for blocks using self without __weak
      if (line.includes('^') && line.includes('self')) {
        // Check if there's __weak self nearby
        const contextStart = Math.max(0, i - 3);
        const context = lines.slice(contextStart, i + 1).join('\n');

        if (!context.includes('__weak') &&
            !context.includes('weakSelf') &&
            !context.includes('__unsafe_unretained')) {
          issues.push({
            id: `retain-cycle-risk-${i + 1}`,
            category: 'code-quality',
            severity: 'high',
            file: filePath,
            line: i + 1,
            title: 'Potential retain cycle in block',
            description: 'Using self in block without __weak may cause memory leak',
            suggestion: 'Create a __weak reference to self before the block',
            effort: 'small',
            language: this.language,
            rule: 'retain-cycle-risk',
            tags: ['memory', 'leak-risk'],
          });
        }
      }
    }

    return issues;
  }

  private checkMagicNumbers(filePath: string, content: string): TechDebtIssue[] {
    const issues: TechDebtIssue[] = [];
    const lines = content.split('\n');
    const magicNumberPattern = /(?<![\w.])\b(?!0x)[1-9]\d{2,}\b(?!\.\d)/g;
    let magicCount = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // Skip comments and string literals
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
        suggestion: 'Define constants for magic numbers to improve readability',
        effort: 'small',
        language: this.language,
        rule: 'magic-numbers',
        tags: ['readability', 'maintainability'],
      });
    }

    return issues;
  }
}
