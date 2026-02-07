import { TechDebtIssue, SQALEMetrics, SQALERating, Effort, DebtCategory, Severity, EffortTimeMapping } from '../types/index.js';

/**
 * SQALE (Software Quality Assessment based on Lifecycle Expectations) Engine
 * Calculates technical debt metrics and ratings based on issue severity and effort
 */
export class SQALEEngine {
  private effortMapping: EffortTimeMapping;

  constructor(effortMapping?: Partial<EffortTimeMapping>) {
    // Default effort-to-time mapping (in minutes)
    this.effortMapping = {
      trivial: 5,    // 5 minutes
      small: 30,     // 30 minutes
      medium: 120,   // 2 hours
      large: 240,    // 4 hours
      xlarge: 480,   // 8 hours (1 day)
      ...effortMapping,
    };
  }

  /**
   * Calculate SQALE metrics from issues
   * @param issues Array of tech debt issues
   * @param developmentTimeMinutes Optional estimated development time for debt ratio
   * @returns SQALE metrics
   */
  calculateMetrics(
    issues: TechDebtIssue[],
    developmentTimeMinutes?: number
  ): SQALEMetrics {
    // Calculate total remediation time
    const totalRemediationTime = this.calculateTotalRemediationTime(issues);

    // Calculate debt ratio
    const debtRatio = developmentTimeMinutes
      ? (totalRemediationTime / developmentTimeMinutes) * 100
      : 0;

    // Get rating based on debt ratio
    const rating = this.getRating(debtRatio);

    // Breakdown by category
    const byCategory = this.breakdownByCategory(issues);

    // Breakdown by severity
    const bySeverity = this.breakdownBySeverity(issues);

    return {
      totalRemediationTime,
      formattedTime: this.formatTime(totalRemediationTime),
      debtRatio,
      rating,
      byCategory,
      bySeverity,
    };
  }

  /**
   * Calculate total remediation time for all issues
   */
  private calculateTotalRemediationTime(issues: TechDebtIssue[]): number {
    return issues.reduce((total, issue) => {
      const remediationTime = this.getRemediationTime(issue.effort || 'small');
      return total + remediationTime;
    }, 0);
  }

  /**
   * Get remediation time in minutes for an effort level
   */
  getRemediationTime(effort: Effort): number {
    return this.effortMapping[effort] || this.effortMapping.small;
  }

  /**
   * Get SQALE rating from debt ratio
   * Based on SonarQube thresholds:
   * - A: ≤5% debt ratio
   * - B: 6-10% debt ratio
   * - C: 11-20% debt ratio
   * - D: 21-50% debt ratio
   * - E: >50% debt ratio
   */
  getRating(debtRatio: number): SQALERating {
    if (debtRatio <= 5) return 'A';
    if (debtRatio <= 10) return 'B';
    if (debtRatio <= 20) return 'C';
    if (debtRatio <= 50) return 'D';
    return 'E';
  }

  /**
   * Format minutes to human-readable time string
   * e.g., 90 minutes -> "1h 30m"
   * e.g., 1440 minutes -> "1d"
   */
  formatTime(minutes: number): string {
    if (minutes === 0) return '0m';

    const days = Math.floor(minutes / (24 * 60));
    const hours = Math.floor((minutes % (24 * 60)) / 60);
    const mins = minutes % 60;

    const parts: string[] = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (mins > 0) parts.push(`${mins}m`);

    return parts.join(' ');
  }

  /**
   * Break down remediation time by category
   */
  private breakdownByCategory(issues: TechDebtIssue[]): Record<DebtCategory, number> {
    const categories: Record<DebtCategory, number> = {
      'dependency': 0,
      'code-quality': 0,
      'architecture': 0,
      'documentation': 0,
      'testing': 0,
      'security': 0,
      'performance': 0,
      'maintainability': 0,
    };

    issues.forEach(issue => {
      const remediationTime = this.getRemediationTime(issue.effort || 'small');
      categories[issue.category] += remediationTime;
    });

    return categories;
  }

  /**
   * Break down remediation time by severity
   */
  private breakdownBySeverity(issues: TechDebtIssue[]): Record<Severity, number> {
    const severities: Record<Severity, number> = {
      'low': 0,
      'medium': 0,
      'high': 0,
      'critical': 0,
    };

    issues.forEach(issue => {
      const remediationTime = this.getRemediationTime(issue.effort || 'small');
      severities[issue.severity] += remediationTime;
    });

    return severities;
  }
}

