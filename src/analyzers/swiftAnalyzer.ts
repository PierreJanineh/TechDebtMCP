import { TechDebtIssue, TechDebtConfig } from '../types/index.js';
import { BaseAnalyzer } from './baseAnalyzer.js';
import {
  checkExcessiveStateVariables,
  checkObservedObjectMisuse,
  checkMissingEnvironmentValidation,
  checkCombineCircularReferences,
  checkMissingTimerCleanup,
  checkMissingTaskCancellation,
  checkMainThreadSafety,
} from './swiftUiChecks.js';
import {
  checkMissingIdModifier,
  checkExpensiveViewBodyCalculations,
  checkAnyViewMisuse,
  checkNavigationLinkIssues,
  checkGeometryReaderMisuse,
  checkRetainCyclesInClosures,
  checkDeepViewNesting,
} from './swiftUiChecksPhase2.js';

/**
 * Swift-specific analyzer
 */
export class SwiftAnalyzer extends BaseAnalyzer {
  constructor(config: TechDebtConfig = {}) {
    super('swift', config);
  }

  protected async performLanguageSpecificChecks(
    filePath: string,
    content: string
  ): Promise<TechDebtIssue[]> {
    const issues: TechDebtIssue[] = [];

    // Force unwrap (!)
    issues.push(...this.checkForceUnwrap(filePath, content));

    // Force cast (as!)
    issues.push(...this.checkPattern(filePath, content, /\bas!\s*\w+/g, {
      category: 'code-quality',
      severity: 'high',
      title: 'Force cast (as!) used',
      description: 'Force casting can cause runtime crashes if the cast fails',
      suggestion: 'Use optional casting (as?) with proper nil handling',
      effort: 'small',
      rule: 'force-cast',
      tags: ['safety', 'crash-risk'],
    }));

    // Force try (try!)
    issues.push(...this.checkPattern(filePath, content, /\btry!\s+/g, {
      category: 'code-quality',
      severity: 'high',
      title: 'Force try (try!) used',
      description: 'Force try will crash if the function throws an error',
      suggestion: 'Use do-catch block or try? with proper error handling',
      effort: 'small',
      rule: 'force-try',
      tags: ['safety', 'crash-risk', 'error-handling'],
    }));

    // Implicitly unwrapped optionals
    issues.push(...this.checkImplicitlyUnwrapped(filePath, content));

    // print statements
    issues.push(...this.checkPattern(filePath, content, /\bprint\s*\(/g, {
      category: 'code-quality',
      severity: 'low',
      title: 'print() statement found',
      description: 'print() should be removed or replaced with proper logging',
      suggestion: 'Use os_log or a logging framework in production code',
      effort: 'trivial',
      rule: 'print-statement',
      tags: ['debug', 'cleanup'],
    }));

    // NSLog statements
    issues.push(...this.checkPattern(filePath, content, /\bNSLog\s*\(/g, {
      category: 'code-quality',
      severity: 'low',
      title: 'NSLog() statement found',
      description: 'NSLog is slow and should be replaced with os_log',
      suggestion: 'Use os_log or Logger for better performance',
      effort: 'small',
      rule: 'nslog-statement',
      tags: ['performance', 'logging'],
    }));

    // swiftlint:disable
    issues.push(...this.checkPattern(filePath, content, /\/\/\s*swiftlint:disable(?!\s+\w)/g, {
      category: 'code-quality',
      severity: 'medium',
      title: 'SwiftLint disabled without specific rule',
      description: 'Disabling SwiftLint without specifying rules may hide issues',
      suggestion: 'Specify which rules to disable',
      effort: 'trivial',
      rule: 'swiftlint-disable',
      tags: ['linting'],
    }));

    // Any and AnyObject
    issues.push(...this.checkPattern(filePath, content, /:\s*Any\b(?!Object)/g, {
      category: 'code-quality',
      severity: 'medium',
      title: 'Any type used',
      description: 'Using Any defeats type safety',
      suggestion: 'Use protocols or generics for type-safe code',
      effort: 'medium',
      rule: 'any-type',
      tags: ['typing', 'type-safety'],
    }));

    // Retain cycle risk (self in closures without [weak self])
    issues.push(...this.checkRetainCycleRisk(filePath, content));

    // fatalError
    issues.push(...this.checkPattern(filePath, content, /\bfatalError\s*\(/g, {
      category: 'code-quality',
      severity: 'high',
      title: 'fatalError() usage',
      description: 'fatalError() will crash the app at runtime',
      suggestion: 'Handle the error gracefully or use assertions only for development',
      effort: 'medium',
      rule: 'fatal-error',
      tags: ['crash-risk', 'error-handling'],
    }));

    // Deprecated APIs (common ones)
    issues.push(...this.checkPattern(filePath, content, /UIWebView/g, {
      category: 'dependency',
      severity: 'high',
      title: 'Deprecated UIWebView usage',
      description: 'UIWebView is deprecated and will cause App Store rejection',
      suggestion: 'Migrate to WKWebView',
      effort: 'large',
      rule: 'deprecated-uiwebview',
      tags: ['deprecation', 'app-store'],
    }));

    // SwiftUI-specific checks — delegate to swiftUiChecks.ts and swiftUiChecksPhase2.ts
    // Split content once to avoid repeated allocations in each checker
    const lines = content.split('\n');
    issues.push(...checkExcessiveStateVariables(filePath, lines));
    issues.push(...checkObservedObjectMisuse(filePath, lines));
    issues.push(...checkMissingEnvironmentValidation(filePath, lines));
    issues.push(...checkCombineCircularReferences(filePath, lines));
    issues.push(...checkMissingTimerCleanup(filePath, lines));
    issues.push(...checkMissingTaskCancellation(filePath, lines));
    issues.push(...checkMainThreadSafety(filePath, lines));
    issues.push(...checkMissingIdModifier(filePath, lines));
    issues.push(...checkExpensiveViewBodyCalculations(filePath, lines));
    issues.push(...checkAnyViewMisuse(filePath, lines));
    issues.push(...checkNavigationLinkIssues(filePath, lines));
    issues.push(...checkGeometryReaderMisuse(filePath, lines));
    issues.push(...checkRetainCyclesInClosures(filePath, lines));
    issues.push(...checkDeepViewNesting(filePath, lines));

    return issues;
  }

  private checkForceUnwrap(filePath: string, content: string): TechDebtIssue[] {
    const issues: TechDebtIssue[] = [];
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // Match force unwrap but exclude != and !== and comments
      if (line.trim().startsWith('//')) continue;

      // Match patterns like variable! or expression! but not as! or try!
      const matches = line.match(/\w+!(?:\.|[\s,);}\]]|$)/g);
      if (matches) {
        // Filter out common false positives
        const realMatches = matches.filter(m =>
          !m.startsWith('try') &&
          !m.startsWith('as') &&
          !line.includes('!=')
        );

        if (realMatches.length > 0) {
          issues.push({
            id: `force-unwrap-${i + 1}`,
            category: 'code-quality',
            severity: 'high',
            file: filePath,
            line: i + 1,
            title: 'Force unwrap (!) used',
            description: 'Force unwrapping optionals can cause crashes if the value is nil',
            suggestion: 'Use if-let, guard-let, or optional chaining (?.) instead',
            effort: 'small',
            language: this.language,
            rule: 'force-unwrap',
            tags: ['safety', 'crash-risk'],
          });
        }
      }
    }

    return issues;
  }

  private checkRetainCycleRisk(filePath: string, content: string): TechDebtIssue[] {
    const issues: TechDebtIssue[] = [];
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // Look for closures using self without weak/unowned
      if (line.includes('{') && line.includes('self.')) {
        // Check if there's [weak self] or [unowned self] nearby
        const contextStart = Math.max(0, i - 2);
        const context = lines.slice(contextStart, i + 1).join('\n');

        if (
          !context.includes('[weak self]') &&
          !context.includes('[unowned self]') &&
          !context.includes('struct ') &&
          !context.includes('static ')
        ) {
          issues.push({
            id: `retain-cycle-risk-${i + 1}`,
            category: 'code-quality',
            severity: 'medium',
            file: filePath,
            line: i + 1,
            title: 'Potential retain cycle',
            description: 'Using self in closure without [weak self] may cause memory leak',
            suggestion: 'Use [weak self] or [unowned self] in closures',
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

  private checkImplicitlyUnwrapped(filePath: string, content: string): TechDebtIssue[] {
    const issues: TechDebtIssue[] = [];
    const lines = content.split('\n');
    // Match type declarations like `: String!` but not `!=`
    const pattern = /:\s*\w+\s*!/;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.trim().startsWith('//')) continue;
      if (line.includes('!=')) continue; // Skip not-equal comparisons

      if (pattern.test(line) && !line.includes('= ')) {
        issues.push({
          id: `implicitly-unwrapped-${i + 1}`,
          category: 'code-quality',
          severity: 'medium',
          file: filePath,
          line: i + 1,
          title: 'Implicitly unwrapped optional',
          description: 'Implicitly unwrapped optionals can cause crashes if nil',
          suggestion: 'Use regular optionals with proper unwrapping',
          effort: 'small',
          language: this.language,
          rule: 'implicitly-unwrapped',
          tags: ['safety', 'crash-risk'],
        });
      }
    }

    return issues;
  }
}
