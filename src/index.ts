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
import { analyzeFile } from './analyzers/index.js';
import { getSupportedLanguages, LANGUAGE_CONFIGS } from './config/languages.js';
import { getRelativePath, readFile, fileExists } from './utils/fileUtils.js';
import {
  SupportedLanguage,
  DebtCategory,
  Severity,
  TechDebtReport,
} from './types/index.js';

/**
 * Tech Debt MCP Server
 *
 * Provides tools for analyzing technical debt across multiple programming languages.
 */
class TechDebtServer {
  private server: Server;
  private engine: AnalysisEngine;

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
          case 'list_supported_languages':
            return this.handleListSupportedLanguages();
          case 'get_recommendations':
            return await this.handleGetRecommendations(args);
          case 'get_issues_by_severity':
            return await this.handleGetIssuesBySeverity(args);
          case 'get_issues_by_category':
            return await this.handleGetIssuesByCategory(args);
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

  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Tech Debt MCP Server running on stdio');
  }
}

// Start the server
const server = new TechDebtServer();
server.run().catch(console.error);
