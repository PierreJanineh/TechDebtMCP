import { jest } from '@jest/globals';

jest.mock('../../utils/fileUtils.js', () => ({
  fileExists: jest.fn(),
  readFile: jest.fn(),
  getRelativePath: jest.fn(),
}));

jest.mock('node:fs/promises', () => ({
  readFile: jest.fn(),
  stat: jest.fn(),
}));

import { handleValidateConfig } from '../configValidator.js';
import { fileExists } from '../../utils/fileUtils.js';
import { readFile as fsReadFile, stat } from 'node:fs/promises';

const mockFileExists = fileExists as jest.MockedFunction<typeof fileExists>;
const mockFsReadFile = fsReadFile as jest.MockedFunction<typeof fsReadFile>;
const mockStat = stat as jest.MockedFunction<typeof stat>;

describe('handleValidateConfig', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should throw when path does not exist', async () => {
    mockFileExists.mockResolvedValue(false);
    await expect(handleValidateConfig({ path: '/no/such/path' })).rejects.toThrow('Path not found');
  });

  it('should report missing config when directory has no .techdebtrc.json', async () => {
    mockFileExists.mockResolvedValueOnce(true);
    mockStat.mockResolvedValueOnce({ isDirectory: () => true } as any);
    mockFileExists.mockResolvedValueOnce(false);

    const result = await handleValidateConfig({ path: '/project' });
    expect(result.content[0].text).toContain('No .techdebtrc.json found');
  });

  it('should report JSON parse errors', async () => {
    mockFileExists.mockResolvedValue(true);
    mockStat.mockResolvedValueOnce({ isDirectory: () => false } as any);
    mockFsReadFile.mockResolvedValueOnce('{ invalid json' as any);

    const result = await handleValidateConfig({ path: '/project/.techdebtrc.json' });
    expect(result.content[0].text).toContain('Invalid JSON');
  });

  it('should reject non-object top-level values (null)', async () => {
    mockFileExists.mockResolvedValue(true);
    mockStat.mockResolvedValueOnce({ isDirectory: () => false } as any);
    mockFsReadFile.mockResolvedValueOnce('null' as any);

    const result = await handleValidateConfig({ path: '/project/.techdebtrc.json' });
    expect(result.content[0].text).toContain('Top-level value must be a JSON object');
    expect(result.content[0].text).toContain('null');
  });

  it('should reject array top-level values', async () => {
    mockFileExists.mockResolvedValue(true);
    mockStat.mockResolvedValueOnce({ isDirectory: () => false } as any);
    mockFsReadFile.mockResolvedValueOnce('[]' as any);

    const result = await handleValidateConfig({ path: '/project/.techdebtrc.json' });
    expect(result.content[0].text).toContain('array');
  });

  it('should accept a valid config', async () => {
    mockFileExists.mockResolvedValue(true);
    mockStat.mockResolvedValueOnce({ isDirectory: () => false } as any);
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
    mockFileExists.mockResolvedValue(true);
    mockStat.mockResolvedValueOnce({ isDirectory: () => false } as any);
    mockFsReadFile.mockResolvedValueOnce(JSON.stringify({ unknownKey: true }) as any);

    const result = await handleValidateConfig({ path: '/project/.techdebtrc.json' });
    expect(result.content[0].text).toContain('Unknown top-level key');
    expect(result.content[0].text).toContain('unknownKey');
  });

  it('should error when ignore is not an array', async () => {
    mockFileExists.mockResolvedValue(true);
    mockStat.mockResolvedValueOnce({ isDirectory: () => false } as any);
    mockFsReadFile.mockResolvedValueOnce(JSON.stringify({ ignore: 'not-an-array' }) as any);

    const result = await handleValidateConfig({ path: '/project/.techdebtrc.json' });
    expect(result.content[0].text).toContain('"ignore" must be an array');
  });

  it('should error when ignore contains non-strings', async () => {
    mockFileExists.mockResolvedValue(true);
    mockStat.mockResolvedValueOnce({ isDirectory: () => false } as any);
    mockFsReadFile.mockResolvedValueOnce(JSON.stringify({ ignore: ['valid', 42] }) as any);

    const result = await handleValidateConfig({ path: '/project/.techdebtrc.json' });
    expect(result.content[0].text).toContain('must contain only strings');
  });

  it('should error when include is not an array', async () => {
    mockFileExists.mockResolvedValue(true);
    mockStat.mockResolvedValueOnce({ isDirectory: () => false } as any);
    mockFsReadFile.mockResolvedValueOnce(JSON.stringify({ include: {} }) as any);

    const result = await handleValidateConfig({ path: '/project/.techdebtrc.json' });
    expect(result.content[0].text).toContain('"include" must be an array');
  });

  it('should error when rules is not an object', async () => {
    mockFileExists.mockResolvedValue(true);
    mockStat.mockResolvedValueOnce({ isDirectory: () => false } as any);
    mockFsReadFile.mockResolvedValueOnce(JSON.stringify({ rules: 'bad' }) as any);

    const result = await handleValidateConfig({ path: '/project/.techdebtrc.json' });
    expect(result.content[0].text).toContain('"rules" must be an object');
  });

  it('should error when rule values are not numbers', async () => {
    mockFileExists.mockResolvedValue(true);
    mockStat.mockResolvedValueOnce({ isDirectory: () => false } as any);
    mockFsReadFile.mockResolvedValueOnce(JSON.stringify({ rules: { maxFileLines: 'many' } }) as any);

    const result = await handleValidateConfig({ path: '/project/.techdebtrc.json' });
    expect(result.content[0].text).toContain('"rules.maxFileLines" must be a number');
  });

  it('should warn on unknown rule keys', async () => {
    mockFileExists.mockResolvedValue(true);
    mockStat.mockResolvedValueOnce({ isDirectory: () => false } as any);
    mockFsReadFile.mockResolvedValueOnce(JSON.stringify({ rules: { badKey: 5 } }) as any);

    const result = await handleValidateConfig({ path: '/project/.techdebtrc.json' });
    expect(result.content[0].text).toContain('Unknown rule key');
    expect(result.content[0].text).toContain('badKey');
  });

  it('should error on invalid severity values', async () => {
    mockFileExists.mockResolvedValue(true);
    mockStat.mockResolvedValueOnce({ isDirectory: () => false } as any);
    mockFsReadFile.mockResolvedValueOnce(JSON.stringify({ severity: { 'my-rule': 'extreme' } }) as any);

    const result = await handleValidateConfig({ path: '/project/.techdebtrc.json' });
    expect(result.content[0].text).toContain('invalid value');
    expect(result.content[0].text).toContain('extreme');
  });

  it('should error when languageOverrides is not an object', async () => {
    mockFileExists.mockResolvedValue(true);
    mockStat.mockResolvedValueOnce({ isDirectory: () => false } as any);
    mockFsReadFile.mockResolvedValueOnce(JSON.stringify({ languageOverrides: [] }) as any);

    const result = await handleValidateConfig({ path: '/project/.techdebtrc.json' });
    expect(result.content[0].text).toContain('"languageOverrides" must be an object');
  });

  it('should validate customPatterns entries', async () => {
    mockFileExists.mockResolvedValue(true);
    mockStat.mockResolvedValueOnce({ isDirectory: () => false } as any);
    mockFsReadFile.mockResolvedValueOnce(JSON.stringify({
      customPatterns: [{ id: 'test', pattern: 'TODO', severity: 'low', category: 'code-quality', message: 'found TODO' }],
    }) as any);

    const result = await handleValidateConfig({ path: '/project/.techdebtrc.json' });
    expect(result.content[0].text).toContain('valid');
  });

  it('should error when customPatterns is not an array', async () => {
    mockFileExists.mockResolvedValue(true);
    mockStat.mockResolvedValueOnce({ isDirectory: () => false } as any);
    mockFsReadFile.mockResolvedValueOnce(JSON.stringify({ customPatterns: 'bad' }) as any);

    const result = await handleValidateConfig({ path: '/project/.techdebtrc.json' });
    expect(result.content[0].text).toContain('"customPatterns" must be an array');
  });
});
