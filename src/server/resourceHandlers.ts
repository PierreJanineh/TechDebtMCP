/**
 * MCP Resource handlers for passive data access to tech debt analysis.
 *
 * Registers two resource templates:
 *   - debt://summary/{+projectPath}  → summary + SQALE as JSON
 *   - debt://issues/{+projectPath}   → issues array as JSON
 */

import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { AnalysisEngine } from '../core/analysisEngine.js';

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
      const projectPath = variables.projectPath as string;

      try {
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

        return {
          contents: [
            {
              uri: uri.href,
              mimeType: 'application/json',
              text: JSON.stringify(summary, null, 2),
            },
          ],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return {
          contents: [
            {
              uri: uri.href,
              mimeType: 'application/json',
              text: JSON.stringify({ error: message }, null, 2),
            },
          ],
        };
      }
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
      const projectPath = variables.projectPath as string;

      try {
        const report = await engine.analyzeProject({ path: projectPath });

        // Parse query parameters for filtering
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

        return {
          contents: [
            {
              uri: uri.href,
              mimeType: 'application/json',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return {
          contents: [
            {
              uri: uri.href,
              mimeType: 'application/json',
              text: JSON.stringify({ error: message }, null, 2),
            },
          ],
        };
      }
    }
  );
}
