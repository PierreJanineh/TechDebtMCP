import { TOOL_DEFINITIONS } from '../tools.js';

const READ_ONLY_TOOLS = new Set([
  'analyze_project',
  'analyze_file',
  'get_debt_summary',
  'get_sqale_metrics',
  'list_supported_languages',
  'get_recommendations',
  'get_issues_by_severity',
  'get_issues_by_category',
  'list_custom_rules',
  'execute_custom_rules',
  'validate_custom_pattern',
  'check_dependencies',
  'validate_config',
  'get_vulnerability_report',
]);

const DESTRUCTIVE_TOOLS = new Set(['add_custom_rule', 'remove_custom_rule']);

describe('TOOL_DEFINITIONS annotations', () => {
  it('every tool declares an annotations object', () => {
    for (const tool of TOOL_DEFINITIONS) {
      expect(tool).toHaveProperty('annotations');
      expect(typeof tool.annotations).toBe('object');
    }
  });

  it('each tool is classified as exactly one of read-only or destructive', () => {
    for (const tool of TOOL_DEFINITIONS) {
      const isRead = READ_ONLY_TOOLS.has(tool.name);
      const isWrite = DESTRUCTIVE_TOOLS.has(tool.name);
      expect(isRead !== isWrite).toBe(true);
    }
  });

  it.each([...READ_ONLY_TOOLS])('%s has readOnlyHint=true', (name) => {
    const tool = TOOL_DEFINITIONS.find((t) => t.name === name);
    expect(tool).toBeDefined();
    expect((tool!.annotations as { readOnlyHint?: boolean }).readOnlyHint).toBe(true);
  });

  it.each([...DESTRUCTIVE_TOOLS])('%s has destructiveHint=true', (name) => {
    const tool = TOOL_DEFINITIONS.find((t) => t.name === name);
    expect(tool).toBeDefined();
    expect((tool!.annotations as { destructiveHint?: boolean }).destructiveHint).toBe(true);
  });

  it('classification covers every tool in TOOL_DEFINITIONS', () => {
    const allClassified = new Set([...READ_ONLY_TOOLS, ...DESTRUCTIVE_TOOLS]);
    for (const tool of TOOL_DEFINITIONS) {
      expect(allClassified.has(tool.name)).toBe(true);
    }
    expect(TOOL_DEFINITIONS.length).toBe(allClassified.size);
  });
});
