import { TechDebtIssue, CustomPattern, Severity, DebtCategory } from '../types/index.js';

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
    language?: string
  ): TechDebtIssue[] {
    const issues: TechDebtIssue[] = [];

    this.rules.forEach(pattern => {
      // Skip if language filter is specified and either language is missing or doesn't match
      if (pattern.languages && (!language || !pattern.languages.includes(language as any))) {
        return;
      }

      // Execute the pattern check
      const patternIssues = this.executePattern(filePath, content, pattern);
      issues.push(...patternIssues);
    });

    return issues;
  }

  /**
   * Execute a single pattern against code
   */
  private executePattern(
    filePath: string,
    content: string,
    pattern: CustomPattern
  ): TechDebtIssue[] {
    const issues: TechDebtIssue[] = [];

    try {
      // Normalize line endings for cross-platform consistency
      const lines = content.split(/\r?\n/);
      const flags = pattern.flags || 'g';
      const regex = new RegExp(pattern.pattern, flags);

      for (let lineNum = 0; lineNum < lines.length; lineNum++) {
        const line = lines[lineNum];
        let matchIndex = 0;

        // Handle multiple matches on the same line
        if (regex.global) {
          let match;
          regex.lastIndex = 0;
          while ((match = regex.exec(line)) !== null) {
            issues.push({
              id: `${pattern.id}-${lineNum + 1}-${matchIndex}`,
              category: pattern.category,
              severity: pattern.severity,
              file: filePath,
              line: lineNum + 1,
              column: match.index,
              title: pattern.message,
              description: line.trim(),
              suggestion: pattern.suggestion || `Review and fix according to rule: ${pattern.id}`,
              effort: 'small',
              rule: pattern.id,
              tags: [pattern.id, 'custom-rule'],
            });
            matchIndex++;
          }
        } else {
          // Non-global flag: match once per line
          regex.lastIndex = 0;
          const match = regex.exec(line);
          if (match) {
            issues.push({
              id: `${pattern.id}-${lineNum + 1}`,
              category: pattern.category,
              severity: pattern.severity,
              file: filePath,
              line: lineNum + 1,
              column: match.index,
              title: pattern.message,
              description: line.trim(),
              suggestion: pattern.suggestion || `Review and fix according to rule: ${pattern.id}`,
              effort: 'small',
              rule: pattern.id,
              tags: [pattern.id, 'custom-rule'],
            });
          }
        }
      }
    } catch (error) {
      if (this.onRuleError) {
        this.onRuleError(pattern.id, error instanceof Error ? error : new Error(String(error)));
      }
    }

    return issues;
  }

  /**
   * Validate a custom pattern
   */
  static validatePattern(pattern: CustomPattern): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    const validSeverities: Severity[] = ['low', 'medium', 'high', 'critical'];
    const validCategories: DebtCategory[] = [
      'dependency',
      'code-quality',
      'architecture',
      'documentation',
      'testing',
      'security',
      'performance',
      'maintainability',
    ];

    if (!pattern.id) {
      errors.push('Pattern ID is required');
    }

    if (!pattern.pattern) {
      errors.push('Pattern regex is required');
    } else {
      try {
        // Test if regex is valid
        new RegExp(pattern.pattern, pattern.flags || 'g');
      } catch (error) {
        errors.push(`Invalid regex pattern: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    if (!pattern.message) {
      errors.push('Message is required');
    }

    if (!pattern.severity) {
      errors.push('Severity is required');
    } else if (!validSeverities.includes(pattern.severity)) {
      errors.push(`Invalid severity: ${pattern.severity}`);
    }

    if (!pattern.category) {
      errors.push('Category is required');
    } else if (!validCategories.includes(pattern.category)) {
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
    const bySeverity: Record<Severity, number> = {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0,
    };
    const byCategory: Record<DebtCategory, number> = {
      dependency: 0,
      'code-quality': 0,
      architecture: 0,
      documentation: 0,
      testing: 0,
      security: 0,
      performance: 0,
      maintainability: 0,
    };

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

