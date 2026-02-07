import { TechDebtIssue, TechDebtConfig } from '../types/index.js';
import { BaseAnalyzer } from './baseAnalyzer.js';

/**
 * Kotlin-specific analyzer
 */
export class KotlinAnalyzer extends BaseAnalyzer {
  constructor(config: TechDebtConfig = {}) {
    super('kotlin', config);
  }

  protected async performLanguageSpecificChecks(
    filePath: string,
    content: string
  ): Promise<TechDebtIssue[]> {
    const issues: TechDebtIssue[] = [];

    // Force unwrap (!!)
    issues.push(...this.checkPattern(filePath, content, /!!/g, {
      category: 'code-quality',
      severity: 'high',
      title: 'Not-null assertion (!!) used',
      description: 'Using !! can throw NullPointerException at runtime',
      suggestion: 'Use safe calls (?.), let blocks, or proper null checks',
      effort: 'small',
      rule: 'force-unwrap',
      tags: ['safety', 'crash-risk', 'null-safety'],
    }));

    // println statements
    issues.push(...this.checkPattern(filePath, content, /\bprintln\s*\(/g, {
      category: 'code-quality',
      severity: 'low',
      title: 'println() statement found',
      description: 'println() should be replaced with proper logging',
      suggestion: 'Use a logging framework like Timber or SLF4J',
      effort: 'trivial',
      rule: 'println-statement',
      tags: ['debug', 'cleanup'],
    }));

    // print statements
    issues.push(...this.checkPattern(filePath, content, /\bprint\s*\([^)]*\)/g, {
      category: 'code-quality',
      severity: 'low',
      title: 'print() statement found',
      description: 'print() should be replaced with proper logging',
      suggestion: 'Use a logging framework',
      effort: 'trivial',
      rule: 'print-statement',
      tags: ['debug', 'cleanup'],
    }));

    // @Suppress annotations
    issues.push(...this.checkPattern(filePath, content, /@Suppress\s*\(/g, {
      category: 'code-quality',
      severity: 'medium',
      title: '@Suppress annotation used',
      description: 'Suppressing warnings may hide potential issues',
      suggestion: 'Fix the underlying issue or document why suppression is needed',
      effort: 'small',
      rule: 'suppress-annotation',
      tags: ['warnings', 'suppression'],
    }));

    // @Deprecated without replacement
    issues.push(...this.checkPattern(filePath, content, /@Deprecated\s*\(\s*"[^"]*"(?!\s*,)/g, {
      category: 'documentation',
      severity: 'low',
      title: '@Deprecated without replacement info',
      description: '@Deprecated should include replaceWith parameter',
      suggestion: 'Add replaceWith parameter to guide migration',
      effort: 'trivial',
      rule: 'deprecated-no-replacement',
      tags: ['documentation', 'deprecation'],
    }));

    // lateinit var abuse
    issues.push(...this.checkLateinitAbuse(filePath, content));

    // Unchecked casts
    issues.push(...this.checkPattern(filePath, content, /\bas\s+\w+(?:<[^>]+>)?(?!\?)/g, {
      category: 'code-quality',
      severity: 'medium',
      title: 'Unchecked cast',
      description: 'Unchecked casts can throw ClassCastException at runtime',
      suggestion: 'Use safe cast (as?) with proper null handling',
      effort: 'small',
      rule: 'unchecked-cast',
      tags: ['typing', 'crash-risk'],
    }));

    // Platform types (types ending with !)
    issues.push(...this.checkPattern(filePath, content, /:\s*\w+!/g, {
      category: 'code-quality',
      severity: 'medium',
      title: 'Platform type detected',
      description: 'Platform types from Java interop have uncertain nullability',
      suggestion: 'Add explicit nullability annotations',
      effort: 'small',
      rule: 'platform-type',
      tags: ['interop', 'null-safety'],
    }));

    // TODO() function
    issues.push(...this.checkPattern(filePath, content, /\bTODO\s*\(/g, {
      category: 'code-quality',
      severity: 'high',
      title: 'TODO() function call',
      description: 'TODO() throws NotImplementedError at runtime',
      suggestion: 'Implement the functionality or remove the call',
      effort: 'medium',
      rule: 'todo-function',
      tags: ['incomplete', 'crash-risk'],
    }));

    // Mutable collections returned from functions
    issues.push(...this.checkPattern(filePath, content, /fun\s+\w+\s*\([^)]*\)\s*:\s*Mutable(List|Set|Map)</g, {
      category: 'code-quality',
      severity: 'medium',
      title: 'Mutable collection return type',
      description: 'Returning mutable collections can lead to unexpected modifications',
      suggestion: 'Return immutable collection types (List, Set, Map)',
      effort: 'small',
      rule: 'mutable-collection-return',
      tags: ['immutability', 'api-design'],
    }));

    // var for collections (should often be val)
    issues.push(...this.checkPattern(filePath, content, /\bvar\s+\w+\s*=\s*(mutableListOf|mutableSetOf|mutableMapOf|arrayListOf|hashSetOf|hashMapOf)/g, {
      category: 'code-quality',
      severity: 'low',
      title: 'Mutable collection with var',
      description: 'Using var with mutable collections is usually unnecessary',
      suggestion: 'Use val with mutable collections unless reassignment is needed',
      effort: 'trivial',
      rule: 'var-mutable-collection',
      tags: ['immutability'],
    }));

    return issues;
  }

  private checkLateinitAbuse(filePath: string, content: string): TechDebtIssue[] {
    const issues: TechDebtIssue[] = [];
    const lines = content.split('\n');
    let lateinitCount = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (/\blateinit\s+var\b/.test(line)) {
        lateinitCount++;
      }
    }

    // Flag if too many lateinit vars (potential DI issue or poor initialization)
    if (lateinitCount > 5) {
      issues.push({
        id: 'lateinit-abuse',
        category: 'architecture',
        severity: 'medium',
        file: filePath,
        title: 'Excessive lateinit usage',
        description: `File has ${lateinitCount} lateinit variables which may indicate initialization issues`,
        suggestion: 'Consider using constructor injection or lazy initialization',
        effort: 'medium',
        language: this.language,
        rule: 'lateinit-abuse',
        tags: ['architecture', 'initialization'],
      });
    }

    return issues;
  }
}
