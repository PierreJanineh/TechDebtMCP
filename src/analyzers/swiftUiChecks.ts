/**
 * SwiftUI Phase-1 tech debt checks (Issue #58) extracted from SwiftAnalyzer.
 * Covers: excessive state, @ObservedObject misuse, environment validation,
 * Combine circular references, timer cleanup, task cancellation, and main-thread safety.
 *
 * Each function accepts pre-split content lines and returns TechDebtIssue arrays.
 */

import { TechDebtIssue } from '../types/index.js';
import { escapeRegExp } from '../utils/regexUtils.js';

/**
 * Detects SwiftUI views with excessive @State variables that should be consolidated into a ViewModel.
 *
 * @param filePath - Path to the Swift source file
 * @param lines - Pre-split content lines for performance
 * @returns Array of issues when @State count > 5 per view
 */
export function checkExcessiveStateVariables(filePath: string, lines: string[]): TechDebtIssue[] {
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
        description:
          `Found ${info.count} @State variables in view '${viewName}'. State management is getting complex.`,
        suggestion: 'Consider extracting state into a @StateObject ViewModel to improve maintainability',
        effort: 'medium',
        language: 'swift',
        rule: 'swiftui-excessive-state',
        tags: ['swiftui', 'architecture', 'maintainability'],
      });
    }
  }

  return issues;
}

/**
 * Detects @ObservedObject initialized inline, which loses the object on redraws.
 * The correct fix is to use @StateObject for objects owned by the view.
 */
export function checkObservedObjectMisuse(filePath: string, lines: string[]): TechDebtIssue[] {
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
        description:
          '@ObservedObject should not be used with initialization. The view will lose the object on redraws.',
        suggestion: 'Use @StateObject instead to properly manage the lifecycle',
        effort: 'small',
        language: 'swift',
        rule: 'swiftui-state-object-misuse',
        tags: ['swiftui', 'state-management', 'bug-risk'],
      });
    }
  }

  return issues;
}

/**
 * Detects @Environment values that are force-unwrapped without validation.
 */
export function checkMissingEnvironmentValidation(
  filePath: string,
  lines: string[]
): TechDebtIssue[] {
  const issues: TechDebtIssue[] = [];
  const envDeclarationPattern = /@Environment\s*\([^)]*\)\s*var\s+(\w+)/;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(envDeclarationPattern);

    if (!match) continue;

    const envVarName = match[1];
    // Scan following lines for unsafe force unwrap usage
    const unsafePattern = new RegExp(`\\b${escapeRegExp(envVarName)}\\s*!`);

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
          suggestion:
            'Use optional binding (if let/guard let) or nil coalescing (??) to safely handle missing environment values',
          effort: 'small',
          language: 'swift',
          rule: 'swiftui-env-validation',
          tags: ['swiftui', 'safety', 'crash-risk'],
        });
        break; // Report first unsafe usage per variable
      }
    }
  }

  return issues;
}

/**
 * Detects Combine .sink calls that capture self without [weak self], risking circular references.
 */
export function checkCombineCircularReferences(
  filePath: string,
  lines: string[]
): TechDebtIssue[] {
  const issues: TechDebtIssue[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Look for .sink without [weak self]
    if (line.includes('.sink') && lines[i + 1]?.includes('self.')) {
      const context = lines.slice(Math.max(0, i), Math.min(lines.length, i + 5)).join('\n');

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
          language: 'swift',
          rule: 'swiftui-combine-circular-ref',
          tags: ['swiftui', 'memory', 'leak-risk', 'combine'],
        });
      }
    }
  }

  return issues;
}

/**
 * Detects Timer.scheduledTimer usage without cleanup in onDisappear.
 */
export function checkMissingTimerCleanup(filePath: string, lines: string[]): TechDebtIssue[] {
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
          language: 'swift',
          rule: 'swiftui-timer-cleanup',
          tags: ['swiftui', 'memory', 'lifecycle'],
        });
      }
    }
  }

  return issues;
}

/**
 * Detects Task blocks without proper cancellation or @MainActor guarding.
 */
export function checkMissingTaskCancellation(filePath: string, lines: string[]): TechDebtIssue[] {
  const issues: TechDebtIssue[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Look for Task { ... } without cancellation handling
    if (line.includes('Task {') && !line.includes('//')) {
      const hasMainActor = lines
        .slice(Math.max(0, i - 3), i)
        .some(l => l.includes('@MainActor') || l.includes('MainActor'));
      // Search a ±10 line window for evidence that the Task handle is stored/tracked.
      const searchStart = Math.max(0, i - 10);
      const searchEnd = Math.min(lines.length, i + 10);
      const hasTaskID = lines.slice(searchStart, searchEnd).some(l => (
        /\b@State\b[^\n]*\btask\b/.test(l) ||
        /\b(var|let)\s+task\s*:\s*Task\b/.test(l) ||
        /\btask\b\s*=\s*Task\s*\{/.test(l) ||
        l.includes('let task =')
      ));

      if (!hasMainActor && !hasTaskID) {
        issues.push({
          id: `task-cancel-${filePath}-${i + 1}`,
          category: 'code-quality',
          severity: 'medium',
          file: filePath,
          line: i + 1,
          title: 'Task without cancellation handling',
          description: 'Background tasks should be properly cancelled when the view disappears',
          suggestion:
            "Track the Task with @State and cancel in onDisappear, or prefer SwiftUI's " +
            '.task/.task(id:) modifiers which cancel automatically',
          effort: 'medium',
          language: 'swift',
          rule: 'swiftui-task-cancellation',
          tags: ['swiftui', 'async', 'lifecycle'],
        });
      }
    }
  }

  return issues;
}

/**
 * Detects UI updates inside Task blocks without @MainActor.
 */
export function checkMainThreadSafety(filePath: string, lines: string[]): TechDebtIssue[] {
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
          language: 'swift',
          rule: 'swiftui-main-thread-safety',
          tags: ['swiftui', 'threading', 'ui', 'bug-risk'],
        });
      }
    }
  }

  return issues;
}
