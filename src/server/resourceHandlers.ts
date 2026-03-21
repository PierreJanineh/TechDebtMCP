/**
 * MCP Resource handlers for passive data access to tech debt analysis.
 *
 * Registers two resource templates:
 *   - debt://summary/{+projectPath}  → summary + SQALE as JSON
 *   - debt://issues/{+projectPath}   → issues array as JSON
 */

import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Variables } from '@modelcontextprotocol/sdk/shared/uriTemplate.js';
import { AnalysisEngine } from '../core/analysisEngine.js';

type ResourceResponse = { contents: Array<{ uri: string; mimeType: string; text: string }> };

/**
 * Build a resource error response for a given URI and error message.
 */
function jsonErrorResponse(uri: URL, message: string): ResourceResponse {
  return jsonSuccessResponse(uri, { error: message });
}

/**
 * Build a resource success response for a given URI and data object.
 */
function jsonSuccessResponse(uri: URL, data: unknown): ResourceResponse {
  return {
    contents: [
      {
        uri: uri.href,
        mimeType: 'application/json',
        text: JSON.stringify(data, null, 2),
      },
    ],
  };
}

/**
 * Extract a string variable from the MCP resource template variables.
 * Returns the string value, or null if the variable is missing or not a string.
 */
function getStringVariable(variables: Variables, key: string): string | null {
  const value = variables[key];
  return typeof value === 'string' ? value : null;
}

/**
 * Handle the debt://summary resource for a given project path.
 */
async function handleSummaryResource(
  uri: URL,
  engine: AnalysisEngine,
  projectPath: string,
): Promise<ResourceResponse> {
  const report = await engine.analyzeProject({ path: projectPath });
  const summary = {
    timestamp: report.timestamp,
    healthScore: report.summary.healthScore,
    debtScore: report.summary.debtScore,
    totalIssues: report.summary.totalIssues,
    bySeverity: report.summary.bySeverity,
    byCategory: report.summary.byCategory,
    sqale: {
      rating: report.sqale.rating,
      totalRemediationTime: report.sqale.totalRemediationTime,
      formattedTime: report.sqale.formattedTime,
    },
  };
  return jsonSuccessResponse(uri, summary);
}

/**
 * Handle the debt://issues resource for a given project path.
 */
async function handleIssuesResource(
  uri: URL,
  engine: AnalysisEngine,
  projectPath: string,
): Promise<ResourceResponse> {
  const report = await engine.analyzeProject({ path: projectPath });

  const params = uri.searchParams;
  const severityFilter = params.get('severity');
  const categoryFilter = params.get('category');
  const rawLimit = parseInt(params.get('limit') ?? '100', 10);
  const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? rawLimit : 100;

  let filteredIssues = report.issues;
  if (severityFilter) {
    filteredIssues = filteredIssues.filter((i) => i.severity === severityFilter);
  }
  if (categoryFilter) {
    filteredIssues = filteredIssues.filter((i) => i.category === categoryFilter);
  }

  const result = {
    timestamp: report.timestamp,
    totalCount: filteredIssues.length,
    issues: filteredIssues.slice(0, limit),
  };
  return jsonSuccessResponse(uri, result);
}

/**
 * Wrap a resource handler with try/catch, returning a JSON error response on failure.
 */
async function withResourceErrorHandling(
  uri: URL,
  handler: () => Promise<ResourceResponse>,
): Promise<ResourceResponse> {
  try {
    return await handler();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return jsonErrorResponse(uri, message);
  }
}

/**
 * Attach MCP resource templates to the given McpServer instance.
 * The SDK auto-registers the `resources` capability on first call.
 */
export function attachResources(mcpServer: McpServer): void {
  const engine = new AnalysisEngine();

  // debt://summary/{+projectPath}
  mcpServer.registerResource(
    'Tech Debt Summary',
    new ResourceTemplate('debt://summary/{+projectPath}', { list: undefined }),
    {
      description: 'Current technical debt summary including health score, issue counts, and SQALE metrics',
      mimeType: 'application/json',
    },
    async (uri, variables) => {
      const projectPath = getStringVariable(variables, 'projectPath');
      if (projectPath === null) {
        return jsonErrorResponse(uri, 'projectPath must be a string');
      }
      return withResourceErrorHandling(uri, () => handleSummaryResource(uri, engine, projectPath));
    }
  );

  // debt://issues/{+projectPath}
  mcpServer.registerResource(
    'Tech Debt Issues',
    new ResourceTemplate('debt://issues/{+projectPath}', { list: undefined }),
    {
      description: 'List of all technical debt issues in the project',
      mimeType: 'application/json',
    },
    async (uri, variables) => {
      const projectPath = getStringVariable(variables, 'projectPath');
      if (projectPath === null) {
        return jsonErrorResponse(uri, 'projectPath must be a string');
      }
      return withResourceErrorHandling(uri, () => handleIssuesResource(uri, engine, projectPath));
    }
  );
}
