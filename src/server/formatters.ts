import { TechDebtReport, Severity } from '../types/index.js';

/**
 * Format a complete tech debt analysis report as markdown
 */
export function formatReport(report: TechDebtReport): string {
  return `# Tech Debt Analysis Report\n\n**Generated:** ${report.timestamp}\n**Project:** ${report.project.path}\n\n## Project Overview\n- **Total Files:** ${report.project.totalFiles}\n- **Analyzed Files:** ${report.project.analyzedFiles}\n- **Languages:** ${report.project.languages.join(', ')}\n- **Package Managers:** ${report.project.packageManagers.join(', ') || 'None detected'}\n\n## Summary\n\n### Health Score: ${report.summary.healthScore}/100\n### Debt Score: ${report.summary.debtScore}/100\n\n### Issues by Severity\n| Severity | Count |\n|----------|-------|\n| 🔴 Critical | ${report.summary.bySeverity.critical} |\n| 🟠 High | ${report.summary.bySeverity.high} |\n| 🟡 Medium | ${report.summary.bySeverity.medium} |\n| 🟢 Low | ${report.summary.bySeverity.low} |\n\n### Issues by Category\n${Object.entries(report.summary.byCategory).filter(([_, count]) => count > 0).map(([cat, count]) => `- **${cat}:** ${count}`).join('\n')}\n\n### Issues by Language\n${Object.entries(report.summary.byLanguage).map(([lang, count]) => `- **${lang}:** ${count}`).join('\n')}\n\n## Top Issues\n\n${report.issues.sort((a, b) => { const severityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 }; return severityOrder[a.severity] - severityOrder[b.severity]; }).slice(0, 20).map(i => `### ${getSeverityEmoji(i.severity)} ${i.title}\n- **File:** ${i.file}${i.line ? `:${i.line}` : ''}\n- **Category:** ${i.category}\n- **Severity:** ${i.severity}\n${i.description}\n${i.suggestion ? `\n💡 **Suggestion:** ${i.suggestion}` : ''}`).join('\n---\n\n')}\n\n${report.issues.length > 20 ? `\n... and ${report.issues.length - 20} more issues.\n` : ''}\n\n## Recommendations\n\n${report.recommendations.map((r, i) => `### ${i + 1}. ${r.title}\n${r.description}\n\n**Effort:** ${r.effort} | **Impact:** ${r.impact}\n\n**Action Items:**\n${r.actionItems.map(a => `- ${a}`).join('\n')}\n`).join('\n')}`;
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
