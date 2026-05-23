import { TechDebtIssue, CustomPattern, Severity, DebtCategory, SupportedLanguage } from '../types/index.js';
import { buildBlockSuppressionMap, isLineSuppressed } from '../analyzers/baseAnalyzer.js';

/**
 * Valid severity levels for validation
 */
const VALID_SEVERITIES: Severity[] = ['low', 'medium', 'high', 'critical'];

/**
 * Valid debt categories for validation
 */
const VALID_CATEGORIES: DebtCategory[] = [
  'dependency',
  'code-quality',
  'architecture',
  'documentation',
  'testing',
  'security',
  'performance',
  'maintainability',
];

/**
 * Maximum allowed character length for a user-supplied regex pattern string.
 * Patterns longer than this are rejected to prevent DoS via large patterns.
 */
export const MAX_PATTERN_LENGTH = 1_000;

/**
 * Allowlisted regex flag characters (single source of truth).
 * Covers all flags supported by Node.js 18+: d, g, i, m, s, u, y.
 * Also includes the `v` (unicodeSets) flag introduced in Node.js 20 (V8 11.0).
 * Note: `u` and `v` are mutually exclusive — using both is a SyntaxError.
 */
const ALLOWED_FLAGS = 'dgimsuvy';

/**
 * Pre-compiled regex derived from ALLOWED_FLAGS for fast validation.
 */
const ALLOWED_FLAGS_RE = new RegExp(`^[${ALLOWED_FLAGS}]*$`);

/**
 * Maximum allowed character length for the inline `code` parameter passed to
 * `execute_custom_rules`. This caps the input fed to regex matching per call.
 * Enforced using JavaScript string length semantics (`string.length`).
 */
export const MAX_CODE_LENGTH = 500_000;

/**
 * Maximum allowed file size in bytes for `path` inputs to `execute_custom_rules`.
 * Compared against `fs.Stats.size` before reading the file into memory.
 */
export const MAX_FILE_SIZE_BYTES = 500_000;

/**
 * Custom Rules Engine
 * Allows users to define and execute custom pattern-based tech debt checks
 */
export class CustomRulesEngine {
  private rules: Map<string, CustomPattern> = new Map();
  private onRuleError?: (ruleId: string, error: Error) => void;

  constructor(patterns?: CustomPattern[], onRuleError?: (ruleId: string, error: Error) => void) {
    if (patterns) {
      patterns.forEach(pattern => this.addRule(pattern));
    }
    this.onRuleError = onRuleError;
  }

  /**
   * Add a custom rule
   */
  addRule(pattern: CustomPattern): void {
    this.rules.set(pattern.id, pattern);
  }

  /**
   * Remove a custom rule
   */
  removeRule(ruleId: string): boolean {
    return this.rules.delete(ruleId);
  }

  /**
   * Get a specific rule
   */
  getRule(ruleId: string): CustomPattern | undefined {
    return this.rules.get(ruleId);
  }

  /**
   * Get all rules
   */
  getAllRules(): CustomPattern[] {
    return Array.from(this.rules.values());
  }

  /**
   * Check if a rule exists
   */
  hasRule(ruleId: string): boolean {
    return this.rules.has(ruleId);
  }

  /**
   * Clear all rules
   */
  clearRules(): void {
    this.rules.clear();
  }

  /**
   * Execute all custom rules against code
   */
  executeRules(
    filePath: string,
    content: string,
    language?: SupportedLanguage
  ): TechDebtIssue[] {
    const issues: TechDebtIssue[] = [];
    const lines = content.split(/\r?\n/);
    const blockMap = buildBlockSuppressionMap(lines);

    this.rules.forEach(pattern => {
      // Skip if language filter is specified and either language is missing or doesn't match
      if (Array.isArray(pattern.languages) && (!language || !pattern.languages.includes(language))) {
        return;
      }

      // Execute the pattern check
      const patternIssues = this.executePattern(filePath, lines, blockMap, pattern);
      issues.push(...patternIssues);
    });

    return issues;
  }

  /**
   * Execute a single pattern against code
   */
  private executePattern(
    filePath: string,
    lines: string[],
    blockMap: Map<number, Set<string>>,
    pattern: CustomPattern
  ): TechDebtIssue[] {
    try {
      if (pattern.pattern.length > MAX_PATTERN_LENGTH) {
        if (this.onRuleError) {
          this.onRuleError(pattern.id, new Error(`Pattern exceeds maximum length of ${MAX_PATTERN_LENGTH} characters`));
        }
        return [];
      }
      const sanitizedFlags = (pattern.flags ?? '').replace(new RegExp(`[^${ALLOWED_FLAGS}]`, 'g'), '');

      if (sanitizedFlags.includes('u') && sanitizedFlags.includes('v')) {
        if (this.onRuleError) {
          this.onRuleError(
            pattern.id,
            new Error(`Pattern flags cannot include both "u" and "v": "${sanitizedFlags}"`)
          );
        }
        return [];
      }

      const safeFlags = sanitizedFlags || 'g';
      const regex = new RegExp(pattern.pattern, safeFlags);
      return lines.flatMap((line, index) => {
        if (isLineSuppressed(lines, index, pattern.id, blockMap)) return [];
        return this.matchLineIssues(filePath, line, index + 1, regex, pattern);
      });
    } catch (error) {
      if (this.onRuleError) {
        this.onRuleError(pattern.id, error instanceof Error ? error : new Error(String(error)));
      }
      return [];
    }
  }

  /**
   * Match all issues on a single line for a given pattern
   */
  private matchLineIssues(
    filePath: string,
    line: string,
    lineNum: number,
    regex: RegExp,
    pattern: CustomPattern
  ): TechDebtIssue[] {
    if (!regex.global) {
      return this.matchSingleIssue(filePath, line, lineNum, regex, pattern);
    }

    const issues: TechDebtIssue[] = [];
    let matchIndex = 0;
    let match: RegExpExecArray | null;
    regex.lastIndex = 0;

    while ((match = regex.exec(line)) !== null) {
      // Guard against infinite loops and noisy reports: zero-length matches don't advance
      // lastIndex in all runtimes and would emit one issue per character position.
      // Skip issue emission and advance manually to ensure forward progress.
      if (match[0].length === 0) {
        regex.lastIndex++;
        continue;
      }
      issues.push(
        this.buildIssue(filePath, line, lineNum, match.index, `${lineNum}-${matchIndex}`, pattern)
      );
      matchIndex++;
    }

    return issues;
  }

  /**
   * Match at most one issue on a line for a non-global regex
   */
  private matchSingleIssue(
    filePath: string,
    line: string,
    lineNum: number,
    regex: RegExp,
    pattern: CustomPattern
  ): TechDebtIssue[] {
    regex.lastIndex = 0;
    const match = regex.exec(line);
    if (!match) return [];
    return [this.buildIssue(filePath, line, lineNum, match.index, `${lineNum}`, pattern)];
  }

  /**
   * Build a TechDebtIssue from a regex match
   */
  private buildIssue(
    filePath: string,
    line: string,
    lineNum: number,
    column: number,
    idSuffix: string,
    pattern: CustomPattern
  ): TechDebtIssue {
    return {
      id: `${pattern.id}-${idSuffix}`,
      category: pattern.category,
      severity: pattern.severity,
      file: filePath,
      line: lineNum,
      column,
      title: pattern.message,
      description: line.trim(),
      suggestion: pattern.suggestion || `Review and fix according to rule: ${pattern.id}`,
      effort: 'small',
      rule: pattern.id,
      tags: [pattern.id, 'custom-rule'],
    };
  }

  /**
   * Validate the regex pattern string and flags, returning any errors found.
   * Extracted from validatePattern to keep nesting depth within limits.
   */
  private static validatePatternRegex(patternStr: string, flags: string | undefined): string[] {
    if (patternStr.length > MAX_PATTERN_LENGTH) {
      return [`Pattern exceeds maximum length of ${MAX_PATTERN_LENGTH} characters`];
    }

    const flagsValid = flags === undefined || ALLOWED_FLAGS_RE.test(flags);
    if (!flagsValid) {
      return [`Invalid regex flags: "${flags}". Only the characters ${ALLOWED_FLAGS.split('').join(', ')} are allowed`];
    }

    if (flags !== undefined && flags.includes('u') && flags.includes('v')) {
      return [`Invalid regex flags: "${flags}". The "u" and "v" flags are mutually exclusive`];
    }

    try {
      // Test if regex is valid (flags are already known-good at this point)
      new RegExp(patternStr, flags || 'g');
    } catch (error) {
      return [`Invalid regex pattern: ${error instanceof Error ? error.message : 'Unknown error'}`];
    }

    return [];
  }

  /**
   * Validate a custom pattern
   */
  static validatePattern(pattern: CustomPattern): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!pattern.id) {
      errors.push('Pattern ID is required');
    }

    if (!pattern.pattern) {
      errors.push('Pattern regex is required');
    } else {
      errors.push(...CustomRulesEngine.validatePatternRegex(pattern.pattern, pattern.flags));
    }

    if (!pattern.message) {
      errors.push('Message is required');
    }

    if (!pattern.severity) {
      errors.push('Severity is required');
    } else if (!VALID_SEVERITIES.includes(pattern.severity)) {
      errors.push(`Invalid severity: ${pattern.severity}`);
    }

    if (!pattern.category) {
      errors.push('Category is required');
    } else if (!VALID_CATEGORIES.includes(pattern.category)) {
      errors.push(`Invalid category: ${pattern.category}`);
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Create a simple pattern from parameters
   */
  static createSimplePattern(
    id: string,
    patternString: string,
    message: string,
    severity: Severity,
    category: DebtCategory,
    suggestion?: string
  ): CustomPattern {
    return {
      id,
      pattern: patternString,
      severity,
      category,
      message,
      suggestion,
    };
  }

  /**
   * Get rule statistics
   */
  getRuleStats(): {
    totalRules: number;
    bySeverity: Record<Severity, number>;
    byCategory: Record<DebtCategory, number>;
  } {
    const rules = this.getAllRules();
    const bySeverity = Object.fromEntries(VALID_SEVERITIES.map(s => [s, 0])) as Record<Severity, number>;
    const byCategory = Object.fromEntries(VALID_CATEGORIES.map(c => [c, 0])) as Record<DebtCategory, number>;

    rules.forEach(rule => {
      bySeverity[rule.severity]++;
      byCategory[rule.category]++;
    });

    return {
      totalRules: rules.length,
      bySeverity,
      byCategory,
    };
  }
}

