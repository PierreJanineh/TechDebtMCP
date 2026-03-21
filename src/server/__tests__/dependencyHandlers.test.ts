import { jest } from '@jest/globals';

jest.mock('../../utils/fileUtils.js', () => ({
  fileExists: jest.fn(),
  readFile: jest.fn(),
  getRelativePath: jest.fn((_base: string, full: string) => full),
}));

jest.mock('../../analyzers/dependencies/index.js', () => ({
  createDependencyParser: jest.fn(),
  getAllPackageFileNames: jest.fn(() => ['package.json', 'requirements.txt']),
  getAllParsers: jest.fn(() => []),
  BaseDependencyParser: class {},
}));

jest.mock('node:fs/promises', () => ({
  readdir: jest.fn(),
  stat: jest.fn(),
}));

import { handleCheckDependencies, handleGetVulnerabilityReport } from '../dependencyHandlers.js';
import { fileExists, readFile, getRelativePath } from '../../utils/fileUtils.js';
import { createDependencyParser } from '../../analyzers/dependencies/index.js';
import { readdir, stat } from 'node:fs/promises';

const mockFileExists = fileExists as jest.MockedFunction<typeof fileExists>;
const mockReadFile = readFile as jest.MockedFunction<typeof readFile>;
const mockGetRelativePath = getRelativePath as jest.MockedFunction<typeof getRelativePath>;
const mockCreateDependencyParser = createDependencyParser as jest.MockedFunction<typeof createDependencyParser>;
const mockReaddir = readdir as jest.MockedFunction<typeof readdir>;
const mockStat = stat as jest.MockedFunction<typeof stat>;

/** Helper to build a mock parser instance. */
function makeMockParser(
  deps: Array<{ name: string; version: string; isDev: boolean; source: string }>,
  ecosystem = 'npm'
) {
  return {
    parse: jest.fn<any>().mockResolvedValue(deps),
    getEcosystem: jest.fn().mockReturnValue(ecosystem),
    canParse: jest.fn().mockReturnValue(true),
    getPackageFileNames: jest.fn().mockReturnValue(['package.json']),
  };
}

describe('handleCheckDependencies', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetRelativePath.mockImplementation((_base, full) => full);
  });

  describe('non-object args rejection', () => {
    it('should throw InvalidParams when args is null', async () => {
      await expect(handleCheckDependencies(null)).rejects.toThrow('Tool arguments must be a plain object');
    });

    it('should throw InvalidParams when args is an array', async () => {
      await expect(handleCheckDependencies([])).rejects.toThrow('Tool arguments must be a plain object');
    });

    it('should throw InvalidParams when args is a string', async () => {
      await expect(handleCheckDependencies('path')).rejects.toThrow('Tool arguments must be a plain object');
    });

    it('should throw InvalidParams when args is a number', async () => {
      await expect(handleCheckDependencies(42)).rejects.toThrow('Tool arguments must be a plain object');
    });
  });

  it('should throw InvalidParams when path is missing', async () => {
    await expect(handleCheckDependencies({})).rejects.toThrow('Missing or invalid required parameter: path');
  });

  it('should throw InvalidParams when path is not a string', async () => {
    await expect(handleCheckDependencies({ path: 123 })).rejects.toThrow('Missing or invalid required parameter: path');
  });

  it('should throw when project path does not exist', async () => {
    mockFileExists.mockResolvedValue(false);
    await expect(handleCheckDependencies({ path: '/missing' })).rejects.toThrow('Project path not found');
  });

  it('should throw when path is not a directory', async () => {
    mockFileExists.mockResolvedValue(true);
    mockStat.mockResolvedValueOnce({ isDirectory: () => false } as any);
    await expect(handleCheckDependencies({ path: '/project/file.txt' })).rejects.toThrow('Path is not a directory');
  });

  it('should return report with no package files found', async () => {
    mockFileExists.mockResolvedValue(true);
    mockStat.mockResolvedValueOnce({ isDirectory: () => true } as any);
    mockReaddir.mockResolvedValue([] as any);

    const result = await handleCheckDependencies({ path: '/project' });
    expect(result.content[0].text).toContain('Dependency Analysis');
    expect(result.content[0].text).toContain('0 package file(s)');
  });

  it('should parse dependencies from discovered files', async () => {
    mockFileExists.mockResolvedValue(true);
    mockStat.mockResolvedValueOnce({ isDirectory: () => true } as any);
    mockReaddir.mockResolvedValueOnce(['package.json'] as any);
    mockStat.mockResolvedValueOnce({ isDirectory: () => false, isFile: () => true } as any);

    const parser = makeMockParser([
      { name: 'express', version: '^4.18.0', isDev: false, source: 'package.json' },
      { name: 'jest', version: '^29.0.0', isDev: true, source: 'package.json' },
    ]);
    mockCreateDependencyParser.mockReturnValue(parser as any);
    mockReadFile.mockResolvedValue('{}');

    const result = await handleCheckDependencies({ path: '/project', includeDev: true });
    expect(result.content[0].text).toContain('express');
    expect(result.content[0].text).toContain('jest');
  });

  it('should exclude dev dependencies when includeDev is false', async () => {
    mockFileExists.mockResolvedValue(true);
    mockStat.mockResolvedValueOnce({ isDirectory: () => true } as any);
    mockReaddir.mockResolvedValueOnce(['package.json'] as any);
    mockStat.mockResolvedValueOnce({ isDirectory: () => false, isFile: () => true } as any);

    const parser = makeMockParser([
      { name: 'express', version: '^4.18.0', isDev: false, source: 'package.json' },
      { name: 'jest', version: '^29.0.0', isDev: true, source: 'package.json' },
    ]);
    mockCreateDependencyParser.mockReturnValue(parser as any);
    mockReadFile.mockResolvedValue('{}');

    const result = await handleCheckDependencies({ path: '/project', includeDev: false });
    expect(result.content[0].text).toContain('express');
    expect(result.content[0].text).not.toContain('jest');
  });

  it('should report parse failures', async () => {
    mockFileExists.mockResolvedValue(true);
    mockStat.mockResolvedValueOnce({ isDirectory: () => true } as any);
    mockReaddir.mockResolvedValueOnce(['package.json'] as any);
    mockStat.mockResolvedValueOnce({ isDirectory: () => false, isFile: () => true } as any);

    const parser = {
      parse: jest.fn<any>().mockRejectedValue(new Error('Malformed JSON')),
      getEcosystem: jest.fn().mockReturnValue('npm'),
      canParse: jest.fn().mockReturnValue(true),
      getPackageFileNames: jest.fn().mockReturnValue(['package.json']),
    };
    mockCreateDependencyParser.mockReturnValue(parser as any);
    mockReadFile.mockResolvedValue('invalid');

    const result = await handleCheckDependencies({ path: '/project' });
    expect(result.content[0].text).toContain('Failed to parse');
    expect(result.content[0].text).toContain('Malformed JSON');
  });

  it('should surface filesystem scan errors', async () => {
    mockFileExists.mockResolvedValue(true);
    mockStat.mockResolvedValueOnce({ isDirectory: () => true } as any);
    mockReaddir.mockRejectedValueOnce(new Error('EACCES: permission denied'));

    const result = await handleCheckDependencies({ path: '/project' });
    expect(result.content[0].text).toContain('Filesystem scan errors');
    expect(result.content[0].text).toContain('EACCES');
  });
});

describe('handleGetVulnerabilityReport', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetRelativePath.mockImplementation((_base, full) => full);
  });

  describe('non-object args rejection', () => {
    it('should throw InvalidParams when args is null', async () => {
      await expect(handleGetVulnerabilityReport(null)).rejects.toThrow('Tool arguments must be a plain object');
    });

    it('should throw InvalidParams when args is an array', async () => {
      await expect(handleGetVulnerabilityReport([])).rejects.toThrow('Tool arguments must be a plain object');
    });

    it('should throw InvalidParams when args is a string', async () => {
      await expect(handleGetVulnerabilityReport('path')).rejects.toThrow('Tool arguments must be a plain object');
    });

    it('should throw InvalidParams when args is a number', async () => {
      await expect(handleGetVulnerabilityReport(42)).rejects.toThrow('Tool arguments must be a plain object');
    });
  });

  it('should throw InvalidParams when path is missing', async () => {
    await expect(handleGetVulnerabilityReport({})).rejects.toThrow('Missing or invalid required parameter: path');
  });

  it('should throw InvalidParams when path is not a string', async () => {
    await expect(handleGetVulnerabilityReport({ path: 123 })).rejects.toThrow('Missing or invalid required parameter: path');
  });

  it('should throw when project path does not exist', async () => {
    mockFileExists.mockResolvedValue(false);
    await expect(handleGetVulnerabilityReport({ path: '/missing' })).rejects.toThrow('Project path not found');
  });

  it('should throw when path is not a directory', async () => {
    mockFileExists.mockResolvedValue(true);
    mockStat.mockResolvedValueOnce({ isDirectory: () => false } as any);
    await expect(handleGetVulnerabilityReport({ path: '/project/file.txt' })).rejects.toThrow('Path is not a directory');
  });

  it('should default includeDev to false', async () => {
    mockFileExists.mockResolvedValue(true);
    mockStat.mockResolvedValueOnce({ isDirectory: () => true } as any);
    mockReaddir.mockResolvedValueOnce(['package.json'] as any);
    mockStat.mockResolvedValueOnce({ isDirectory: () => false, isFile: () => true } as any);

    const parser = makeMockParser([
      { name: 'express', version: '^4.18.0', isDev: false, source: 'package.json' },
      { name: 'jest', version: '^29.0.0', isDev: true, source: 'package.json' },
    ]);
    mockCreateDependencyParser.mockReturnValue(parser as any);
    mockReadFile.mockResolvedValue('{}');

    const result = await handleGetVulnerabilityReport({ path: '/project' });
    expect(result.content[0].text).toContain('Dev dependencies included:** No');
  });

  it('should include dev dependencies when explicitly enabled', async () => {
    mockFileExists.mockResolvedValue(true);
    mockStat.mockResolvedValueOnce({ isDirectory: () => true } as any);
    mockReaddir.mockResolvedValueOnce(['package.json'] as any);
    mockStat.mockResolvedValueOnce({ isDirectory: () => false, isFile: () => true } as any);

    const parser = makeMockParser([
      { name: 'express', version: '^4.18.0', isDev: false, source: 'package.json' },
      { name: 'jest', version: '^29.0.0', isDev: true, source: 'package.json' },
    ]);
    mockCreateDependencyParser.mockReturnValue(parser as any);
    mockReadFile.mockResolvedValue('{}');

    const result = await handleGetVulnerabilityReport({ path: '/project', includeDev: true });
    expect(result.content[0].text).toContain('Dev dependencies included:** Yes');
    expect(result.content[0].text).toContain('jest');
  });

  it('should report when no package manifests are found', async () => {
    mockFileExists.mockResolvedValue(true);
    mockStat.mockResolvedValueOnce({ isDirectory: () => true } as any);
    mockReaddir.mockResolvedValue([] as any);

    const result = await handleGetVulnerabilityReport({ path: '/project' });
    expect(result.content[0].text).toContain('No package manifests detected');
  });

  it('should omit empty manifest sections from report', async () => {
    mockFileExists.mockResolvedValue(true);
    mockStat.mockResolvedValueOnce({ isDirectory: () => true } as any);
    mockReaddir.mockResolvedValueOnce(['package.json'] as any);
    mockStat.mockResolvedValueOnce({ isDirectory: () => false, isFile: () => true } as any);

    // Parser returns only dev deps — default includeDev=false means all filtered out
    const parser = makeMockParser([
      { name: 'jest', version: '^29.0.0', isDev: true, source: 'package.json' },
    ]);
    mockCreateDependencyParser.mockReturnValue(parser as any);
    mockReadFile.mockResolvedValue('{}');

    const result = await handleGetVulnerabilityReport({ path: '/project' });
    expect(result.content[0].text).toContain('Total dependencies inventoried:** 0');
    expect(result.content[0].text).not.toContain('| Package | Version |');
  });

  it('should surface filesystem scan errors in report', async () => {
    mockFileExists.mockResolvedValue(true);
    mockStat.mockResolvedValueOnce({ isDirectory: () => true } as any);
    mockReaddir.mockRejectedValueOnce(new Error('EACCES: permission denied'));

    const result = await handleGetVulnerabilityReport({ path: '/project' });
    expect(result.content[0].text).toContain('Filesystem scan errors');
    expect(result.content[0].text).toContain('EACCES');
  });

  it('should report failed parses', async () => {
    mockFileExists.mockResolvedValue(true);
    mockStat.mockResolvedValueOnce({ isDirectory: () => true } as any);
    mockReaddir.mockResolvedValueOnce(['package.json'] as any);
    mockStat.mockResolvedValueOnce({ isDirectory: () => false, isFile: () => true } as any);

    const parser = {
      parse: jest.fn<any>().mockRejectedValue(new Error('Unexpected token')),
      getEcosystem: jest.fn().mockReturnValue('npm'),
      canParse: jest.fn().mockReturnValue(true),
      getPackageFileNames: jest.fn().mockReturnValue(['package.json']),
    };
    mockCreateDependencyParser.mockReturnValue(parser as any);
    mockReadFile.mockResolvedValue('bad');

    const result = await handleGetVulnerabilityReport({ path: '/project' });
    expect(result.content[0].text).toContain('Failed to parse');
    expect(result.content[0].text).toContain('Unexpected token');
  });
});
