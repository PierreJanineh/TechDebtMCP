#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ErrorCode,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { AnalysisEngine } from './core/analysisEngine.js';
import { CustomRulesEngine } from './core/customRulesEngine.js';
import { analyzeFile } from './analyzers/index.js';
import { getSupportedLanguages, LANGUAGE_CONFIGS } from './config/languages.js';
import { getRelativePath, readFile, fileExists } from './utils/fileUtils.js';
import {
  SupportedLanguage,
  DebtCategory,
  Severity,
  TechDebtReport,
  CustomPattern,
} from './types/index.js';

/**
 * Tech Debt MCP Server
 *
 * Provides tools for analyzing technical debt across multiple programming languages.
 */
class TechDebtServer {
  private server: Server;
  private engine: AnalysisEngine;
  private customRulesEngine: CustomRulesEngine;

  constructor() {
    this.server = new Server(
      {
        name: 'tech-debt-mcp',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.engine = new AnalysisEngine();
    this.customRulesEngine = new CustomRulesEngine();
    this.setupHandlers();
  }

  private setupHandlers(): void {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'analyze_project',
          description: 'Analyze an entire project for technical debt. Scans all supported files and returns a comprehensive report with issues, metrics, and recommendations.',
          inputSchema: {
            type: 'object',
            properties: {
              path: {
                type: 'string',
                description: 'Absolute path to the project root directory',
              },
              languages: {
                type: 'array',
                items: { type: 'string' },
                description: 'Optional: specific languages to analyze (e.g., ["typescript", "python"]). If not specified, all detected languages are analyzed.',
              },
              categories: {
                type: 'array',
                items: { type: 'string' },
                description: 'Optional: filter by debt categories (e.g., ["security", "code-quality"])',
              },
              severity: {
                type: 'string',
                enum: ['low', 'medium', 'high', 'critical'],
                description: 'Optional: minimum severity level to report',
              },
              maxFiles: {
                type: 'number',
                description: 'Optional: maximum number of files to analyze',
              },
            },
            required: ['path'],
          },
        },
        {
          name: 'analyze_file',
          description: 'Analyze a single file for technical debt issues.',
          inputSchema: {
            type: 'object',
            properties: {
              path: {
                type: 'string',
                description: 'Absolute path to the file to analyze',
              },
            },
            required: ['path'],
          },
        },
        {
          name: 'get_debt_summary',
          description: 'Get a quick summary of technical debt in a project without full details.',
          inputSchema: {
            type: 'object',
            properties: {
              path: {
                type: 'string',
                description: 'Absolute path to the project root directory',
              },
            },
            required: ['path'],
          },
        },
        {
          name: 'get_sqale_metrics',
          description: 'Get SQALE technical debt metrics including remediation time, debt ratio, and rating.',
          inputSchema: {
            type: 'object',
            properties: {
              path: {
                type: 'string',
                description: 'Absolute path to the project root directory',
              },
              developmentTime: {
                type: 'number',
                description: 'Optional: estimated development time in hours (for debt ratio calculation)',
              },
            },
            required: ['path'],
          },
        },
        {
          name: 'list_supported_languages',
          description: 'List all programming languages supported by the analyzer with their file extensions and specific checks.',
          inputSchema: {
            type: 'object',
            properties: {},
            required: [],
          },
        },
        {
          name: 'get_recommendations',
          description: 'Get prioritized recommendations for addressing technical debt in a project.',
          inputSchema: {
            type: 'object',
            properties: {
              path: {
                type: 'string',
                description: 'Absolute path to the project root directory',
              },
              limit: {
                type: 'number',
                description: 'Optional: maximum number of recommendations to return (default: 5)',
              },
            },
            required: ['path'],
          },
        },
        {
          name: 'get_issues_by_severity',
          description: 'Get all issues of a specific severity level from a project.',
          inputSchema: {
            type: 'object',
            properties: {
              path: {
                type: 'string',
                description: 'Absolute path to the project root directory',
              },
              severity: {
                type: 'string',
                enum: ['low', 'medium', 'high', 'critical'],
                description: 'Severity level to filter by',
              },
            },
            required: ['path', 'severity'],
          },
        },
        {
          name: 'get_issues_by_category',
          description: 'Get all issues of a specific category from a project.',
          inputSchema: {
            type: 'object',
            properties: {
              path: {
                type: 'string',
                description: 'Absolute path to the project root directory',
              },
              category: {
                type: 'string',
                enum: ['dependency', 'code-quality', 'architecture', 'documentation', 'testing', 'security', 'performance', 'maintainability'],
                description: 'Category to filter by',
              },
            },
            required: ['path', 'category'],
          },
        },
        {
          name: 'add_custom_rule',
          description: 'Add a custom pattern-based tech debt rule.',
          inputSchema: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                description: 'Unique identifier for the rule',
              },
              pattern: {
                type: 'string',
                description: 'Regex pattern to match',
              },
              message: {
                type: 'string',
                description: 'Issue title/message',
              },
              severity: {
                type: 'string',
                enum: ['low', 'medium', 'high', 'critical'],
                description: 'Issue severity level',
              },
              category: {
                type: 'string',
                enum: ['dependency', 'code-quality', 'architecture', 'documentation', 'testing', 'security', 'performance', 'maintainability'],
                description: 'Debt category',
              },
              suggestion: {
                type: 'string',
                description: 'Optional: how to fix the issue',
              },
              languages: {
                type: 'array',
                items: { type: 'string' },
                description: 'Optional: apply only to specific languages',
              },
              flags: {
                type: 'string',
                description: 'Optional: regex flags (g, i, m, s, etc.)',
              },
            },
            required: ['id', 'pattern', 'message', 'severity', 'category'],
          },
        },
        {
          name: 'remove_custom_rule',
          description: 'Remove a custom rule by ID.',
          inputSchema: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                description: 'ID of the rule to remove',
              },
            },
            required: ['id'],
          },
        },
        {
          name: 'list_custom_rules',
          description: 'List all active custom rules with their statistics.',
          inputSchema: {
            type: 'object',
            properties: {},
            required: [],
          },
        },
        {
          name: 'execute_custom_rules',
          description: 'Execute all custom rules against code or a file.',
          inputSchema: {
            type: 'object',
            properties: {
              path: {
                type: 'string',
                description: 'Path to the file to analyze',
              },
              code: {
                type: 'string',
                description: 'Optional: code content to analyze (if not provided, reads from path)',
              },
              language: {
                type: 'string',
                description: 'Optional: programming language for filtering rules',
              },
            },
            required: [],
            anyOf: [
              { required: ['path'] },
              { required: ['code'] },
            ],
          },
        },
        {
          name: 'validate_custom_pattern',
          description: 'Validate a custom pattern before adding it as a rule.',
          inputSchema: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                description: 'Unique identifier for the rule',
              },
              pattern: {
                type: 'string',
                description: 'Regex pattern to validate',
              },
              message: {
                type: 'string',
                description: 'Issue title/message',
              },
              severity: {
                type: 'string',
                enum: ['low', 'medium', 'high', 'critical'],
                description: 'Issue severity level',
              },
              category: {
                type: 'string',
                enum: ['dependency', 'code-quality', 'architecture', 'documentation', 'testing', 'security', 'performance', 'maintainability'],
                description: 'Debt category',
              },
            },
            required: ['id', 'pattern', 'message', 'severity', 'category'],
          },
        },
      ],
    }));

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args = {} } = request.params;

      try {
        switch (name) {
          case 'analyze_project':
            return await this.handleAnalyzeProject(args);
          case 'analyze_file':
            return await this.handleAnalyzeFile(args);
          case 'get_debt_summary':
            return await this.handleGetDebtSummary(args);
          case 'get_sqale_metrics':
            return await this.handleGetSqaleMetrics(args);
          case 'list_supported_languages':
            return this.handleListSupportedLanguages();
          case 'get_recommendations':
            return await this.handleGetRecommendations(args);
          case 'get_issues_by_severity':
            return await this.handleGetIssuesBySeverity(args);
          case 'get_issues_by_category':
            return await this.handleGetIssuesByCategory(args);
          case 'add_custom_rule':
            return await this.handleAddCustomRule(args);
          case 'remove_custom_rule':
            return await this.handleRemoveCustomRule(args);
          case 'list_custom_rules':
            return this.handleListCustomRules();
          case 'execute_custom_rules':
            return await this.handleExecuteCustomRules(args);
          case 'validate_custom_pattern':
            return this.handleValidateCustomPattern(args);
          default:
            throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
        }
      } catch (error) {
        if (error instanceof McpError) {
          throw error;
        }
        throw new McpError(
          ErrorCode.InternalError,
          `Error executing ${name}: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    });
  }

  private async handleAnalyzeProject(args: Record<string, unknown>): Promise<{ content: Array<{ type: string; text: string }> }> {
    const path = args.path as string;
    const languages = args.languages as SupportedLanguage[] | undefined;
    const categories = args.categories as DebtCategory[] | undefined;
    const severity = args.severity as Severity | undefined;
    const maxFiles = args.maxFiles as number | undefined;

    const report = await this.engine.analyzeProject({
      path,
      languages,
      categories,
      severity,
      maxFiles,
    });

    return {
      content: [
        {
          type: 'text',
          text: this.formatReport(report),
        },
      ],
    };
  }

  private async handleAnalyzeFile(args: Record<string, unknown>): Promise<{ content: Array<{ type: string; text: string }> }> {
    const path = args.path as string;

    if (!(await fileExists(path))) {
      throw new McpError(ErrorCode.InvalidParams, `File not found: ${path}`);
    }

    const result = await analyzeFile(path);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }

  private async handleGetDebtSummary(args: Record<string, unknown>): Promise<{ content: Array<{ type: string; text: string }> }> {
    const path = args.path as string;

    const report = await this.engine.analyzeProject({ path, maxFiles: 100 });

    const summary = `# Tech Debt Summary

**Project:** ${path}
**Analyzed Files:** ${report.project.analyzedFiles}
**Languages Detected:** ${report.project.languages.join(', ')}

## Health Score: ${report.summary.healthScore}/100

## Issues by Severity
- 🔴 Critical: ${report.summary.bySeverity.critical}
- 🟠 High: ${report.summary.bySeverity.high}
- 🟡 Medium: ${report.summary.bySeverity.medium}
- 🟢 Low: ${report.summary.bySeverity.low}

**Total Issues:** ${report.summary.totalIssues}
**Debt Score:** ${report.summary.debtScore}/100
`;

    return {
      content: [{ type: 'text', text: summary }],
    };
  }

  private async handleGetSqaleMetrics(args: Record<string, unknown>): Promise<{ content: Array<{ type: string; text: string }> }> {
    const path = args.path as string;
    const developmentTimeHours = args.developmentTime as number | undefined;

    const report = await this.engine.analyzeProject({ path, maxFiles: 100 });
    const sqale = report.sqale;

    // Calculate debt ratio if development time provided
    let debtRatioText = 'N/A (provide developmentTime parameter to calculate)';
    if (developmentTimeHours !== undefined) {
      const debtRatioWithTime = (sqale.totalRemediationTime / (developmentTimeHours * 60)) * 100;
      debtRatioText = `${debtRatioWithTime.toFixed(1)}%`;
    }

    // Get star rating for visual representation
    const ratingStars = {
      'A': '⭐⭐⭐⭐⭐',
      'B': '⭐⭐⭐⭐',
      'C': '⭐⭐⭐',
      'D': '⭐⭐',
      'E': '⭐',
    };

    const sqaleReport = `# SQALE Technical Debt Metrics

**Project:** ${path}

## Overall Rating: ${sqale.rating} ${ratingStars[sqale.rating]}

**Total Remediation Time:** ${sqale.formattedTime}
**Debt Ratio:** ${debtRatioText}

## Breakdown by Severity
| Severity | Time |
|----------|------|
| Critical | ${this.formatMinutes(sqale.bySeverity.critical)} |
| High | ${this.formatMinutes(sqale.bySeverity.high)} |
| Medium | ${this.formatMinutes(sqale.bySeverity.medium)} |
| Low | ${this.formatMinutes(sqale.bySeverity.low)} |

## Breakdown by Category
| Category | Time |
|----------|------|
| code-quality | ${this.formatMinutes(sqale.byCategory['code-quality'])} |
| security | ${this.formatMinutes(sqale.byCategory.security)} |
| maintainability | ${this.formatMinutes(sqale.byCategory.maintainability)} |
| testing | ${this.formatMinutes(sqale.byCategory.testing)} |
| documentation | ${this.formatMinutes(sqale.byCategory.documentation)} |
| architecture | ${this.formatMinutes(sqale.byCategory.architecture)} |
| performance | ${this.formatMinutes(sqale.byCategory.performance)} |
| dependency | ${this.formatMinutes(sqale.byCategory.dependency)} |

## SQALE Rating Scale
- **A:** ≤ 5% debt ratio - Excellent
- **B:** 6-10% debt ratio - Good
- **C:** 11-20% debt ratio - Fair
- **D:** 21-50% debt ratio - Poor
- **E:** > 50% debt ratio - Critical
`;

    return {
      content: [{ type: 'text', text: sqaleReport }],
    };
  }

  private formatMinutes(minutes: number): string {
    if (minutes === 0) return '0m';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins}m`;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}m`;
  }

  private handleListSupportedLanguages(): { content: Array<{ type: string; text: string }> } {
    const languages = getSupportedLanguages();

    const languageList = languages.map(lang => {
      const config = LANGUAGE_CONFIGS[lang];
      return {
        id: lang,
        name: config.name,
        extensions: config.extensions,
        checks: config.specificChecks,
      };
    });

    const formatted = `# Supported Languages

${languageList.map(l => `## ${l.name}
- **ID:** \`${l.id}\`
- **Extensions:** ${l.extensions.join(', ')}
- **Specific Checks:** ${l.checks.join(', ')}
`).join('\n')}
`;

    return {
      content: [{ type: 'text', text: formatted }],
    };
  }

  private async handleGetRecommendations(args: Record<string, unknown>): Promise<{ content: Array<{ type: string; text: string }> }> {
    const path = args.path as string;
    const limit = (args.limit as number) || 5;

    const report = await this.engine.analyzeProject({ path });
    const recommendations = report.recommendations.slice(0, limit);

    const formatted = `# Recommendations for Tech Debt Reduction

${recommendations.map((r, i) => `## ${i + 1}. ${r.title}

${r.description}

**Priority:** ${r.priority} | **Effort:** ${r.effort} | **Impact:** ${r.impact}

**Action Items:**
${r.actionItems.map(a => `- ${a}`).join('\n')}
`).join('\n---\n\n')}
`;

    return {
      content: [{ type: 'text', text: formatted }],
    };
  }

  private async handleGetIssuesBySeverity(args: Record<string, unknown>): Promise<{ content: Array<{ type: string; text: string }> }> {
    const path = args.path as string;
    const severity = args.severity as Severity;

    const report = await this.engine.analyzeProject({ path, severity });
    const issues = report.issues.filter(i => i.severity === severity);

    const formatted = `# ${severity.toUpperCase()} Severity Issues

Found **${issues.length}** ${severity} severity issues.

${issues.slice(0, 50).map(i => `## ${i.title}
- **File:** ${i.file}${i.line ? `:${i.line}` : ''}
- **Category:** ${i.category}
- **Rule:** ${i.rule}
- **Description:** ${i.description}
${i.suggestion ? `- **Suggestion:** ${i.suggestion}` : ''}
`).join('\n---\n\n')}
${issues.length > 50 ? `\n... and ${issues.length - 50} more issues.` : ''}
`;

    return {
      content: [{ type: 'text', text: formatted }],
    };
  }

  private async handleGetIssuesByCategory(args: Record<string, unknown>): Promise<{ content: Array<{ type: string; text: string }> }> {
    const path = args.path as string;
    const category = args.category as DebtCategory;

    const report = await this.engine.analyzeProject({ path, categories: [category] });
    const issues = report.issues;

    const formatted = `# ${category.toUpperCase()} Issues

Found **${issues.length}** issues in the ${category} category.

${issues.slice(0, 50).map(i => `## ${i.title}
- **File:** ${i.file}${i.line ? `:${i.line}` : ''}
- **Severity:** ${i.severity}
- **Rule:** ${i.rule}
- **Description:** ${i.description}
${i.suggestion ? `- **Suggestion:** ${i.suggestion}` : ''}
`).join('\n---\n\n')}
${issues.length > 50 ? `\n... and ${issues.length - 50} more issues.` : ''}
`;

    return {
      content: [{ type: 'text', text: formatted }],
    };
  }

  private formatReport(report: TechDebtReport): string {
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
${Object.entries(report.summary.byCategory)
  .filter(([_, count]) => count > 0)
  .map(([cat, count]) => `- **${cat}:** ${count}`)
  .join('\n')}

### Issues by Language
${Object.entries(report.summary.byLanguage)
  .map(([lang, count]) => `- **${lang}:** ${count}`)
  .join('\n')}

## Top Issues

${report.issues
  .sort((a, b) => {
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    return severityOrder[a.severity] - severityOrder[b.severity];
  })
  .slice(0, 20)
  .map(i => `### ${this.getSeverityEmoji(i.severity)} ${i.title}
- **File:** ${i.file}${i.line ? `:${i.line}` : ''}
- **Category:** ${i.category}
- **Severity:** ${i.severity}
${i.description}
${i.suggestion ? `\n💡 **Suggestion:** ${i.suggestion}` : ''}
`)
  .join('\n---\n\n')}

${report.issues.length > 20 ? `\n... and ${report.issues.length - 20} more issues.\n` : ''}

## Recommendations

${report.recommendations.map((r, i) => `### ${i + 1}. ${r.title}
${r.description}

**Effort:** ${r.effort} | **Impact:** ${r.impact}

**Action Items:**
${r.actionItems.map(a => `- ${a}`).join('\n')}
`).join('\n')}
`;
  }

  private getSeverityEmoji(severity: Severity): string {
    switch (severity) {
      case 'critical': return '🔴';
      case 'high': return '🟠';
      case 'medium': return '🟡';
      case 'low': return '🟢';
    }
  }

  // Custom Rules Handlers

  private async handleAddCustomRule(args: Record<string, unknown>): Promise<{ content: Array<{ type: string; text: string }> }> {
    const { id, pattern, message, severity, category, suggestion, languages, flags } = args;

    const customPattern: CustomPattern = {
      id: id as string,
      pattern: pattern as string,
      message: message as string,
      severity: severity as Severity,
      category: category as DebtCategory,
      suggestion: suggestion as string | undefined,
      languages: (languages as string[] | undefined)?.map(l => l as SupportedLanguage),
      flags: flags as string | undefined,
    };

    // Validate pattern
    const validation = CustomRulesEngine.validatePattern(customPattern);
    if (!validation.valid) {
      return {
        content: [
          {
            type: 'text',
            text: `❌ Pattern validation failed:\n${validation.errors.map(e => `- ${e}`).join('\n')}`,
          },
        ],
      };
    }

    this.customRulesEngine.addRule(customPattern);
    return {
      content: [
        {
          type: 'text',
          text: `✅ Custom rule '${id}' added successfully.\n\nRule: ${pattern}\nSeverity: ${severity}\nCategory: ${category}`,
        },
      ],
    };
  }

  private async handleRemoveCustomRule(args: Record<string, unknown>): Promise<{ content: Array<{ type: string; text: string }> }> {
    const id = args.id as string;
    const removed = this.customRulesEngine.removeRule(id);

    if (removed) {
      return {
        content: [{ type: 'text', text: `✅ Custom rule '${id}' removed successfully.` }],
      };
    } else {
      return {
        content: [{ type: 'text', text: `❌ Custom rule '${id}' not found.` }],
      };
    }
  }

  private handleListCustomRules(): { content: Array<{ type: string; text: string }> } {
    const rules = this.customRulesEngine.getAllRules();
    const stats = this.customRulesEngine.getRuleStats();

    if (rules.length === 0) {
      return {
        content: [{ type: 'text', text: 'No custom rules defined.' }],
      };
    }

    const rulesText = rules
      .map(
        r => `- **${r.id}**: ${r.message}
  - Pattern: \`${r.pattern}\`
  - Severity: ${r.severity}
  - Category: ${r.category}
  ${r.languages ? `- Languages: ${r.languages.join(', ')}` : '- Languages: All'}`
      )
      .join('\n');

    const statsText = `
## Statistics

- **Total Rules:** ${stats.totalRules}
- **By Severity:** Low: ${stats.bySeverity.low}, Medium: ${stats.bySeverity.medium}, High: ${stats.bySeverity.high}, Critical: ${stats.bySeverity.critical}
- **By Category:** 
  ${Object.entries(stats.byCategory)
    .filter(([_, count]) => count > 0)
    .map(([cat, count]) => `  - ${cat}: ${count}`)
    .join('\n')}
`;

    return {
      content: [{ type: 'text', text: `# Custom Rules\n\n${rulesText}\n${statsText}` }],
    };
  }

  private async handleExecuteCustomRules(args: Record<string, unknown>): Promise<{ content: Array<{ type: string; text: string }> }> {
    const path = args.path as string | undefined;
    let code = args.code as string | undefined;
    const language = args.language as string | undefined;

    // Either path or code must be provided
    if (!path && !code) {
      return {
        content: [{ type: 'text', text: '❌ Either path or code must be provided' }],
      };
    }

    if (!code) {
      if (!await fileExists(path!)) {
        return {
          content: [{ type: 'text', text: `❌ File not found: ${path}` }],
        };
      }
      code = await readFile(path!);
    }

    const filePath = path || 'inline-code';
    const issues = this.customRulesEngine.executeRules(filePath, code, language);

    if (issues.length === 0) {
      return {
        content: [{ type: 'text', text: `✅ No custom rule violations found in ${filePath}.` }],
      };
    }

    const formatted = `# Custom Rule Violations in ${filePath}

Found ${issues.length} issue(s):

${issues
  .map(
    issue => `## ${issue.title} [${issue.severity.toUpperCase()}]

**File:** ${issue.file}:${issue.line}
**Rule:** \`${issue.rule}\`
**Category:** ${issue.category}
**Suggestion:** ${issue.suggestion || 'N/A'}

\`\`\`
${issue.description}
\`\`\``
  )
  .join('\n\n---\n\n')}
`;

    return {
      content: [{ type: 'text', text: formatted }],
    };
  }

  private handleValidateCustomPattern(args: Record<string, unknown>): { content: Array<{ type: string; text: string }> } {
    const customPattern: CustomPattern = {
      id: args.id as string,
      pattern: args.pattern as string,
      message: args.message as string,
      severity: args.severity as Severity,
      category: args.category as DebtCategory,
    };

    const validation = CustomRulesEngine.validatePattern(customPattern);

    if (validation.valid) {
      return {
        content: [{ type: 'text', text: `✅ Pattern is valid and can be used as a custom rule.` }],
      };
    } else {
      return {
        content: [
          {
            type: 'text',
            text: `❌ Pattern validation failed:\n${validation.errors.map(e => `- ${e}`).join('\n')}`,
          },
        ],
      };
    }
  }

  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Tech Debt MCP Server running on stdio');
  }
}

// Start the server
const server = new TechDebtServer();
server.run().catch(console.error);
