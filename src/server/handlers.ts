import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ErrorCode,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { AnalysisEngine } from '../core/analysisEngine.js';
import { CustomRulesEngine } from '../core/customRulesEngine.js';
import { analyzeFile } from '../analyzers/index.js';
import { createDependencyParser, getAllPackageFileNames } from '../analyzers/dependencies/index.js';
import { getSupportedLanguages, LANGUAGE_CONFIGS } from '../config/languages.js';
import { getRelativePath, readFile, fileExists } from '../utils/fileUtils.js';
import { readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { formatReport, formatMinutes } from './formatters.js';
import { TOOL_DEFINITIONS } from './tools.js';
import {
  SupportedLanguage,
  DebtCategory,
  Severity,
  CustomPattern,
  ParsedDependency,
  PackageManager,
} from '../types/index.js';

/**
 * Attach all tool handlers to a given McpServer instance.
 */
export function attachHandlers(mcpServer: McpServer): void {
  const server = mcpServer.server; // underlying low-level Server
  const engine = new AnalysisEngine();
  const customRulesEngine = new CustomRulesEngine();

  // List available tools
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [...TOOL_DEFINITIONS],
  }));

  // For brevity we'll register the full set of tools using the same logic as before
  // Handle tool calls
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args = {} } = request.params;

    try {
      switch (name) {
        case 'analyze_project':
          return await handleAnalyzeProject(engine, args as Record<string, unknown>);
        case 'analyze_file':
          return await handleAnalyzeFile(args as Record<string, unknown>);
        case 'get_debt_summary':
          return await handleGetDebtSummary(engine, args as Record<string, unknown>);
        case 'get_sqale_metrics':
          return await handleGetSqaleMetrics(engine, args as Record<string, unknown>);
        case 'list_supported_languages':
          return handleListSupportedLanguages();
        case 'get_recommendations':
          return await handleGetRecommendations(engine, args as Record<string, unknown>);
        case 'get_issues_by_severity':
          return await handleGetIssuesBySeverity(engine, args as Record<string, unknown>);
        case 'get_issues_by_category':
          return await handleGetIssuesByCategory(engine, args as Record<string, unknown>);
        case 'add_custom_rule':
          return await handleAddCustomRule(customRulesEngine, args as Record<string, unknown>);
        case 'remove_custom_rule':
          return await handleRemoveCustomRule(customRulesEngine, args as Record<string, unknown>);
        case 'list_custom_rules':
          return handleListCustomRules(customRulesEngine);
        case 'execute_custom_rules':
          return await handleExecuteCustomRules(customRulesEngine, args as Record<string, unknown>);
        case 'validate_custom_pattern':
          return handleValidateCustomPattern(args as Record<string, unknown>);
        case 'check_dependencies':
          return await handleCheckDependencies(args as Record<string, unknown>);
        default:
          throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
      }
    } catch (error) {
      if (error instanceof McpError) throw error;
      throw new McpError(ErrorCode.InternalError, `Error executing ${name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  });
}

async function handleAnalyzeProject(engine: AnalysisEngine, args: Record<string, unknown>): Promise<{ content: Array<{ type: string; text: string }> }> {
  const path = args.path as string;
  const languages = args.languages as SupportedLanguage[] | undefined;
  const categories = args.categories as DebtCategory[] | undefined;
  const severity = args.severity as Severity | undefined;
  const maxFiles = args.maxFiles as number | undefined;

  const report = await engine.analyzeProject({ path, languages, categories, severity, maxFiles });

  return { content: [{ type: 'text', text: formatReport(report) }] };
}

async function handleAnalyzeFile(args: Record<string, unknown>): Promise<{ content: Array<{ type: string; text: string }> }> {
  const path = args.path as string;
  if (!(await fileExists(path))) throw new McpError(ErrorCode.InvalidParams, `File not found: ${path}`);
  const result = await analyzeFile(path);
  return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
}

async function handleGetDebtSummary(engine: AnalysisEngine, args: Record<string, unknown>): Promise<{ content: Array<{ type: string; text: string }> }> {
  const path = args.path as string;
  const report = await engine.analyzeProject({ path, maxFiles: 100 });

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

  return { content: [{ type: 'text', text: summary }] };
}

async function handleGetSqaleMetrics(engine: AnalysisEngine, args: Record<string, unknown>): Promise<{ content: Array<{ type: string; text: string }> }> {
  const path = args.path as string;
  const developmentTimeHours = args.developmentTime as number | undefined;

  const report = await engine.analyzeProject({ path, maxFiles: 100 });
  const sqale = report.sqale;

  let debtRatioText = 'N/A (provide developmentTime parameter to calculate)';
  if (developmentTimeHours !== undefined) {
    const debtRatioWithTime = (sqale.totalRemediationTime / (developmentTimeHours * 60)) * 100;
    debtRatioText = `${debtRatioWithTime.toFixed(1)}%`;
  }

  const ratingStars: Record<string, string> = {
    A: '⭐⭐⭐⭐⭐',
    B: '⭐⭐⭐⭐',
    C: '⭐⭐⭐',
    D: '⭐⭐',
    E: '⭐',
  };

  const sqaleReport = `# SQALE Technical Debt Metrics

**Project:** ${path}

## Overall Rating: ${sqale.rating} ${ratingStars[sqale.rating]}

**Total Remediation Time:** ${sqale.formattedTime}
**Debt Ratio:** ${debtRatioText}

## Breakdown by Severity
| Severity | Time |
|----------|------|
| Critical | ${formatMinutes(sqale.bySeverity.critical)} |
| High | ${formatMinutes(sqale.bySeverity.high)} |
| Medium | ${formatMinutes(sqale.bySeverity.medium)} |
| Low | ${formatMinutes(sqale.bySeverity.low)} |

## Breakdown by Category
| Category | Time |
|----------|------|
| code-quality | ${formatMinutes(sqale.byCategory['code-quality'])} |
| security | ${formatMinutes(sqale.byCategory.security)} |
| maintainability | ${formatMinutes(sqale.byCategory.maintainability)} |
| testing | ${formatMinutes(sqale.byCategory.testing)} |
| documentation | ${formatMinutes(sqale.byCategory.documentation)} |
| architecture | ${formatMinutes(sqale.byCategory.architecture)} |
| performance | ${formatMinutes(sqale.byCategory.performance)} |
| dependency | ${formatMinutes(sqale.byCategory.dependency)} |

## SQALE Rating Scale
- **A:** ≤ 5% debt ratio - Excellent
- **B:** 6-10% debt ratio - Good
- **C:** 11-20% debt ratio - Fair
- **D:** 21-50% debt ratio - Poor
- **E:** > 50% debt ratio - Critical
`;

  return { content: [{ type: 'text', text: sqaleReport }] };
}


function handleListSupportedLanguages(): { content: Array<{ type: string; text: string }> } {
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

${languageList.map(l => `## ${l.name}\n- **ID:** \`${l.id}\`\n- **Extensions:** ${l.extensions.join(', ')}\n- **Specific Checks:** ${l.checks.join(', ')}\n`).join('\n')}`;

  return { content: [{ type: 'text', text: formatted }] };
}

async function handleGetRecommendations(engine: AnalysisEngine, args: Record<string, unknown>): Promise<{ content: Array<{ type: string; text: string }> }> {
  const path = args.path as string;
  const limit = (args.limit as number) || 5;

  const report = await engine.analyzeProject({ path });
  const recommendations = report.recommendations.slice(0, limit);

  const formatted = `# Recommendations for Tech Debt Reduction\n\n${recommendations.map((r, i) => `## ${i + 1}. ${r.title}\n\n${r.description}\n\n**Priority:** ${r.priority} | **Effort:** ${r.effort} | **Impact:** ${r.impact}\n\n**Action Items:**\n${r.actionItems.map(a => `- ${a}`).join('\n')}\n`).join('\n---\n\n')}`;

  return { content: [{ type: 'text', text: formatted }] };
}

async function handleGetIssuesBySeverity(engine: AnalysisEngine, args: Record<string, unknown>): Promise<{ content: Array<{ type: string; text: string }> }> {
  const path = args.path as string;
  const severity = args.severity as Severity;

  const report = await engine.analyzeProject({ path, severity });
  const issues = report.issues.filter(i => i.severity === severity);

  const formatted = `# ${severity.toUpperCase()} Severity Issues\n\nFound **${issues.length}** ${severity} severity issues.\n\n${issues.slice(0, 50).map(i => `## ${i.title}\n- **File:** ${i.file}${i.line ? `:${i.line}` : ''}\n- **Category:** ${i.category}\n- **Rule:** ${i.rule}\n- **Description:** ${i.description}\n${i.suggestion ? `- **Suggestion:** ${i.suggestion}` : ''}\n`).join('\n---\n\n')}${issues.length > 50 ? `\n... and ${issues.length - 50} more issues.` : ''}\n`;

  return { content: [{ type: 'text', text: formatted }] };
}

async function handleGetIssuesByCategory(engine: AnalysisEngine, args: Record<string, unknown>): Promise<{ content: Array<{ type: string; text: string }> }> {
  const path = args.path as string;
  const category = args.category as DebtCategory;

  const report = await engine.analyzeProject({ path, categories: [category] });
  const issues = report.issues;

  const formatted = `# ${category.toUpperCase()} Issues\n\nFound **${issues.length}** issues in the ${category} category.\n\n${issues.slice(0, 50).map(i => `## ${i.title}\n- **File:** ${i.file}${i.line ? `:${i.line}` : ''}\n- **Severity:** ${i.severity}\n- **Rule:** ${i.rule}\n- **Description:** ${i.description}\n${i.suggestion ? `- **Suggestion:** ${i.suggestion}` : ''}\n`).join('\n---\n\n')}${issues.length > 50 ? `\n... and ${issues.length - 50} more issues.` : ''}\n`;

  return { content: [{ type: 'text', text: formatted }] };
}

// Custom Rules Handlers

async function handleAddCustomRule(customRulesEngine: CustomRulesEngine, args: Record<string, unknown>): Promise<{ content: Array<{ type: string; text: string }> }> {
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

  const validation = CustomRulesEngine.validatePattern(customPattern);
  if (!validation.valid) {
    return { content: [{ type: 'text', text: `❌ Pattern validation failed:\n${validation.errors.map(e => `- ${e}`).join('\n')}` }] };
  }

  customRulesEngine.addRule(customPattern);
  return { content: [{ type: 'text', text: `✅ Custom rule '${id}' added successfully.\n\nRule: ${pattern}\nSeverity: ${severity}\nCategory: ${category}` }] };
}

function handleRemoveCustomRule(customRulesEngine: CustomRulesEngine, args: Record<string, unknown>): { content: Array<{ type: string; text: string }> } {
  const id = args.id as string;
  const removed = customRulesEngine.removeRule(id);
  if (removed) return { content: [{ type: 'text', text: `✅ Custom rule '${id}' removed successfully.` }] };
  return { content: [{ type: 'text', text: `❌ Custom rule '${id}' not found.` }] };
}

function handleListCustomRules(customRulesEngine: CustomRulesEngine): { content: Array<{ type: string; text: string }> } {
  const rules = customRulesEngine.getAllRules();
  const stats = customRulesEngine.getRuleStats();
  if (rules.length === 0) return { content: [{ type: 'text', text: 'No custom rules defined.' }] };

  const rulesText = rules.map(r => `- **${r.id}**: ${r.message}\n  - Pattern: \`${r.pattern}\`\n  - Severity: ${r.severity}\n  - Category: ${r.category}\n  ${r.languages ? `- Languages: ${r.languages.join(', ')}` : '- Languages: All'}`).join('\n');

  const statsText = `\n## Statistics\n\n- **Total Rules:** ${stats.totalRules}\n- **By Severity:** Low: ${stats.bySeverity.low}, Medium: ${stats.bySeverity.medium}, High: ${stats.bySeverity.high}, Critical: ${stats.bySeverity.critical}\n- **By Category:** \n  ${Object.entries(stats.byCategory).filter(([_, count]) => count > 0).map(([cat, count]) => `  - ${cat}: ${count}`).join('\n')}\n`;

  return { content: [{ type: 'text', text: `# Custom Rules\n\n${rulesText}\n${statsText}` }] };
}

async function handleExecuteCustomRules(customRulesEngine: CustomRulesEngine, args: Record<string, unknown>): Promise<{ content: Array<{ type: string; text: string }> }> {
  const path = args.path as string | undefined;
  let code = args.code as string | undefined;
  const language = args.language as string | undefined;
  if (!path && !code) return { content: [{ type: 'text', text: '❌ Either path or code must be provided' }] };
  if (!code && path) {
    if (!await fileExists(path)) return { content: [{ type: 'text', text: `❌ File not found: ${path}` }] };
    code = await readFile(path);
  }
  if (!code) return { content: [{ type: 'text', text: '❌ Could not read code from path or input' }] };

  const filePath = path || 'inline-code';
  const issues = customRulesEngine.executeRules(filePath, code, language);
  if (issues.length === 0) return { content: [{ type: 'text', text: `✅ No custom rule violations found in ${filePath}.` }] };

  const formatted = `# Custom Rule Violations in ${filePath}\n\nFound ${issues.length} issue(s):\n\n${issues.map(issue => `## ${issue.title} [${issue.severity.toUpperCase()}]\n\n**File:** ${issue.file}:${issue.line}\n**Rule:** \`${issue.rule}\`\n**Category:** ${issue.category}\n**Suggestion:** ${issue.suggestion || 'N/A'}\n\n\
${'```'}\n${issue.description}\n${'```'}`).join('\n\n---\n\n')}`;

  return { content: [{ type: 'text', text: formatted }] };
}

function handleValidateCustomPattern(args: Record<string, unknown>): { content: Array<{ type: string; text: string }> } {
  const customPattern: CustomPattern = {
    id: args.id as string,
    pattern: args.pattern as string,
    message: args.message as string,
    severity: args.severity as Severity,
    category: args.category as DebtCategory,
  };

  const validation = CustomRulesEngine.validatePattern(customPattern);
  if (validation.valid) return { content: [{ type: 'text', text: `✅ Pattern is valid and can be used as a custom rule.` }] };
  return { content: [{ type: 'text', text: `❌ Pattern validation failed:\n${validation.errors.map(e => `- ${e}`).join('\n')}` }] };
}

// Dependency checker
async function handleCheckDependencies(args: Record<string, unknown>): Promise<{ content: Array<{ type: string; text: string }> }> {
  const projectPath = args.path as string;
  const includeDev = args.includeDev !== false;
  if (!(await fileExists(projectPath))) throw new McpError(ErrorCode.InvalidParams, `Project path not found: ${projectPath}`);

  const packageFileNames = getAllPackageFileNames();
  const packageFiles: string[] = [];
  const failedParses: Array<{ file: string; error: string }> = [];
  const dependencies: Array<{ file: string; ecosystem: PackageManager | string; dependencies: ParsedDependency[] }> = [];
  await findPackageFiles(projectPath, packageFileNames, packageFiles);

  for (const filePath of packageFiles) {
    const parser = createDependencyParser(filePath);
    if (parser) {
      try {
        const content = await readFile(filePath);
        const deps = await parser.parse(filePath, content);
        const filteredDeps = includeDev ? deps : deps.filter(d => !d.isDev);

        if (filteredDeps.length > 0) {
          dependencies.push({
            file: getRelativePath(projectPath, filePath),
            ecosystem: parser.getEcosystem(),
            dependencies: filteredDeps,
          });
        }
      } catch (error) {
        const rel = getRelativePath(projectPath, filePath);
        console.error(`Failed to parse ${filePath} (${rel}):`, error instanceof Error ? error.message : String(error));
        failedParses.push({ file: rel, error: error instanceof Error ? error.message : String(error) });
      }
    }
  }

  const totalDeps = dependencies.reduce((sum: number, f: { dependencies: ParsedDependency[] }) => sum + f.dependencies.length, 0);
  const ecosystems = [...new Set(dependencies.map((d: { ecosystem: PackageManager | string }) => d.ecosystem))];

  let report = `# Dependency Analysis\n\n**Project:** ${projectPath}\n**Found:** ${packageFiles.length} package file(s) across ${ecosystems.length} ecosystem(s)\n**Total Dependencies:** ${totalDeps}\n**Ecosystems:** ${ecosystems.join(', ')}\n\n`;

  for (const fileInfo of dependencies) {
    report += `## ${fileInfo.file} (${fileInfo.ecosystem})\n\n`;
    report += `**Dependencies:** ${fileInfo.dependencies.length}\n\n`;

    const prodDeps = fileInfo.dependencies.filter((d: ParsedDependency) => !d.isDev);
    const devDeps = fileInfo.dependencies.filter((d: ParsedDependency) => d.isDev);

    if (prodDeps.length > 0) {
      report += `### Production (${prodDeps.length})\n`;
      report += prodDeps.map((d: ParsedDependency) => `- ${d.name}@${d.version}`).join('\n') + '\n\n';
    }

    if (devDeps.length > 0 && includeDev) {
      report += `### Development (${devDeps.length})\n`;
      report += devDeps.map((d: ParsedDependency) => `- ${d.name}@${d.version}`).join('\n') + '\n\n';
    }
  }

  if (failedParses.length > 0) {
    report += `## ⚠️ Failed to parse ${failedParses.length} file(s)\n\n`;
    report += failedParses.map(f => `- ${f.file}: ${f.error}`).join('\n') + '\n\n';
  }

  return { content: [{ type: 'text', text: report }] };
}

async function findPackageFiles(
  dir: string,
  targetFiles: string[],
  results: string[],
  maxDepth: number = 10,
  currentDepth: number = 0
): Promise<void> {
  if (currentDepth >= maxDepth) return;

  try {
    const entries = await readdir(dir);

    for (const entry of entries) {
      if (['node_modules', '.git', 'dist', 'build', 'target', '.venv', '__pycache__'].includes(entry)) {
        continue;
      }

      const fullPath = join(dir, entry);
      const stats = await stat(fullPath);

      if (stats.isDirectory()) {
        await findPackageFiles(fullPath, targetFiles, results, maxDepth, currentDepth + 1);
      } else if (stats.isFile()) {
        if (targetFiles.includes(entry) || entry.endsWith('.csproj')) {
          results.push(fullPath);
        }
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`findPackageFiles: failed to scan directory "${dir}": ${message}`);
  }
}
