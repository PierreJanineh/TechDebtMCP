/**
 * SwiftUI Phase-2 tech debt checks (Issue #58) extracted from SwiftAnalyzer.
 * Covers: ForEach ID modifier, expensive view-body calculations, AnyView misuse,
 * deprecated NavigationLink patterns, GeometryReader misuse, retain cycles in
 * closures, and deep view nesting.
 *
 * Each function accepts pre-split content lines and returns TechDebtIssue arrays.
 */

import { TechDebtIssue } from '../types/index.js';

/**
 * Detects ForEach loops over dynamic data without explicit .id() or id: parameter.
 */
export function checkMissingIdModifier(filePath: string, lines: string[]): TechDebtIssue[] {
  const issues: TechDebtIssue[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Look for ForEach with dynamic list but no .id()
    if (line.includes('ForEach(') && (line.includes('items') || line.includes('data'))) {
      const nextLines = lines.slice(i, Math.min(lines.length, i + 3)).join('\n');

      if (!nextLines.includes('.id(') && !/\bid\s*:/.test(nextLines)) {
        issues.push({
          id: `missing-id-${filePath}-${i + 1}`,
          category: 'code-quality',
          severity: 'medium',
          file: filePath,
          line: i + 1,
          title: 'ForEach without explicit .id() modifier',
          description:
            'Dynamic ForEach loops should have stable identifiers for proper animation and state handling',
          suggestion: 'Add .id(item.id) to the ForEach or use id parameter',
          effort: 'small',
          language: 'swift',
          rule: 'swiftui-missing-id',
          tags: ['swiftui', 'performance', 'correctness'],
        });
      }
    }
  }

  return issues;
}

/**
 * Detects expensive operations (reduce, sorted, filter) inside the view body.
 */
export function checkExpensiveViewBodyCalculations(
  filePath: string,
  lines: string[]
): TechDebtIssue[] {
  const issues: TechDebtIssue[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Look for reduce, sort, filter in view body
    if (line.includes('var body:') || (i > 0 && lines[i - 1]?.includes('var body:'))) {
      const viewBodyLines = lines.slice(i, Math.min(lines.length, i + 50)).join('\n');

      if (
        viewBodyLines.includes('.reduce(') ||
        viewBodyLines.includes('.sorted') ||
        (viewBodyLines.includes('.filter') && viewBodyLines.includes('Text('))
      ) {
        issues.push({
          id: `expensive-calculation-${filePath}-${i + 1}`,
          category: 'performance',
          severity: 'medium',
          file: filePath,
          line: i + 1,
          title: 'Expensive calculation in view body',
          description:
            'Heavy computations like reduce, sort, or filter in the body recalculate on every view update',
          suggestion: 'Move calculations to a computed property or use @State/@Published',
          effort: 'medium',
          language: 'swift',
          rule: 'swiftui-expensive-calculation',
          tags: ['swiftui', 'performance', 'optimization'],
        });
      }
    }
  }

  return issues;
}

/**
 * Detects AnyView type erasure which can hurt performance and type safety.
 */
export function checkAnyViewMisuse(filePath: string, lines: string[]): TechDebtIssue[] {
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
        suggestion:
          'Use generics or @ViewBuilder instead of AnyView for better type safety and performance',
        effort: 'medium',
        language: 'swift',
        rule: 'swiftui-anyview-misuse',
        tags: ['swiftui', 'type-safety', 'performance'],
      });
    }
  }

  return issues;
}

/**
 * Detects deprecated NavigationLink usage without state binding.
 */
export function checkNavigationLinkIssues(filePath: string, lines: string[]): TechDebtIssue[] {
  const issues: TechDebtIssue[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes('NavigationLink(')) {
      const lookaheadEnd = Math.min(lines.length, i + 5);
      const navContext = lines.slice(i, lookaheadEnd).join('\n');

      if (
        navContext.includes('destination:') &&
        !navContext.includes('isActive:') &&
        !navContext.includes('tag:') &&
        !navContext.includes('selection:')
      ) {
        issues.push({
          id: `navigationlink-deprecated-${filePath}-${i + 1}`,
          category: 'code-quality',
          severity: 'medium',
          file: filePath,
          line: i + 1,
          title: 'Deprecated NavigationLink pattern',
          description: 'Old-style NavigationLink without proper state binding can cause issues',
          suggestion:
            'Use NavigationLink with tag:selection: or the new navigation stack APIs in iOS 16+',
          effort: 'medium',
          language: 'swift',
          rule: 'swiftui-navigationlink-deprecated',
          tags: ['swiftui', 'navigation', 'deprecation'],
        });
      }
    }
  }

  return issues;
}

/**
 * Detects GeometryReader used at the root of a view body, which causes layout recalculations.
 */
export function checkGeometryReaderMisuse(filePath: string, lines: string[]): TechDebtIssue[] {
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
          description:
            'Using GeometryReader at the root can cause performance issues and layout recalculations',
          suggestion: 'Move GeometryReader deeper or use .frame() modifier instead',
          effort: 'medium',
          language: 'swift',
          rule: 'swiftui-geometryreader-root',
          tags: ['swiftui', 'performance', 'layout'],
        });
      }
    }
  }

  return issues;
}

/**
 * Detects retain cycles in SwiftUI modifiers (.onChange, .onReceive, .task) via unguarded self.
 */
export function checkRetainCyclesInClosures(filePath: string, lines: string[]): TechDebtIssue[] {
  const issues: TechDebtIssue[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (
      (line.includes('.onChange(') || line.includes('.onReceive(') || line.includes('.task(')) &&
      lines[i + 1]?.includes('self.')
    ) {
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
          language: 'swift',
          rule: 'swiftui-retain-cycle-closure',
          tags: ['swiftui', 'memory', 'leak-risk'],
        });
      }
    }
  }

  return issues;
}

/**
 * Detects deeply nested view hierarchies (depth > 6) that hurt readability.
 */
export function checkDeepViewNesting(filePath: string, lines: string[]): TechDebtIssue[] {
  const issues: TechDebtIssue[] = [];

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('var body:')) {
      let maxDepth = 0;
      let currentDepth = 0;
      const bodyStart = i;
      const bodyEnd = Math.min(lines.length, i + 100);

      for (let j = bodyStart; j < bodyEnd; j++) {
        const line = lines[j];

        if (
          line.includes('VStack') || line.includes('HStack') || line.includes('ZStack') ||
          line.includes('Group') || line.includes('GeometryReader') || line.includes('ForEach') ||
          line.includes('{')
        ) {
          currentDepth += (line.match(/{/g) ?? []).length;
        }

        if (line.includes('}')) {
          currentDepth -= (line.match(/}/g) ?? []).length;
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
          suggestion:
            'Extract nested views into separate subviews or use ViewBuilder for complex compositions',
          effort: 'medium',
          language: 'swift',
          rule: 'swiftui-deep-nesting',
          tags: ['swiftui', 'maintainability', 'readability'],
        });
      }
    }
  }

  return issues;
}
