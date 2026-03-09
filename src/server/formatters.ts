import { TechDebtReport, Severity } from '../types/index.js';

/**
 * Format a complete tech debt analysis report as markdown
 */
export function formatReport(report: TechDebtReport): string {
  const severityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
  const sortedIssues = [...report.issues].sort(
    (a, b) => severityOrder[a.severity] - severityOrder[b.severity]
  );

  const categoryLines = Object.entries(report.summary.byCategory)
    .filter(([_, count]) => count > 0)
    .map(([cat, count]) => `- **${cat}:** ${count}`)
    .join('\n');

  const languageLines = Object.entries(report.summary.byLanguage)
    .map(([lang, count]) => `- **${lang}:** ${count}`)
    .join('\n');

  const issueLines = sortedIssues.slice(0, 20).map(i => {
    const suggestion = i.suggestion ? `\n💡 **Suggestion:** ${i.suggestion}` : '';
    const line = i.line ? `:${i.line}` : '';
    return `### ${getSeverityEmoji(i.severity)} ${i.title}
- **File:** ${i.file}${line}
- **Category:** ${i.category}
- **Severity:** ${i.severity}
${i.description}${suggestion}`;
  }).join('\n---\n\n');

  const moreIssues = report.issues.length > 20
    ? `\n... and ${report.issues.length - 20} more issues.\n`
    : '';

  const recommendationLines = report.recommendations.map((r, i) => `### ${i + 1}. ${r.title}
${r.description}

**Effort:** ${r.effort} | **Impact:** ${r.impact}

**Action Items:**
${r.actionItems.map(a => `- ${a}`).join('\n')}
`).join('\n');

  return `# Tech Debt Analysis Report

**Generated:** ${report.timestamp}
**Project:** ${report.project.path}

## Project Overview
- **Total Files:** ${report.project.totalFiles}
- **Analyzed Files:** ${report.project.analyzedFiles}
- **Languages:** ${report.project.languages.join(', ')}
- **Package Managers:** ${report.project.packageManagers.join(', ') || 'None detected'}

## Summary

### Health Score: ${report.summary.healthScore}/100
### Debt Score: ${report.summary.debtScore}/100

### Issues by Severity
| Severity | Count |
|----------|-------|
| 🔴 Critical | ${report.summary.bySeverity.critical} |
| 🟠 High | ${report.summary.bySeverity.high} |
| 🟡 Medium | ${report.summary.bySeverity.medium} |
| 🟢 Low | ${report.summary.bySeverity.low} |

### Issues by Category
${categoryLines}

### Issues by Language
${languageLines}

## Top Issues

${issueLines}

${moreIssues}

## Recommendations

${recommendationLines}`;
}

/**
 * Get emoji representation for severity level
 */
function getSeverityEmoji(severity: Severity): string {
  switch (severity) {
    case 'critical': return '🔴';
    case 'high': return '🟠';
    case 'medium': return '🟡';
    case 'low': return '🟢';
  }
}

/**
 * Format minutes into human-readable time string
 */
export function formatMinutes(minutes: number): string {
  if (minutes === 0) return '0m';
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}
