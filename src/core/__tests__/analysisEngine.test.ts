import { jest } from '@jest/globals';
import { AnalysisEngine } from '../analysisEngine.js';
import type { TechDebtConfig, FileAnalysisResult } from '../../types/index.js';

const mockAnalyze = jest.fn(() => Promise.resolve({ issues: [] }));

jest.mock('../../utils/fileUtils.js', () => ({
  getProjectFiles: jest.fn(),
  loadConfig: jest.fn(() => Promise.resolve({})),
  findPackageFiles: jest.fn(() => Promise.resolve([])),
  getRelativePath: jest.fn((_base: string, file: string) => {
    // Simulate platform-agnostic relative path
    return file.replace('/project/', '');
  }),
  readFile: jest.fn(() => Promise.resolve('')),
}));
jest.mock('../../analyzers/index.js', () => ({
  createAnalyzer: jest.fn(() => ({ analyze: mockAnalyze })),
}));
jest.mock('../../config/languages.js', () => ({
  LANGUAGE_CONFIGS: { typescript: { extensions: ['.ts'] } },
  getAllExtensions: jest.fn(() => ['.ts']),
  detectLanguageFromExtension: jest.fn((file: string) => (file.endsWith('.ts') ? 'typescript' : null)),
  getSupportedLanguages: jest.fn(() => ['typescript']),
}));

import { getProjectFiles, loadConfig } from '../../utils/fileUtils.js';

const mockGetProjectFiles = getProjectFiles as jest.MockedFunction<typeof getProjectFiles>;
const mockLoadConfig = loadConfig as jest.MockedFunction<typeof loadConfig>;
const mockAnalyzeFile = mockAnalyze as unknown as jest.MockedFunction<(file: string, content: string) => Promise<FileAnalysisResult>>;

const FILES = [
  '/project/src/foo.ts',
  '/project/src/bar.ts',
  '/project/lib/baz.ts',
];

describe('AnalysisEngine.analyzeProject – include glob filtering', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetProjectFiles.mockResolvedValue(FILES);
    mockLoadConfig.mockResolvedValue({} as TechDebtConfig);
    mockAnalyzeFile.mockResolvedValue({ issues: [] } as unknown as FileAnalysisResult);
  });

  it('passes all files through when include is absent', async () => {
    const engine = new AnalysisEngine({});
    await engine.analyzeProject({ path: '/project' });
    expect(mockAnalyzeFile).toHaveBeenCalledTimes(3);
  });

  it('passes all files through when include is an empty array', async () => {
    const engine = new AnalysisEngine({ include: [] });
    await engine.analyzeProject({ path: '/project' });
    expect(mockAnalyzeFile).toHaveBeenCalledTimes(3);
  });

  it('filters to only matching files when include globs are set', async () => {
    const engine = new AnalysisEngine({ include: ['src/**'] });
    await engine.analyzeProject({ path: '/project' });
    // Only src/foo.ts and src/bar.ts match src/**; lib/baz.ts does not
    expect(mockAnalyzeFile).toHaveBeenCalledTimes(2);
    const analyzed = mockAnalyzeFile.mock.calls.map(c => c[0] as string);
    expect(analyzed).toContain('/project/src/foo.ts');
    expect(analyzed).toContain('/project/src/bar.ts');
    expect(analyzed).not.toContain('/project/lib/baz.ts');
  });

  it('accepts a file when any include pattern matches', async () => {
    const engine = new AnalysisEngine({ include: ['lib/**', 'src/foo.ts'] });
    await engine.analyzeProject({ path: '/project' });
    const analyzed = mockAnalyzeFile.mock.calls.map(c => c[0] as string);
    expect(analyzed).toContain('/project/src/foo.ts');
    expect(analyzed).toContain('/project/lib/baz.ts');
    expect(analyzed).not.toContain('/project/src/bar.ts');
  });
});

describe('AnalysisEngine.analyzeProject – include glob POSIX normalization', () => {
  const { getRelativePath } = jest.requireMock('../../utils/fileUtils.js') as jest.Mocked<typeof import('../../utils/fileUtils.js')>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetProjectFiles.mockResolvedValue(FILES);
    mockLoadConfig.mockResolvedValue({} as TechDebtConfig);
    mockAnalyzeFile.mockResolvedValue({ issues: [] } as unknown as FileAnalysisResult);
  });

  it('matches even when getRelativePath returns Windows-style separators', async () => {
    // Simulate Windows path.relative() returning backslashes
    getRelativePath.mockImplementation((_base: string, file: string) =>
      file.replace('/project/', '').replace(/\//g, '\\')
    );

    const engine = new AnalysisEngine({ include: ['src/**'] });
    await engine.analyzeProject({ path: '/project' });

    // Both src files should still match after normalization
    expect(mockAnalyzeFile).toHaveBeenCalledTimes(2);
    const analyzed = mockAnalyzeFile.mock.calls.map(c => c[0] as string);
    expect(analyzed).toContain('/project/src/foo.ts');
    expect(analyzed).toContain('/project/src/bar.ts');
  });
});
