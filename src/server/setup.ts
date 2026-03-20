import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

/**
 * Resolve package.json version. Prefer explicit environment override so CI
 * or local runs can pin the value (TECH_DEBT_MCP_VERSION). Then attempt to
 * read the server's own package.json (resolved relative to this module, not
 * process.cwd(), since cwd is the user's project when running as MCP server).
 * If all fails, return 'unknown'.
 */
function readPackageVersion(): string {
  // 0. explicit environment override
  const envVersion = process.env.TECH_DEBT_MCP_VERSION || process.env.npm_package_version;
  if (envVersion && typeof envVersion === 'string' && envVersion.trim().length > 0) {
    return envVersion.trim();
  }

  // 1. Read package.json relative to this module (two levels up from dist/server/)
  try {
    const p = join(__dirname, '..', '..', 'package.json');
    const pkg = JSON.parse(readFileSync(p, 'utf8')) as { version?: string };
    if (pkg.version) return pkg.version;
  } catch {
    // ignore and fallback
  }

  // fallback
  console.error('VERSION: could not resolve package.json version; falling back to "unknown"');
  return 'unknown';
}

export const VERSION = readPackageVersion();

/**
 * Create and return a pre-configured McpServer instance.
 */
export function createServer(): McpServer {
  return new McpServer(
    {
      name: 'tech-debt-mcp',
      version: VERSION,
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );
}

/**
 * Start the given McpServer by connecting it to stdio transport.
 */
export async function runServer(mcpServer: McpServer): Promise<void> {
  const transport = new StdioServerTransport();
  // McpServer.connect attaches and starts the transport
  await mcpServer.connect(transport);
  console.error(`Tech Debt MCP Server running on stdio (version: ${VERSION})`);
}
