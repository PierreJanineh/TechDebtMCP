import { jest } from '@jest/globals';

jest.mock('../../utils/fileUtils.js', () => ({
  getFileStats: jest.fn(),
  readFile: jest.fn(),
  getRelativePath: jest.fn(),
}));

jest.mock('node:fs/promises', () => ({
  readFile: jest.fn(),
}));

import { handleValidateConfig } from '../configValidator.js';
import { getFileStats } from '../../utils/fileUtils.js';
import { readFile as fsReadFile } from 'node:fs/promises';

const mockGetFileStats = getFileStats as jest.MockedFunction<typeof getFileStats>;
const mockFsReadFile = fsReadFile as jest.MockedFunction<typeof fsReadFile>;

/** Helper: stub getFileStats to return a regular-file Stats object. */
function stubStatsFile() {
  mockGetFileStats.mockResolvedValueOnce({ isDirectory: () => false, isFile: () => true } as any);
}

/** Helper: stub getFileStats to return a directory Stats object. */
function stubStatsDir() {
  mockGetFileStats.mockResolvedValueOnce({ isDirectory: () => true, isFile: () => false } as any);
}

describe('handleValidateConfig', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('non-object args rejection', () => {
    it('should throw InvalidParams when args is null', async () => {
      await expect(handleValidateConfig(null)).rejects.toThrow('Tool arguments must be a plain object');
    });

    it('should throw InvalidParams when args is an array', async () => {
      await expect(handleValidateConfig([])).rejects.toThrow('Tool arguments must be a plain object');
    });

    it('should throw InvalidParams when args is a string', async () => {
      await expect(handleValidateConfig('path')).rejects.toThrow('Tool arguments must be a plain object');
    });

    it('should throw InvalidParams when args is a number', async () => {
      await expect(handleValidateConfig(42)).rejects.toThrow('Tool arguments must be a plain object');
    });
  });

  it('should throw InvalidParams when path is missing', async () => {
    await expect(handleValidateConfig({})).rejects.toThrow('Missing or invalid parameter: path');
  });

  it('should throw InvalidParams when path is not a string', async () => {
    await expect(handleValidateConfig({ path: 123 })).rejects.toThrow('Missing or invalid parameter: path');
  });

  it('should throw InvalidParams when path is relative', async () => {
    await expect(handleValidateConfig({ path: 'relative/path' })).rejects.toThrow('path must be an absolute path');
  });

  it('should throw when path does not exist', async () => {
    mockGetFileStats.mockResolvedValueOnce(null);
    await expect(handleValidateConfig({ path: '/no/such/path' })).rejects.toThrow('Path not found or not accessible');
  });

  it('should not leak absolute path in "path not found" error message', async () => {
    mockGetFileStats.mockResolvedValueOnce(null);
    const err = await handleValidateConfig({ path: '/secret/server/path' }).catch(e => e);
    expect(err.message).not.toContain('/secret/server/path');
    expect(err.message).toContain('path');
  });

  it('should report missing config when directory has no .techdebtrc.json', async () => {
    stubStatsDir();
    mockFsReadFile.mockRejectedValueOnce(
      Object.assign(new Error("ENOENT: no such file or directory, open '/project/.techdebtrc.json'"), { code: 'ENOENT' }),
    );

    const result = await handleValidateConfig({ path: '/project' });
    expect(result.content[0].text).toContain('No .techdebtrc.json found');
  });

  it('should not leak absolute path in "missing config" message', async () => {
    stubStatsDir();
    mockFsReadFile.mockRejectedValueOnce(
      Object.assign(new Error("ENOENT: no such file or directory, open '/secret/server/project/.techdebtrc.json'"), { code: 'ENOENT' }),
    );

    const result = await handleValidateConfig({ path: '/secret/server/project' });
    expect(result.content[0].text).not.toContain('/secret/server/project');
    expect(result.content[0].text).toContain('.techdebtrc.json');
  });

  it('should report JSON parse errors', async () => {
    stubStatsFile();
    mockFsReadFile.mockResolvedValueOnce('{ invalid json' as any);

    const result = await handleValidateConfig({ path: '/project/.techdebtrc.json' });
    expect(result.content[0].text).toContain('Invalid JSON');
  });

  it('should not leak absolute path in JSON parse error message', async () => {
    stubStatsFile();
    mockFsReadFile.mockResolvedValueOnce('{ bad' as any);

    const result = await handleValidateConfig({ path: '/secret/server/.techdebtrc.json' });
    expect(result.content[0].text).not.toContain('/secret/server');
    expect(result.content[0].text).toContain('.techdebtrc.json');
  });

  it('should not leak absolute path in valid config message', async () => {
    stubStatsFile();
    mockFsReadFile.mockResolvedValueOnce(JSON.stringify({ ignore: ['node_modules/**'] }) as any);

    const result = await handleValidateConfig({ path: '/secret/server/.techdebtrc.json' });
    expect(result.content[0].text).not.toContain('/secret/server');
    expect(result.content[0].text).toContain('.techdebtrc.json');
  });

  it('should not leak absolute path when getFileStats fails (e.g. EACCES)', async () => {
    // getFileStats() catches all fs errors and returns null, so an EACCES
    // on the root path surfaces as the generic "Path not found" McpError.
    // The important security property is that the error message never
    // contains the absolute path.
    mockGetFileStats.mockResolvedValueOnce(null);

    const err = await handleValidateConfig({ path: '/secret/server/.techdebtrc.json' }).catch(e => e);
    expect(err.message).not.toContain('/secret/server');
    expect(err.message).toContain('.techdebtrc.json');
  });

  it('should not leak absolute path when fsReadFile fails with EACCES', async () => {
    stubStatsFile();
    mockFsReadFile.mockRejectedValueOnce(Object.assign(new Error(`EACCES: permission denied, open '/secret/server/.techdebtrc.json'`), { code: 'EACCES' }));

    const result = await handleValidateConfig({ path: '/secret/server/.techdebtrc.json' });
    expect(result.content[0].text).not.toContain('/secret/server');
    expect(result.content[0].text).toContain('.techdebtrc.json');
  });

  it('should report "Cannot access" (not "Invalid JSON") when fsReadFile fails with a fs error code', async () => {
    stubStatsFile();
    mockFsReadFile.mockRejectedValueOnce(Object.assign(new Error(`EACCES: permission denied, open '/project/.techdebtrc.json'`), { code: 'EACCES' }));

    const result = await handleValidateConfig({ path: '/project/.techdebtrc.json' });
    expect(result.content[0].text).toContain('Cannot access');
    expect(result.content[0].text).not.toContain('Invalid JSON');
  });

  it('should report "not found or not accessible" (not "No .techdebtrc.json found") for ENOENT on a direct file path', async () => {
    stubStatsFile();
    mockFsReadFile.mockRejectedValueOnce(
      Object.assign(new Error("ENOENT: no such file or directory, open '/project/myconfig.json'"), { code: 'ENOENT' }),
    );

    const result = await handleValidateConfig({ path: '/project/myconfig.json' });
    expect(result.content[0].text).not.toContain('No .techdebtrc.json found');
    expect(result.content[0].text).toContain('not found or not accessible');
  });

  it('should reject non-object top-level values (null)', async () => {
    stubStatsFile();
    mockFsReadFile.mockResolvedValueOnce('null' as any);

    const result = await handleValidateConfig({ path: '/project/.techdebtrc.json' });
    expect(result.content[0].text).toContain('Top-level value must be a JSON object');
    expect(result.content[0].text).toContain('null');
  });

  it('should reject array top-level values', async () => {
    stubStatsFile();
    mockFsReadFile.mockResolvedValueOnce('[]' as any);

    const result = await handleValidateConfig({ path: '/project/.techdebtrc.json' });
    expect(result.content[0].text).toContain('array');
  });

  it('should accept a valid config', async () => {
    stubStatsFile();
    mockFsReadFile.mockResolvedValueOnce(JSON.stringify({
      ignore: ['node_modules/**'],
      include: ['src/**'],
      rules: { maxFileLines: 500, maxComplexity: 10 },
      severity: { 'todo-comment': 'low' },
    }) as any);

    const result = await handleValidateConfig({ path: '/project/.techdebtrc.json' });
    expect(result.content[0].text).toContain('is valid');
  });

  it('should warn on unknown top-level keys', async () => {
    stubStatsFile();
    mockFsReadFile.mockResolvedValueOnce(JSON.stringify({ unknownKey: true }) as any);

    const result = await handleValidateConfig({ path: '/project/.techdebtrc.json' });
    expect(result.content[0].text).toContain('Unknown top-level key');
    expect(result.content[0].text).toContain('unknownKey');
  });

  it('should error when ignore is not an array', async () => {
    stubStatsFile();
    mockFsReadFile.mockResolvedValueOnce(JSON.stringify({ ignore: 'not-an-array' }) as any);

    const result = await handleValidateConfig({ path: '/project/.techdebtrc.json' });
    expect(result.content[0].text).toContain('"ignore" must be an array');
  });

  it('should error when ignore contains non-strings', async () => {
    stubStatsFile();
    mockFsReadFile.mockResolvedValueOnce(JSON.stringify({ ignore: ['valid', 42] }) as any);

    const result = await handleValidateConfig({ path: '/project/.techdebtrc.json' });
    expect(result.content[0].text).toContain('must contain only strings');
  });

  it('should error when include is not an array', async () => {
    stubStatsFile();
    mockFsReadFile.mockResolvedValueOnce(JSON.stringify({ include: {} }) as any);

    const result = await handleValidateConfig({ path: '/project/.techdebtrc.json' });
    expect(result.content[0].text).toContain('"include" must be an array');
  });

  it('should error when rules is not an object', async () => {
    stubStatsFile();
    mockFsReadFile.mockResolvedValueOnce(JSON.stringify({ rules: 'bad' }) as any);

    const result = await handleValidateConfig({ path: '/project/.techdebtrc.json' });
    expect(result.content[0].text).toContain('"rules" must be an object');
  });

  it('should error when rule values are not numbers', async () => {
    stubStatsFile();
    mockFsReadFile.mockResolvedValueOnce(JSON.stringify({ rules: { maxFileLines: 'many' } }) as any);

    const result = await handleValidateConfig({ path: '/project/.techdebtrc.json' });
    expect(result.content[0].text).toContain('"rules.maxFileLines" must be a number');
  });

  it('should warn on unknown rule keys', async () => {
    stubStatsFile();
    mockFsReadFile.mockResolvedValueOnce(JSON.stringify({ rules: { badKey: 5 } }) as any);

    const result = await handleValidateConfig({ path: '/project/.techdebtrc.json' });
    expect(result.content[0].text).toContain('Unknown rule key');
    expect(result.content[0].text).toContain('badKey');
  });

  it('should error when severity is not an object', async () => {
    stubStatsFile();
    mockFsReadFile.mockResolvedValueOnce(JSON.stringify({ severity: 'bad' }) as any);

    const result = await handleValidateConfig({ path: '/project/.techdebtrc.json' });
    expect(result.content[0].text).toContain('"severity" must be an object');
  });

  it('should error on invalid severity values', async () => {
    stubStatsFile();
    mockFsReadFile.mockResolvedValueOnce(JSON.stringify({ severity: { 'my-rule': 'extreme' } }) as any);

    const result = await handleValidateConfig({ path: '/project/.techdebtrc.json' });
    expect(result.content[0].text).toContain('invalid value');
    expect(result.content[0].text).toContain('extreme');
  });

  it('should error when languageOverrides is not an object', async () => {
    stubStatsFile();
    mockFsReadFile.mockResolvedValueOnce(JSON.stringify({ languageOverrides: [] }) as any);

    const result = await handleValidateConfig({ path: '/project/.techdebtrc.json' });
    expect(result.content[0].text).toContain('"languageOverrides" must be an object');
  });

  it('should accept valid languageOverrides with nested objects', async () => {
    stubStatsFile();
    mockFsReadFile.mockResolvedValueOnce(JSON.stringify({
      languageOverrides: { typescript: { rules: { maxFileLines: 600 } } },
    }) as any);

    const result = await handleValidateConfig({ path: '/project/.techdebtrc.json' });
    expect(result.content[0].text).toContain('valid');
  });

  it('should validate customPatterns entries', async () => {
    stubStatsFile();
    mockFsReadFile.mockResolvedValueOnce(JSON.stringify({
      customPatterns: [{ id: 'test', pattern: 'TODO', severity: 'low', category: 'code-quality', message: 'found TODO' }],
    }) as any);

    const result = await handleValidateConfig({ path: '/project/.techdebtrc.json' });
    expect(result.content[0].text).toContain('valid');
  });

  it('should error when customPatterns is not an array', async () => {
    stubStatsFile();
    mockFsReadFile.mockResolvedValueOnce(JSON.stringify({ customPatterns: 'bad' }) as any);

    const result = await handleValidateConfig({ path: '/project/.techdebtrc.json' });
    expect(result.content[0].text).toContain('"customPatterns" must be an array');
  });

  it('should accept valid ruleExclusions', async () => {
    stubStatsFile();
    mockFsReadFile.mockResolvedValueOnce(JSON.stringify({
      ruleExclusions: { debugger: ['**/src/analyzers/**'], 'ts-ignore': ['**/src/analyzers/**'] },
    }) as any);

    const result = await handleValidateConfig({ path: '/project/.techdebtrc.json' });
    expect(result.content[0].text).toContain('valid');
  });

  it('should error when ruleExclusions is not an object', async () => {
    stubStatsFile();
    mockFsReadFile.mockResolvedValueOnce(JSON.stringify({ ruleExclusions: 'bad' }) as any);

    const result = await handleValidateConfig({ path: '/project/.techdebtrc.json' });
    expect(result.content[0].text).toContain('"ruleExclusions" must be an object');
  });

  it('should error when ruleExclusions values are not arrays', async () => {
    stubStatsFile();
    mockFsReadFile.mockResolvedValueOnce(JSON.stringify({ ruleExclusions: { debugger: 'bad' } }) as any);

    const result = await handleValidateConfig({ path: '/project/.techdebtrc.json' });
    expect(result.content[0].text).toContain('"ruleExclusions.debugger" must be an array');
  });

  it('should error when ruleExclusions arrays contain non-strings', async () => {
    stubStatsFile();
    mockFsReadFile.mockResolvedValueOnce(JSON.stringify({ ruleExclusions: { debugger: ['valid', 42] } }) as any);

    const result = await handleValidateConfig({ path: '/project/.techdebtrc.json' });
    expect(result.content[0].text).toContain('"ruleExclusions.debugger" array must contain only strings');
  });
});
