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

    // techdebt-ignore-start non-null-assertion
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
    // techdebt-ignore-end non-null-assertion

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
    // Split content once to avoid repeated allocations in each checker
    const lines = content.split('\n');
    issues.push(...this.checkExcessiveStateVariables(filePath, lines));
    issues.push(...this.checkStateObjectMisuse(filePath, lines));
    issues.push(...this.checkMissingEnvironmentValidation(filePath, lines));
    issues.push(...this.checkCombineCircularReferences(filePath, lines));
    issues.push(...this.checkMissingTimerCleanup(filePath, lines));
    issues.push(...this.checkMissingTaskCancellation(filePath, lines));
    issues.push(...this.checkMainThreadSafety(filePath, lines));
    issues.push(...this.checkMissingIdModifier(filePath, lines));
    issues.push(...this.checkExpensiveViewBodyCalculations(filePath, lines));

    // Additional SwiftUI anti-patterns (Phase 2)
    issues.push(...this.checkAnyViewMisuse(filePath, lines));
    issues.push(...this.checkNavigationLinkIssues(filePath, lines));
    issues.push(...this.checkGeometryReaderMisuse(filePath, lines));
    issues.push(...this.checkRetainCyclesInClosures(filePath, lines));
    issues.push(...this.checkDeepViewNesting(filePath, lines));

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
      // techdebt-ignore-start non-null-assertion
      const matches = line.match(/\w+!(?:\.|[\s,);}\]]|$)/g);
      // techdebt-ignore-end non-null-assertion
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

  /**
   * Detects SwiftUI views with excessive @State variables that should be consolidated into a ViewModel.
   *
   * @param filePath - Path to the Swift source file
   * @param lines - Pre-split content lines for performance
   * @returns Array of issues when @State count > 5 per view
   */
  private checkExcessiveStateVariables(filePath: string, lines: string[]): TechDebtIssue[] {
    const issues: TechDebtIssue[] = [];
    const viewStateInfo = new Map<string, { count: number; firstLine: number }>();
    let currentViewName: string | null = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Detect SwiftUI view declarations: struct SomeView: View
      const viewMatch = line.match(/^\s*struct\s+(\w+)\s*:\s*View\b/);
      if (viewMatch) {
        currentViewName = viewMatch[1];
        viewStateInfo.set(currentViewName, { count: 0, firstLine: i + 1 });
      }

      // Count @State only within detected views
      if (currentViewName && line.includes('@State')) {
        const info = viewStateInfo.get(currentViewName);
        if (info) {
          if (info.count === 0) {
            info.firstLine = i + 1;
          }
          info.count += 1;
        }
      }
    }

    // Flag views with > 5 @State variables
    for (const [viewName, info] of viewStateInfo.entries()) {
      if (info.count > 5) {
        issues.push({
          id: `excessive-state-${filePath}-${viewName}`,
          category: 'code-quality',
          severity: 'medium',
          file: filePath,
          line: info.firstLine,
          title: 'Excessive @State variables',
          description: `Found ${info.count} @State variables in view '${viewName}'. State management is getting complex.`,
          suggestion: 'Consider extracting state into a @StateObject ViewModel to improve maintainability',
          effort: 'medium',
          language: this.language,
          rule: 'swiftui-excessive-state',
          tags: ['swiftui', 'architecture', 'maintainability'],
        });
      }
    }

    return issues;
  }

  private checkStateObjectMisuse(filePath: string, lines: string[]): TechDebtIssue[] {
    const issues: TechDebtIssue[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.includes('@ObservedObject') && line.includes('= ') && !line.includes('//')) {
        issues.push({
          id: `state-object-misuse-${filePath}-${i + 1}`,
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

  private checkMissingEnvironmentValidation(filePath: string, lines: string[]): TechDebtIssue[] {
    const issues: TechDebtIssue[] = [];
    const envDeclarationPattern = /@Environment\s*\([^)]*\)\s*var\s+(\w+)/;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const match = line.match(envDeclarationPattern);

      if (!match) continue;

      const envVarName = match[1];
      // Scan following lines for unsafe force unwrap usage
      const unsafePattern = new RegExp(`\\b${envVarName}\\s*!`);

      for (let j = i + 1; j < Math.min(lines.length, i + 50); j++) {
        const usageLine = lines[j].split('//')[0]; // strip comments
        if (unsafePattern.test(usageLine)) {
          issues.push({
            id: `env-validation-${filePath}-${j + 1}`,
            category: 'code-quality',
            severity: 'high',
            file: filePath,
            line: j + 1,
            title: 'Environment value force unwrapped',
            description: '@Environment value is force unwrapped without validation, risking runtime crashes',
            suggestion: 'Use optional binding (if let/guard let) or nil coalescing (??) to safely handle missing environment values',
            effort: 'small',
            language: this.language,
            rule: 'swiftui-env-validation',
            tags: ['swiftui', 'safety', 'crash-risk'],
          });
          break; // Report first unsafe usage per variable
        }
      }
    }

    return issues;
  }

  private checkCombineCircularReferences(filePath: string, lines: string[]): TechDebtIssue[] {
    const issues: TechDebtIssue[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // Look for .sink without [weak self]
      if (line.includes('.sink') && lines[i + 1]?.includes('self.')) {
        const contextStart = Math.max(0, i);
        const contextEnd = Math.min(lines.length, i + 5);
        const context = lines.slice(contextStart, contextEnd).join('\n');

        if (!context.includes('[weak self]') && !context.includes('[unowned self]')) {
          issues.push({
            id: `combine-circular-ref-${filePath}-${i + 1}`,
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

  private checkMissingTimerCleanup(filePath: string, lines: string[]): TechDebtIssue[] {
    const issues: TechDebtIssue[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.includes('Timer.scheduledTimer')) {
        // Look ahead for cleanup in onDisappear within same range
        let hasDisappearCleanup = false;
        const searchEnd = Math.min(lines.length - 1, i + 19);

        for (let j = i; j <= searchEnd; j++) {
          if (lines[j].includes('.onDisappear') && lines[j + 1]?.includes('invalidate')) {
            hasDisappearCleanup = true;
            break;
          }
        }

        if (!hasDisappearCleanup) {
          issues.push({
            id: `timer-cleanup-${filePath}-${i + 1}`,
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

  private checkMissingTaskCancellation(filePath: string, lines: string[]): TechDebtIssue[] {
    const issues: TechDebtIssue[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // Look for Task { ... } without cancellation handling
      if (line.includes('Task {') && !line.includes('//')) {
        const hasMainActor = lines.slice(Math.max(0, i - 3), i).some(l => l.includes('@MainActor') || l.includes('MainActor'));
        const hasTaskID = line.includes('let task =') || line.includes('@State var task');

        if (!hasMainActor && !hasTaskID) {
          issues.push({
            id: `task-cancel-${filePath}-${i + 1}`,
            category: 'code-quality',
            severity: 'medium',
            file: filePath,
            line: i + 1,
            title: 'Task without cancellation handling',
            description: 'Background tasks should be properly cancelled when the view disappears',
            suggestion: 'Track the Task with @State and cancel in onDisappear, or prefer SwiftUI\'s .task/.task(id:) modifiers which cancel automatically',
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

  private checkMainThreadSafety(filePath: string, lines: string[]): TechDebtIssue[] {
    const issues: TechDebtIssue[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // Look for Task { ... self. without DispatchQueue.main
      if (line.includes('Task {') && lines[i + 1]?.includes('self.')) {
        const context = lines.slice(i, Math.min(lines.length, i + 5)).join('\n');

        if (!context.includes('DispatchQueue.main') && !context.includes('@MainActor')) {
          issues.push({
            id: `main-thread-safety-${filePath}-${i + 1}`,
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

  private checkMissingIdModifier(filePath: string, lines: string[]): TechDebtIssue[] {
    const issues: TechDebtIssue[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // Look for ForEach with dynamic list but no .id()
      if (line.includes('ForEach(') && (line.includes('items') || line.includes('data'))) {
        const nextLines = lines.slice(i, Math.min(lines.length, i + 3)).join('\n');

        if (!nextLines.includes('.id(') && !line.includes('id: ')) {
          issues.push({
            id: `missing-id-${filePath}-${i + 1}`,
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

  private checkExpensiveViewBodyCalculations(filePath: string, lines: string[]): TechDebtIssue[] {
    const issues: TechDebtIssue[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // Look for reduce, sort, filter in view body
      if (line.includes('var body:') || (i > 0 && lines[i - 1]?.includes('var body:'))) {
        const viewBodyLines = lines.slice(i, Math.min(lines.length, i + 50)).join('\n');

        if (viewBodyLines.includes('.reduce(') || viewBodyLines.includes('.sorted') ||
            (viewBodyLines.includes('.filter') && viewBodyLines.includes('Text('))) {
          issues.push({
            id: `expensive-calculation-${filePath}-${i + 1}`,
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

  private checkAnyViewMisuse(filePath: string, lines: string[]): TechDebtIssue[] {
    const issues: TechDebtIssue[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.includes('AnyView(') && !line.includes('//')) {
        issues.push({
          id: `anyview-misuse-${filePath}-${i + 1}`,
          category: 'code-quality',
          severity: 'medium',
          file: filePath,
          line: i + 1,
          title: 'AnyView type erasure used',
          description: 'AnyView erases type information and can impact performance and type safety',
          suggestion: 'Use generics or @ViewBuilder instead of AnyView for better type safety and performance',
          effort: 'medium',
          language: this.language,
          rule: 'swiftui-anyview-misuse',
          tags: ['swiftui', 'type-safety', 'performance'],
        });
      }
    }

    return issues;
  }

  private checkNavigationLinkIssues(filePath: string, lines: string[]): TechDebtIssue[] {
    const issues: TechDebtIssue[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.includes('NavigationLink(') && line.includes('destination:')) {
        if (!line.includes('isActive') && !line.includes('tag:')) {
          issues.push({
            id: `navigationlink-deprecated-${filePath}-${i + 1}`,
            category: 'code-quality',
            severity: 'medium',
            file: filePath,
            line: i + 1,
            title: 'Deprecated NavigationLink pattern',
            description: 'Old-style NavigationLink without proper state binding can cause issues',
            suggestion: 'Use NavigationLink with tag:selection: or the new navigation stack APIs in iOS 16+',
            effort: 'medium',
            language: this.language,
            rule: 'swiftui-navigationlink-deprecated',
            tags: ['swiftui', 'navigation', 'deprecation'],
          });
        }
      }
    }

    return issues;
  }

  private checkGeometryReaderMisuse(filePath: string, lines: string[]): TechDebtIssue[] {
    const issues: TechDebtIssue[] = [];

    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('var body:') || (i > 0 && lines[i - 1]?.includes('var body:'))) {
        const nextLines = lines.slice(i, Math.min(lines.length, i + 3)).join('\n');

        if (nextLines.includes('GeometryReader') && !nextLines.includes('.frame(')) {
          issues.push({
            id: `geometryreader-root-${filePath}-${i + 1}`,
            category: 'performance',
            severity: 'medium',
            file: filePath,
            line: i + 1,
            title: 'GeometryReader at view root',
            description: 'Using GeometryReader at the root can cause performance issues and layout recalculations',
            suggestion: 'Move GeometryReader deeper or use .frame() modifier instead',
            effort: 'medium',
            language: this.language,
            rule: 'swiftui-geometryreader-root',
            tags: ['swiftui', 'performance', 'layout'],
          });
        }
      }
    }

    return issues;
  }

  private checkRetainCyclesInClosures(filePath: string, lines: string[]): TechDebtIssue[] {
    const issues: TechDebtIssue[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if ((line.includes('.onChange(') || line.includes('.onReceive(') || line.includes('.task(')) &&
          lines[i + 1]?.includes('self.')) {
        const context = lines.slice(i, Math.min(lines.length, i + 5)).join('\n');

        if (!context.includes('[weak self]') && !context.includes('[unowned self]')) {
          issues.push({
            id: `retain-cycle-closure-${filePath}-${i + 1}`,
            category: 'code-quality',
            severity: 'high',
            file: filePath,
            line: i + 1,
            title: 'Potential retain cycle in SwiftUI closure',
            description: 'Using self in SwiftUI modifiers without [weak self] can cause memory leaks',
            suggestion: 'Add [weak self] to the closure or use optional chaining with self?',
            effort: 'small',
            language: this.language,
            rule: 'swiftui-retain-cycle-closure',
            tags: ['swiftui', 'memory', 'leak-risk'],
          });
        }
      }
    }

    return issues;
  }

  private checkDeepViewNesting(filePath: string, lines: string[]): TechDebtIssue[] {
    const issues: TechDebtIssue[] = [];

    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('var body:')) {
        let maxDepth = 0;
        let currentDepth = 0;
        const bodyStart = i;
        const bodyEnd = Math.min(lines.length, i + 100);

        for (let j = bodyStart; j < bodyEnd; j++) {
          const line = lines[j];

          if (line.includes('VStack') || line.includes('HStack') || line.includes('ZStack') ||
              line.includes('Group') || line.includes('GeometryReader') || line.includes('ForEach') ||
              line.includes('{')) {
            currentDepth += (line.match(/{/g) || []).length;
          }

          if (line.includes('}')) {
            currentDepth -= (line.match(/}/g) || []).length;
          }

          maxDepth = Math.max(maxDepth, currentDepth);

          if (j > bodyStart && currentDepth <= 0) break;
        }

        if (maxDepth > 6) {
          issues.push({
            id: `deep-nesting-${filePath}-${i + 1}`,
            category: 'maintainability',
            severity: 'medium',
            file: filePath,
            line: i + 1,
            title: 'Deep view nesting detected',
            description: `View nesting depth of ${maxDepth} levels makes the code hard to read and maintain`,
            suggestion: 'Extract nested views into separate subviews or use ViewBuilder for complex compositions',
            effort: 'medium',
            language: this.language,
            rule: 'swiftui-deep-nesting',
            tags: ['swiftui', 'maintainability', 'readability'],
          });
        }
      }
    }

    return issues;
  }
}
