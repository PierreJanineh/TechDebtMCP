import { jest } from '@jest/globals';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { McpError } from '@modelcontextprotocol/sdk/types.js';
import { attachHandlers } from '../handlers.js';
import { getFileStats, readFile } from '../../utils/fileUtils.js';
import { MAX_FILE_SIZE_BYTES } from '../../core/customRulesEngine.js';
import { AnalysisEngine } from '../../core/analysisEngine.js';

// Mock the dependencies
jest.mock('../../core/analysisEngine.js');
jest.mock('../../core/customRulesEngine.js', () => ({
  CustomRulesEngine: class {
    addRule = jest.fn();
    removeRule = jest.fn(() => false);
    getAllRules = jest.fn(() => []);
    hasRule = jest.fn(() => false);
    getRuleStats = jest.fn(() => ({ totalRules: 0, bySeverity: {}, byCategory: {} }));
    executeRules = jest.fn(() => []);
  },
  MAX_CODE_LENGTH: 500_000,
  MAX_FILE_SIZE_BYTES: 500_000,
}));
jest.mock('../../analyzers/index.js');
jest.mock('../../analyzers/dependencies/index.js');
jest.mock('../../config/languages.js');
jest.mock('../../utils/fileUtils.js', () => ({
  readFile: jest.fn(),
  fileExists: jest.fn(),
  getFileStats: jest.fn(),
  getRelativePath: jest.fn((_b: string, f: string) => f),
}));

const mockGetFileStats = getFileStats as jest.MockedFunction<typeof getFileStats>;
const mockReadFile = readFile as jest.MockedFunction<typeof readFile>;

describe('Handlers', () => {
  let mockServer: McpServer;
  let callToolHandler: (request: any) => Promise<any>;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create mock server that captures the registered handlers
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

  describe('execute_custom_rules file size guard', () => {
    beforeEach(() => {
      attachHandlers(mockServer);
      // The second setRequestHandler call receives the CallToolRequestSchema handler
      const calls = (mockServer.server.setRequestHandler as jest.MockedFunction<any>).mock.calls;
      callToolHandler = calls[calls.length - 1][1];
    });

    it('rejects a path input whose file size exceeds MAX_FILE_SIZE_BYTES', async () => {
      mockGetFileStats.mockResolvedValue({ size: MAX_FILE_SIZE_BYTES + 1, isFile: () => true } as any);

      await expect(
        callToolHandler({
          params: {
            name: 'execute_custom_rules',
            arguments: { path: '/some/large/file.ts' },
          },
        })
      ).rejects.toThrow(McpError);
    });

    it('rejects a path input that is not a regular file', async () => {
      mockGetFileStats.mockResolvedValue({ size: 0, isFile: () => false } as any);

      await expect(
        callToolHandler({
          params: {
            name: 'execute_custom_rules',
            arguments: { path: '/some/directory' },
          },
        })
      ).rejects.toThrow(McpError);
    });

    it('accepts a path input whose file size is exactly MAX_FILE_SIZE_BYTES', async () => {
      mockGetFileStats.mockResolvedValue({ size: MAX_FILE_SIZE_BYTES, isFile: () => true } as any);
      mockReadFile.mockResolvedValue('const x = 1;');

      await expect(
        callToolHandler({
          params: {
            name: 'execute_custom_rules',
            arguments: { path: '/some/file.ts' },
          },
        })
      ).resolves.toBeDefined();
    });

    it('rejects when getFileStats returns null', async () => {
      mockGetFileStats.mockResolvedValue(null);

      await expect(
        callToolHandler({
          params: {
            name: 'execute_custom_rules',
            arguments: { path: '/some/file.ts' },
          },
        })
      ).rejects.toThrow(McpError);
    });
  });

  describe('path sanitization — no absolute paths in output', () => {
    const makeReport = () => ({
      project: { analyzedFiles: 5, languages: ['typescript'] },
      summary: {
        healthScore: 80,
        totalIssues: 3,
        debtScore: 20,
        bySeverity: { critical: 0, high: 1, medium: 1, low: 1 },
      },
      sqale: {
        rating: 'A',
        formattedTime: '30m',
        totalRemediationTime: 30,
        bySeverity: { critical: 0, high: 10, medium: 10, low: 10 },
        byCategory: {
          'code-quality': 10,
          security: 5,
          maintainability: 5,
          testing: 5,
          documentation: 2,
          architecture: 1,
          performance: 1,
          dependency: 1,
        },
      },
      issues: [],
      recommendations: [],
    });

    beforeEach(() => {
      attachHandlers(mockServer);
      const calls = (mockServer.server.setRequestHandler as jest.MockedFunction<any>).mock.calls;
      callToolHandler = calls[calls.length - 1][1];

      jest.spyOn(AnalysisEngine.prototype, 'analyzeProject').mockResolvedValue(makeReport() as any);
    });

    it('get_debt_summary does not leak absolute path in output', async () => {
      const absolutePath = '/home/user/projects/myapp';

      const result = await callToolHandler({
        params: {
          name: 'get_debt_summary',
          arguments: { path: absolutePath },
        },
      });

      const text: string = result.content[0].text;
      expect(text).not.toContain(absolutePath);
      expect(text).toContain('myapp');
    });

    it('get_sqale_metrics does not leak absolute path in output', async () => {
      const absolutePath = '/home/user/projects/myapp';

      const result = await callToolHandler({
        params: {
          name: 'get_sqale_metrics',
          arguments: { path: absolutePath },
        },
      });

      const text: string = result.content[0].text;
      expect(text).not.toContain(absolutePath);
      expect(text).toContain('myapp');
    });

    it('get_debt_summary uses basename of path as display name', async () => {
      const result = await callToolHandler({
        params: {
          name: 'get_debt_summary',
          arguments: { path: '/a/b/c/project-name' },
        },
      });

      const text: string = result.content[0].text;
      expect(text).toContain('project-name');
      expect(text).not.toContain('/a/b/c/project-name');
    });

    it('get_sqale_metrics uses basename of path as display name', async () => {
      const result = await callToolHandler({
        params: {
          name: 'get_sqale_metrics',
          arguments: { path: '/a/b/c/project-name' },
        },
      });

      const text: string = result.content[0].text;
      expect(text).toContain('project-name');
      expect(text).not.toContain('/a/b/c/project-name');
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
        'list_session_custom_rules',
        'execute_custom_rules',
        'validate_custom_pattern',
        'check_dependencies',
        'validate_config',
        'get_vulnerability_report',
      ];

      expectedTools.forEach(toolName => {
        expect(toolNames).toContain(toolName);
      });
    });
  });
});
