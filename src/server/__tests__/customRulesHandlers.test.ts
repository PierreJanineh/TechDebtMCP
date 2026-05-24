import { jest } from '@jest/globals';
import type { Stats } from 'node:fs';
import { McpError } from '@modelcontextprotocol/sdk/types.js';
import { handleExecuteCustomRules } from '../customRulesHandlers.js';
import { CustomRulesEngine, MAX_FILE_SIZE_BYTES } from '../../core/customRulesEngine.js';
import { getFileStats, readFile } from '../../utils/fileUtils.js';

jest.mock('../../utils/fileUtils.js', () => ({
  readFile: jest.fn(),
  getFileStats: jest.fn(),
}));

const mockGetFileStats = getFileStats as jest.MockedFunction<typeof getFileStats>;
const mockReadFile = readFile as jest.MockedFunction<typeof readFile>;

describe('handleExecuteCustomRules — language inference (TEC-50)', () => {
  let engine: CustomRulesEngine;

  beforeEach(() => {
    jest.clearAllMocks();
    engine = new CustomRulesEngine();
    engine.addRule({
      id: 'no-foo',
      pattern: 'foo',
      message: 'No foo',
      severity: 'medium',
      category: 'code-quality',
      languages: ['typescript'],
    });
    mockGetFileStats.mockResolvedValue({ size: 16, isFile: () => true } as unknown as Stats);
    mockReadFile.mockResolvedValue('const x = foo;');
  });

  it('infers language from .ts extension when path is given and language is omitted', async () => {
    const res = await handleExecuteCustomRules(engine, { path: '/tmp/sample.ts' });
    expect(res.content[0].text).toContain('no-foo');
  });

  it('still respects explicit language override when path is given', async () => {
    // path is .rb (infers ruby), but explicit language: 'typescript' must win
    mockReadFile.mockResolvedValue('const x = foo;');
    const res = await handleExecuteCustomRules(engine, { path: '/tmp/sample.rb', language: 'typescript' });
    expect(res.content[0].text).toContain('no-foo');
  });

  it('filters out the rule when the path extension does not match the rule languages filter', async () => {
    mockReadFile.mockResolvedValue('puts "foo"');
    const res = await handleExecuteCustomRules(engine, { path: '/tmp/sample.rb' });
    expect(res.content[0].text).toContain('No custom rule violations found');
  });

  it('runs the rule when no path is given and code is supplied with matching language', async () => {
    const res = await handleExecuteCustomRules(engine, { code: 'const x = foo;', language: 'typescript' });
    expect(res.content[0].text).toContain('no-foo');
  });

  it('rejects files that exceed MAX_FILE_SIZE_BYTES', async () => {
    mockGetFileStats.mockResolvedValue({ size: MAX_FILE_SIZE_BYTES + 1, isFile: () => true } as unknown as Stats);
    await expect(handleExecuteCustomRules(engine, { path: '/tmp/sample.ts' })).rejects.toThrow(McpError);
  });
});
