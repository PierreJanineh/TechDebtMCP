import { jest } from '@jest/globals';

// Mock AnalysisEngine before imports
jest.mock('../../core/analysisEngine.js', () => ({
  AnalysisEngine: jest.fn().mockImplementation(() => ({
    analyzeProject: jest.fn(),
  })),
}));

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { attachResources } from '../resourceHandlers.js';
import { AnalysisEngine } from '../../core/analysisEngine.js';
import type { TechDebtReport } from '../../types/index.js';

/** Build a minimal mock TechDebtReport for testing. */
function makeMockReport(overrides: Partial<TechDebtReport> = {}): TechDebtReport {
  return {
    timestamp: '2026-03-19T10:00:00Z',
    project: {
      path: '/test/project',
      languages: ['typescript'],
      totalFiles: 10,
      analyzedFiles: 8,
      packageManagers: [],
      frameworks: [],
    },
    summary: {
      totalIssues: 5,
      bySeverity: { critical: 0, high: 1, medium: 2, low: 2 },
      byCategory: {
        'code-quality': 3,
        security: 1,
        maintainability: 1,
        documentation: 0,
        testing: 0,
        architecture: 0,
        performance: 0,
        dependency: 0,
      },
      byLanguage: { typescript: 5 },
      debtScore: 15,
      healthScore: 85,
    },
    sqale: {
      totalRemediationTime: 120,
      formattedTime: '2h 0m',
      debtRatio: 3.5,
      rating: 'A',
      byCategory: {
        'code-quality': 60,
        security: 30,
        maintainability: 30,
        documentation: 0,
        testing: 0,
        architecture: 0,
        performance: 0,
        dependency: 0,
      },
      bySeverity: { critical: 0, high: 30, medium: 60, low: 30 },
    },
    issues: [
      {
        id: 'issue-1',
        category: 'code-quality',
        severity: 'high',
        file: 'src/index.ts',
        line: 10,
        title: 'any type usage',
        description: 'Using any defeats TypeScript',
        rule: 'any-type',
      },
      {
        id: 'issue-2',
        category: 'security',
        severity: 'medium',
        file: 'src/utils.ts',
        line: 25,
        title: 'eval usage',
        description: 'eval is dangerous',
        rule: 'eval-usage',
      },
      {
        id: 'issue-3',
        category: 'code-quality',
        severity: 'low',
        file: 'src/helpers.ts',
        line: 5,
        title: 'console.log',
        description: 'Remove console.log',
        rule: 'console-log',
      },
    ],
    recommendations: [],
    ...overrides,
  };
}

type RegisterCall = [string, unknown, unknown, ...unknown[]];
let registerCalls: RegisterCall[];
let mockAnalyzeProject: jest.MockedFunction<AnalysisEngine['analyzeProject']>;

/**
 * Helper: create a fresh McpServer, spy on registerResource,
 * then call attachResources exactly once. Returns captured callbacks.
 */
function setupResources() {
  const mcpServer = new McpServer(
    { name: 'test', version: '1.0.0' },
    { capabilities: { tools: {} } }
  );

  const engineInstance = new AnalysisEngine() as jest.Mocked<AnalysisEngine>;
  mockAnalyzeProject = engineInstance.analyzeProject as jest.MockedFunction<AnalysisEngine['analyzeProject']>;
  (AnalysisEngine as jest.MockedClass<typeof AnalysisEngine>).mockImplementation(() => engineInstance);

  const spy = jest.spyOn(mcpServer, 'registerResource');
  attachResources(mcpServer);

  registerCalls = spy.mock.calls as unknown as RegisterCall[];
  return mcpServer;
}

type ResourceCallback = (
  uri: URL,
  variables: Record<string, unknown>,
  extra: Record<string, unknown>
) => Promise<{ contents: Array<{ uri: string; mimeType: string; text: string }> }>;

/** Get the read callback for a named resource. */
function getCallback(name: string): ResourceCallback {
  const call = registerCalls.find((c) => c[0] === name);
  if (!call) throw new Error(`Resource "${name}" not found`);
  // callback is the last argument
  return call[call.length - 1] as ResourceCallback;
}

describe('attachResources', () => {
  beforeEach(() => jest.clearAllMocks());

  it('should register two resource templates on the McpServer', () => {
    setupResources();
    expect(registerCalls).toHaveLength(2);

    const names = registerCalls.map((c) => c[0]);
    expect(names).toContain('Tech Debt Summary');
    expect(names).toContain('Tech Debt Issues');
  });
});

describe('debt://summary resource', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupResources();
  });

  it('should return summary JSON with health score and SQALE data', async () => {
    const report = makeMockReport();
    mockAnalyzeProject.mockResolvedValue(report);

    const callback = getCallback('Tech Debt Summary');
    const result = await callback(
      new URL('debt://summary//test/project'),
      { projectPath: '/test/project' },
      {}
    );

    expect(result.contents).toHaveLength(1);
    expect(result.contents[0].mimeType).toBe('application/json');

    const parsed = JSON.parse(result.contents[0].text);
    expect(parsed.healthScore).toBe(85);
    expect(parsed.debtScore).toBe(15);
    expect(parsed.totalIssues).toBe(5);
    expect(parsed.sqale.rating).toBe('A');
    expect(parsed.bySeverity.high).toBe(1);
    expect(parsed.byCategory['code-quality']).toBe(3);
  });
});

describe('debt://issues resource', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupResources();
  });

  it('should return all issues as JSON', async () => {
    const report = makeMockReport();
    mockAnalyzeProject.mockResolvedValue(report);

    const callback = getCallback('Tech Debt Issues');
    const result = await callback(
      new URL('debt://issues//test/project'),
      { projectPath: '/test/project' },
      {}
    );

    expect(result.contents).toHaveLength(1);
    expect(result.contents[0].mimeType).toBe('application/json');

    const parsed = JSON.parse(result.contents[0].text);
    expect(parsed.totalCount).toBe(3);
    expect(parsed.issues).toHaveLength(3);
  });

  it('should filter issues by severity', async () => {
    const report = makeMockReport();
    mockAnalyzeProject.mockResolvedValue(report);

    const callback = getCallback('Tech Debt Issues');
    const result = await callback(
      new URL('debt://issues//test/project?severity=high'),
      { projectPath: '/test/project' },
      {}
    );

    const parsed = JSON.parse(result.contents[0].text);
    expect(parsed.totalCount).toBe(1);
    expect(parsed.issues[0].severity).toBe('high');
  });

  it('should filter issues by category', async () => {
    const report = makeMockReport();
    mockAnalyzeProject.mockResolvedValue(report);

    const callback = getCallback('Tech Debt Issues');
    const result = await callback(
      new URL('debt://issues//test/project?category=security'),
      { projectPath: '/test/project' },
      {}
    );

    const parsed = JSON.parse(result.contents[0].text);
    expect(parsed.totalCount).toBe(1);
    expect(parsed.issues[0].category).toBe('security');
  });

  it('should respect limit parameter', async () => {
    const report = makeMockReport();
    mockAnalyzeProject.mockResolvedValue(report);

    const callback = getCallback('Tech Debt Issues');
    const result = await callback(
      new URL('debt://issues//test/project?limit=1'),
      { projectPath: '/test/project' },
      {}
    );

    const parsed = JSON.parse(result.contents[0].text);
    expect(parsed.totalCount).toBe(3);
    expect(parsed.issues).toHaveLength(1);
  });
});

describe('error handling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupResources();
  });

  it('should return error JSON when analyzeProject rejects', async () => {
    mockAnalyzeProject.mockRejectedValue(new Error('Project not found'));

    const callback = getCallback('Tech Debt Summary');
    const result = await callback(
      new URL('debt://summary//bad/path'),
      { projectPath: '/bad/path' },
      {}
    );

    expect(result.contents).toHaveLength(1);
    expect(result.contents[0].mimeType).toBe('application/json');

    const parsed = JSON.parse(result.contents[0].text);
    expect(parsed.error).toBe('Project not found');
  });

  it('should handle non-Error thrown values', async () => {
    mockAnalyzeProject.mockRejectedValue('string error');

    const callback = getCallback('Tech Debt Issues');
    const result = await callback(
      new URL('debt://issues//bad/path'),
      { projectPath: '/bad/path' },
      {}
    );

    const parsed = JSON.parse(result.contents[0].text);
    expect(parsed.error).toBe('Unknown error');
  });

  it('should return error JSON when projectPath is missing in summary resource', async () => {
    const callback = getCallback('Tech Debt Summary');
    const result = await callback(
      new URL('debt://summary/'),
      {},
      {}
    );

    expect(result.contents).toHaveLength(1);
    const parsed = JSON.parse(result.contents[0].text);
    expect(parsed.error).toBe('projectPath must be a string');
    expect(mockAnalyzeProject).not.toHaveBeenCalled();
  });

  it('should return error JSON when projectPath is not a string in summary resource', async () => {
    const callback = getCallback('Tech Debt Summary');
    const result = await callback(
      new URL('debt://summary/'),
      { projectPath: ['not', 'a', 'string'] },
      {}
    );

    expect(result.contents).toHaveLength(1);
    const parsed = JSON.parse(result.contents[0].text);
    expect(parsed.error).toBe('projectPath must be a string');
    expect(mockAnalyzeProject).not.toHaveBeenCalled();
  });

  it('should return error JSON when projectPath is missing in issues resource', async () => {
    const callback = getCallback('Tech Debt Issues');
    const result = await callback(
      new URL('debt://issues/'),
      {},
      {}
    );

    expect(result.contents).toHaveLength(1);
    const parsed = JSON.parse(result.contents[0].text);
    expect(parsed.error).toBe('projectPath must be a string');
    expect(mockAnalyzeProject).not.toHaveBeenCalled();
  });

  it('should return error JSON when projectPath is not a string in issues resource', async () => {
    const callback = getCallback('Tech Debt Issues');
    const result = await callback(
      new URL('debt://issues/'),
      { projectPath: 42 },
      {}
    );

    expect(result.contents).toHaveLength(1);
    const parsed = JSON.parse(result.contents[0].text);
    expect(parsed.error).toBe('projectPath must be a string');
    expect(mockAnalyzeProject).not.toHaveBeenCalled();
  });

  it('should reject a relative projectPath in summary resource', async () => {
    const callback = getCallback('Tech Debt Summary');
    const result = await callback(
      new URL('debt://summary/relative/path'),
      { projectPath: 'relative/path' },
      {}
    );

    expect(result.contents).toHaveLength(1);
    const parsed = JSON.parse(result.contents[0].text);
    expect(parsed.error).toBe('projectPath must be an absolute path');
    expect(mockAnalyzeProject).not.toHaveBeenCalled();
  });

  it('should reject a relative projectPath in issues resource', async () => {
    const callback = getCallback('Tech Debt Issues');
    const result = await callback(
      new URL('debt://issues/relative/path'),
      { projectPath: 'relative/path' },
      {}
    );

    expect(result.contents).toHaveLength(1);
    const parsed = JSON.parse(result.contents[0].text);
    expect(parsed.error).toBe('projectPath must be an absolute path');
    expect(mockAnalyzeProject).not.toHaveBeenCalled();
  });

  it('should normalize a path with .. sequences in summary resource', async () => {
    const report = makeMockReport();
    mockAnalyzeProject.mockResolvedValue(report);

    const callback = getCallback('Tech Debt Summary');
    await callback(
      new URL('debt://summary//test/project/../project'),
      { projectPath: '/test/project/../project' },
      {}
    );

    expect(mockAnalyzeProject).toHaveBeenCalledWith({ path: '/test/project' });
  });

  it('should normalize a path with .. sequences in issues resource', async () => {
    const report = makeMockReport();
    mockAnalyzeProject.mockResolvedValue(report);

    const callback = getCallback('Tech Debt Issues');
    await callback(
      new URL('debt://issues//test/project/../project'),
      { projectPath: '/test/project/../project' },
      {}
    );

    expect(mockAnalyzeProject).toHaveBeenCalledWith({ path: '/test/project' });
  });
});
