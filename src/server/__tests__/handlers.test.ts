import { jest } from '@jest/globals';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { attachHandlers } from '../handlers.js';

// Mock the dependencies
jest.mock('../../core/analysisEngine.js');
jest.mock('../../core/customRulesEngine.js');
jest.mock('../../analyzers/index.js');
jest.mock('../../analyzers/dependencies/index.js');
jest.mock('../../config/languages.js');
jest.mock('../../utils/fileUtils.js');

describe('Handlers', () => {
  let mockServer: McpServer;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create mock server
    mockServer = {
      server: {
        setRequestHandler: jest.fn(),
      },
    } as any;
  });

  describe('attachHandlers', () => {
    it('should attach handlers to the server', () => {
      attachHandlers(mockServer);

      expect(mockServer.server.setRequestHandler).toHaveBeenCalledTimes(2);
    });
  });

  describe('Tool Definitions', () => {
    it('should export all required tools', () => {
      const { TOOL_DEFINITIONS } = require('../tools.js');

      expect(TOOL_DEFINITIONS).toBeDefined();
      expect(Array.isArray(TOOL_DEFINITIONS)).toBe(true);
      expect(TOOL_DEFINITIONS.length).toBeGreaterThan(0);

      // Check that each tool has required properties
      TOOL_DEFINITIONS.forEach((tool: any) => {
        expect(tool).toHaveProperty('name');
        expect(tool).toHaveProperty('description');
        expect(tool).toHaveProperty('inputSchema');
        expect(tool.inputSchema).toHaveProperty('type', 'object');
        expect(tool.inputSchema).toHaveProperty('properties');
      });
    });

    it('should include all expected tools', () => {
      const { TOOL_DEFINITIONS } = require('../tools.js');
      const toolNames = TOOL_DEFINITIONS.map((tool: any) => tool.name);

      const expectedTools = [
        'analyze_project',
        'analyze_file',
        'get_debt_summary',
        'get_sqale_metrics',
        'list_supported_languages',
        'get_recommendations',
        'get_issues_by_severity',
        'get_issues_by_category',
        'add_custom_rule',
        'remove_custom_rule',
        'list_custom_rules',
        'execute_custom_rules',
        'validate_custom_pattern',
        'check_dependencies',
      ];

      expectedTools.forEach(toolName => {
        expect(toolNames).toContain(toolName);
      });
    });
  });
});
