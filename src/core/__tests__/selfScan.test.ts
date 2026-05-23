/**
 * Dogfood self-scan: load each fixture's `.techdebtrc.json` and assert that
 * the corresponding config block produces an observable effect on the output
 * of `AnalysisEngine.analyzeProject()`.
 *
 * One assertion per key in `VALID_CONFIG_KEYS` (the canonical set declared by
 * `src/server/configValidator.ts`). If that set grows, the meta-check at the
 * bottom of this file fails until a fixture + assertion is added here.
 *
 * All 8 assertions are expected to pass — `customPatterns` / TEC-49,
 * `severity` / TEC-56, `include` / TEC-57, and `languageOverrides` / TEC-58
 * have all landed and their respective PRs are merged.
 */
import { existsSync } from 'node:fs';
import { join } from 'node:path';

import { AnalysisEngine } from '../analysisEngine.js';
import type { TechDebtIssue, TechDebtReport } from '../../types/index.js';
import { VALID_CONFIG_KEYS } from '../../server/configValidator.js';

const FIXTURE_ROOT = join(__dirname, '..', '..', '..', 'tests', 'fixtures', 'self-scan');

/** All config keys that {@link VALID_CONFIG_KEYS} accepts in `.techdebtrc.json`. */
const ALL_BLOCKS = [
  'ignore',
  'include',
  'rules',
  'severity',
  'ruleExclusions',
  'customPatterns',
  'languageOverrides',
] as const;

async function analyzeFixture(block: string): Promise<TechDebtReport> {
  const engine = new AnalysisEngine();
  return engine.analyzeProject({ path: join(FIXTURE_ROOT, block) });
}

function issuesIn(report: TechDebtReport, relPathSubstring: string): TechDebtIssue[] {
  return report.issues.filter(i => i.file.includes(relPathSubstring));
}

describe('self-scan: each VALID_CONFIG_KEYS block has an observable effect', () => {
  it('ignore: files under an ignored glob produce no issues', async () => {
    const report = await analyzeFixture('ignore');
    expect(issuesIn(report, 'src/sample.js').length).toBeGreaterThan(0);
    expect(issuesIn(report, 'ignored/')).toEqual([]);
  });

  it('ruleExclusions: rule is suppressed in excluded paths only', async () => {
    const report = await analyzeFixture('ruleExclusions');
    const consoleLogIssues = report.issues.filter(i => i.rule === 'console-log');
    expect(consoleLogIssues.some(i => i.file.includes('src/'))).toBe(true);
    expect(consoleLogIssues.some(i => i.file.includes('excluded/'))).toBe(false);
  });

  it('rules: lowered maxFileLines triggers file-length issue', async () => {
    const report = await analyzeFixture('rules');
    const fileLengthIssues = report.issues.filter(i => i.rule === 'file-length');
    expect(fileLengthIssues.length).toBeGreaterThan(0);
  });

  it('severity: per-rule override is applied to matching issues', async () => {
    const report = await analyzeFixture('severity');
    const consoleLogIssues = report.issues.filter(i => i.rule === 'console-log');
    expect(consoleLogIssues.length).toBeGreaterThan(0);
    expect(consoleLogIssues.every(i => i.severity === 'critical')).toBe(true);
  });

  it('include: only allowlisted paths are analyzed', async () => {
    const report = await analyzeFixture('include');
    expect(issuesIn(report, 'wanted/').length).toBeGreaterThan(0);
    expect(issuesIn(report, 'other/')).toEqual([]);
  });

  it('languageOverrides: extra extensions are analyzed as the mapped language', async () => {
    const report = await analyzeFixture('languageOverrides');
    expect(issuesIn(report, 'sample.special').length).toBeGreaterThan(0);
  });

  it('customPatterns: user-defined pattern fires during project analysis', async () => {
    const report = await analyzeFixture('customPatterns');
    const matched = report.issues.filter(i => i.rule === 'no-forbidden-token');
    expect(matched.length).toBeGreaterThan(0);
  });

  it('meta: every VALID_CONFIG_KEYS block has a fixture directory and .techdebtrc.json', () => {
    // Two-part guard. Updating ALL_BLOCKS alone isn't enough to "satisfy" the
    // contract — a new key must also ship a fixture dir on disk. The `it()`
    // body itself still has to be written by hand; this only catches the
    // "added the key but forgot the fixture" failure mode.
    expect([...ALL_BLOCKS].sort()).toEqual([...VALID_CONFIG_KEYS].sort());
    for (const block of VALID_CONFIG_KEYS) {
      expect(existsSync(join(FIXTURE_ROOT, block))).toBe(true);
      expect(existsSync(join(FIXTURE_ROOT, block, '.techdebtrc.json'))).toBe(true);
    }
  });
});
