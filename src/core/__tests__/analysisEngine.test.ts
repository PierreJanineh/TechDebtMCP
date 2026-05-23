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
  analyzeFileContent: jest.fn(() => Promise.resolve({ issues: [] })),
}));
jest.mock('../../config/languages.js', () => ({
  LANGUAGE_CONFIGS: { typescript: { extensions: ['.ts'] } },
  getAllExtensions: jest.fn(() => ['.ts']),
  detectLanguageFromExtension: jest.fn((file: string) => (file.endsWith('.ts') ? 'typescript' : null)),
  getSupportedLanguages: jest.fn(() => ['typescript']),
}));

import { getProjectFiles, loadConfig } from '../../utils/fileUtils.js';
import { analyzeFileContent } from '../../analyzers/index.js';

const mockGetProjectFiles = getProjectFiles as jest.MockedFunction<typeof getProjectFiles>;
const mockLoadConfig = loadConfig as jest.MockedFunction<typeof loadConfig>;
// analyzeFileContent is mocked inline in jest.mock factory above; cast to access jest mock API
const mockAnalyzeFile = analyzeFileContent as jest.MockedFunction<typeof analyzeFileContent>;

const FILES = [
  'src/foo.ts',
  'src/bar.ts',
  'lib/baz.ts',
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
    expect(analyzed).toContain('src/foo.ts');
    expect(analyzed).toContain('src/bar.ts');
    expect(analyzed).not.toContain('lib/baz.ts');
  });

  it('accepts a file when any include pattern matches', async () => {
    const engine = new AnalysisEngine({ include: ['lib/**', 'src/foo.ts'] });
    await engine.analyzeProject({ path: '/project' });
    const analyzed = mockAnalyzeFile.mock.calls.map(c => c[0] as string);
    expect(analyzed).toContain('src/foo.ts');
    expect(analyzed).toContain('lib/baz.ts');
    expect(analyzed).not.toContain('src/bar.ts');
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
    expect(analyzed).toContain('src\\foo.ts');
    expect(analyzed).toContain('src\\bar.ts');
  });
});

describe('AnalysisEngine.analyzeProject – languageOverrides extensions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetProjectFiles.mockResolvedValue(FILES);
    mockLoadConfig.mockResolvedValue({} as TechDebtConfig);
    mockAnalyzeFile.mockResolvedValue({ issues: [] } as unknown as FileAnalysisResult);
  });

  it('passes extra override extensions to getProjectFiles', async () => {
    const config: TechDebtConfig = {
      languageOverrides: {
        typescript: { extensions: ['.mts'] },
      },
    };
    const engine = new AnalysisEngine(config);
    await engine.analyzeProject({ path: '/project' });
    const [, extensions] = mockGetProjectFiles.mock.calls[0] as [string, string[], unknown];
    expect(extensions).toContain('.ts');   // from base LANGUAGE_CONFIGS
    expect(extensions).toContain('.mts');  // from languageOverrides
  });

  it('does not duplicate extensions already in the base list', async () => {
    const config: TechDebtConfig = {
      languageOverrides: {
        typescript: { extensions: ['.ts'] }, // .ts already in base
      },
    };
    const engine = new AnalysisEngine(config);
    await engine.analyzeProject({ path: '/project' });
    const [, extensions] = mockGetProjectFiles.mock.calls[0] as [string, string[], unknown];
    const count = extensions.filter(e => e === '.ts').length;
    expect(count).toBe(1);
  });
});

describe('AnalysisEngine.analyzeProject – languageOverrides language detection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLoadConfig.mockResolvedValue({} as TechDebtConfig);
    mockAnalyzeFile.mockResolvedValue({ issues: [] } as unknown as FileAnalysisResult);
  });

  it('override extension takes precedence over static detectLanguageFromExtension', async () => {
    // .myts is not in the base config; detectLanguageFromExtension returns null for it
    mockGetProjectFiles.mockResolvedValue(['/project/src/foo.myts']);
    const config: TechDebtConfig = {
      languageOverrides: {
        typescript: { extensions: ['.myts'] },
      },
    };
    const engine = new AnalysisEngine(config);
    await engine.analyzeProject({ path: '/project' });
    // analyzeFileContent should be invoked with the override-detected language
    expect(mockAnalyzeFile).toHaveBeenCalledWith(expect.any(String), expect.any(String), 'typescript', expect.any(Object));
  });
});

describe('AnalysisEngine.analyzeProject – languageOverrides config merging', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetProjectFiles.mockResolvedValue(['src/foo.ts']);
    mockLoadConfig.mockResolvedValue({} as TechDebtConfig);
    mockAnalyzeFile.mockResolvedValue({ issues: [] } as unknown as FileAnalysisResult);
  });

  it('per-language severity override is merged into the config passed to analyzeFileContent', async () => {
    const config: TechDebtConfig = {
      languageOverrides: {
        typescript: { severity: { 'todo-comment': 'critical' } },
      },
    };
    const engine = new AnalysisEngine(config);
    await engine.analyzeProject({ path: '/project' });
    // analyzeFileContent(filePath, content, language, config) — config is arg index 3
    const calledConfig = (mockAnalyzeFile.mock.calls[0] as unknown[])[3] as TechDebtConfig;
    expect(calledConfig.severity?.['todo-comment']).toBe('critical');
  });

  it('per-language rules override is merged into the config passed to analyzeFileContent', async () => {
    const config: TechDebtConfig = {
      languageOverrides: {
        typescript: { rules: { maxFileLines: 200 } },
      },
    };
    const engine = new AnalysisEngine(config);
    await engine.analyzeProject({ path: '/project' });
    // analyzeFileContent(filePath, content, language, config) — config is arg index 3
    const calledConfig = (mockAnalyzeFile.mock.calls[0] as unknown[])[3] as TechDebtConfig;
    expect(calledConfig.rules?.maxFileLines).toBe(200);
  });
});
