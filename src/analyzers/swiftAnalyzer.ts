import { TechDebtIssue, TechDebtConfig } from '../types/index.js';
import { BaseAnalyzer } from './baseAnalyzer.js';

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

    // SwiftUI-specific checks (Phase: Issue #58)
    issues.push(...this.checkExcessiveStateVariables(filePath, content));
    issues.push(...this.checkStateObjectMisuse(filePath, content));
    issues.push(...this.checkMissingEnvironmentValidation(filePath, content));
    issues.push(...this.checkCombineCircularReferences(filePath, content));
    issues.push(...this.checkMissingTimerCleanup(filePath, content));
    issues.push(...this.checkMissingTaskCancellation(filePath, content));
    issues.push(...this.checkMainThreadSafety(filePath, content));
    issues.push(...this.checkMissingIdModifier(filePath, content));
    issues.push(...this.checkExpensiveViewBodyCalculations(filePath, content));

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

        if (!context.includes('[weak self]') &&
            !context.includes('[unowned self]') &&
            !context.includes('struct ') &&
            !context.includes('static ')) {
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

  // SwiftUI-Specific Checks (Issue #58)

  private checkExcessiveStateVariables(filePath: string, content: string): TechDebtIssue[] {
    const issues: TechDebtIssue[] = [];
    const lines = content.split('\n');
    let stateVarCount = 0;
    const stateVarLines: number[] = [];

    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('@State')) {
        stateVarCount++;
        stateVarLines.push(i + 1);
      }
    }

    // Flag if more than 5 @State variables in a view
    if (stateVarCount > 5) {
      issues.push({
        id: `excessive-state-${filePath}`,
        category: 'code-quality',
        severity: 'medium',
        file: filePath,
        line: stateVarLines[0],
        title: 'Excessive @State variables',
        description: `Found ${stateVarCount} @State variables in this view. State management is getting complex.`,
        suggestion: 'Consider extracting state into a @StateObject ViewModel to improve maintainability',
        effort: 'medium',
        language: this.language,
        rule: 'swiftui-excessive-state',
        tags: ['swiftui', 'architecture', 'maintainability'],
      });
    }

    return issues;
  }

  private checkStateObjectMisuse(filePath: string, content: string): TechDebtIssue[] {
    const issues: TechDebtIssue[] = [];
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // Look for @ObservedObject var viewModel = SomeClass()
      if (line.includes('@ObservedObject') && line.includes('= ') && !line.includes('//')) {
        issues.push({
          id: `state-object-misuse-${i + 1}`,
          category: 'code-quality',
          severity: 'high',
          file: filePath,
          line: i + 1,
          title: '@ObservedObject with initialization found',
          description: '@ObservedObject should not be used with initialization. The view will lose the object on redraws.',
          suggestion: 'Use @StateObject instead to properly manage the lifecycle',
          effort: 'small',
          language: this.language,
          rule: 'swiftui-state-object-misuse',
          tags: ['swiftui', 'state-management', 'bug-risk'],
        });
      }
    }

    return issues;
  }

  private checkMissingEnvironmentValidation(filePath: string, content: string): TechDebtIssue[] {
    const issues: TechDebtIssue[] = [];
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // Look for @Environment without nil coalescing
      if (line.includes('@Environment') && lines[i + 1]?.includes('var') && !line.includes('??')) {
        issues.push({
          id: `env-validation-${i + 1}`,
          category: 'code-quality',
          severity: 'low',
          file: filePath,
          line: i + 1,
          title: 'Environment value may not be validated',
          description: 'Environment values might not be available in all contexts',
          suggestion: 'Consider using nil coalescing (??) or optional binding for safety',
          effort: 'small',
          language: this.language,
          rule: 'swiftui-env-validation',
          tags: ['swiftui', 'safety'],
        });
      }
    }

    return issues;
  }

  private checkCombineCircularReferences(filePath: string, content: string): TechDebtIssue[] {
    const issues: TechDebtIssue[] = [];
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // Look for .sink without [weak self]
      if (line.includes('.sink') && lines[i + 1]?.includes('self.')) {
        const contextStart = Math.max(0, i);
        const contextEnd = Math.min(lines.length, i + 5);
        const context = lines.slice(contextStart, contextEnd).join('\n');

        if (!context.includes('[weak self]') && !context.includes('[unowned self]')) {
          issues.push({
            id: `combine-circular-ref-${i + 1}`,
            category: 'code-quality',
            severity: 'high',
            file: filePath,
            line: i + 1,
            title: 'Potential circular reference in Combine sink',
            description: 'Using self in Combine sink without [weak self] can cause memory leaks',
            suggestion: 'Add [weak self] to the sink closure: .sink { [weak self] completion in',
            effort: 'small',
            language: this.language,
            rule: 'swiftui-combine-circular-ref',
            tags: ['swiftui', 'memory', 'leak-risk', 'combine'],
          });
        }
      }
    }

    return issues;
  }

  private checkMissingTimerCleanup(filePath: string, content: string): TechDebtIssue[] {
    const issues: TechDebtIssue[] = [];
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // Look for Timer.scheduledTimer without onDisappear cleanup
      if (line.includes('Timer.scheduledTimer')) {
        const hasDisappearCleanup = lines.slice(i, Math.min(lines.length, i + 20)).some(l =>
          l.includes('.onDisappear') && lines[lines.indexOf(l) + 1]?.includes('invalidate')
        );

        if (!hasDisappearCleanup) {
          issues.push({
            id: `timer-cleanup-${i + 1}`,
            category: 'code-quality',
            severity: 'medium',
            file: filePath,
            line: i + 1,
            title: 'Timer without cleanup in onDisappear',
            description: 'Timer must be invalidated when the view disappears to prevent memory leaks',
            suggestion: 'Add .onDisappear { timer?.invalidate() } to the view',
            effort: 'small',
            language: this.language,
            rule: 'swiftui-timer-cleanup',
            tags: ['swiftui', 'memory', 'lifecycle'],
          });
        }
      }
    }

    return issues;
  }

  private checkMissingTaskCancellation(filePath: string, content: string): TechDebtIssue[] {
    const issues: TechDebtIssue[] = [];
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // Look for Task { ... } without cancellation handling
      if (line.includes('Task {') && !line.includes('//')) {
        const hasMainActor = lines.slice(Math.max(0, i - 3), i).some(l => l.includes('@MainActor') || l.includes('MainActor'));
        const hasTaskID = line.includes('let task =') || line.includes('@State var task');

        if (!hasMainActor && !hasTaskID) {
          issues.push({
            id: `task-cancel-${i + 1}`,
            category: 'code-quality',
            severity: 'medium',
            file: filePath,
            line: i + 1,
            title: 'Task without cancellation handling',
            description: 'Background tasks should be properly cancelled when the view disappears',
            suggestion: 'Either track the Task with @State and cancel in onDisappear, or use @MainActor',
            effort: 'medium',
            language: this.language,
            rule: 'swiftui-task-cancellation',
            tags: ['swiftui', 'async', 'lifecycle'],
          });
        }
      }
    }

    return issues;
  }

  private checkMainThreadSafety(filePath: string, content: string): TechDebtIssue[] {
    const issues: TechDebtIssue[] = [];
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // Look for Task { ... self. without DispatchQueue.main
      if (line.includes('Task {') && lines[i + 1]?.includes('self.')) {
        const context = lines.slice(i, Math.min(lines.length, i + 5)).join('\n');

        if (!context.includes('DispatchQueue.main') && !context.includes('@MainActor')) {
          issues.push({
            id: `main-thread-safety-${i + 1}`,
            category: 'code-quality',
            severity: 'high',
            file: filePath,
            line: i + 1,
            title: 'UI update on background thread',
            description: 'Updating @State properties from a background task can cause UI inconsistencies',
            suggestion: 'Wrap UI updates with DispatchQueue.main.async or use @MainActor',
            effort: 'small',
            language: this.language,
            rule: 'swiftui-main-thread-safety',
            tags: ['swiftui', 'threading', 'ui', 'bug-risk'],
          });
        }
      }
    }

    return issues;
  }

  private checkMissingIdModifier(filePath: string, content: string): TechDebtIssue[] {
    const issues: TechDebtIssue[] = [];
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // Look for ForEach with dynamic list but no .id()
      if (line.includes('ForEach(') && (line.includes('items') || line.includes('data'))) {
        const nextLines = lines.slice(i, Math.min(lines.length, i + 3)).join('\n');

        if (!nextLines.includes('.id(') && !line.includes('id: ')) {
          issues.push({
            id: `missing-id-${i + 1}`,
            category: 'code-quality',
            severity: 'medium',
            file: filePath,
            line: i + 1,
            title: 'ForEach without explicit .id() modifier',
            description: 'Dynamic ForEach loops should have stable identifiers for proper animation and state handling',
            suggestion: 'Add .id(item.id) to the ForEach or use id parameter',
            effort: 'small',
            language: this.language,
            rule: 'swiftui-missing-id',
            tags: ['swiftui', 'performance', 'correctness'],
          });
        }
      }
    }

    return issues;
  }

  private checkExpensiveViewBodyCalculations(filePath: string, content: string): TechDebtIssue[] {
    const issues: TechDebtIssue[] = [];
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // Look for reduce, sort, filter in view body
      if (line.includes('var body:') || (i > 0 && lines[i - 1]?.includes('var body:'))) {
        const viewBodyLines = lines.slice(i, Math.min(lines.length, i + 50)).join('\n');

        if (viewBodyLines.includes('.reduce(') || viewBodyLines.includes('.sorted') ||
            (viewBodyLines.includes('.filter') && viewBodyLines.includes('Text('))) {
          issues.push({
            id: `expensive-calculation-${i + 1}`,
            category: 'performance',
            severity: 'medium',
            file: filePath,
            line: i + 1,
            title: 'Expensive calculation in view body',
            description: 'Heavy computations like reduce, sort, or filter in the body recalculate on every view update',
            suggestion: 'Move calculations to a computed property or use @State/@Published',
            effort: 'medium',
            language: this.language,
            rule: 'swiftui-expensive-calculation',
            tags: ['swiftui', 'performance', 'optimization'],
          });
        }
      }
    }

    return issues;
  }
}
