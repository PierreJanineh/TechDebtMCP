import path from 'node:path';
import { McpError } from '@modelcontextprotocol/sdk/types.js';
import {
  parseAnalyzeProjectInput,
  parseAnalyzeFileInput,
  parseGetDebtSummaryInput,
  parseGetSqaleMetricsInput,
  parseGetRecommendationsInput,
  parseGetIssuesBySeverityInput,
  parseGetIssuesByCategoryInput,
  parseAddCustomRuleInput,
  parseRemoveCustomRuleInput,
  parseExecuteCustomRulesInput,
  parseValidateCustomPatternInput,
} from '../inputParser.js';
import { MAX_CODE_LENGTH } from '../../core/customRulesEngine.js';

describe('inputParser', () => {
  // ---- top-level shape validation ----
  describe('non-object args rejection', () => {
    it('throws McpError(InvalidParams) when args is null', () => {
      expect(() => parseAnalyzeProjectInput(null)).toThrow(McpError);
    });

    it('throws McpError(InvalidParams) when args is an array', () => {
      expect(() => parseAnalyzeProjectInput(['/project'])).toThrow(McpError);
    });

    it('throws McpError(InvalidParams) when args is a string', () => {
      expect(() => parseAnalyzeFileInput('/file.ts')).toThrow(McpError);
    });

    it('throws McpError(InvalidParams) when args is a number', () => {
      expect(() => parseGetDebtSummaryInput(42)).toThrow(McpError);
    });
  });

  // ---- parseAnalyzeProjectInput ----
  describe('parseAnalyzeProjectInput', () => {
    it('returns typed object for valid full input', () => {
      const result = parseAnalyzeProjectInput({
        path: '/project',
        languages: ['typescript', 'javascript'],
        categories: ['code-quality', 'security'],
        severity: 'high',
        maxFiles: 50,
      });
      expect(result.path).toBe('/project');
      expect(result.languages).toEqual(['typescript', 'javascript']);
      expect(result.categories).toEqual(['code-quality', 'security']);
      expect(result.severity).toBe('high');
      expect(result.maxFiles).toBe(50);
    });

    it('returns optional fields as undefined when absent', () => {
      const result = parseAnalyzeProjectInput({ path: '/project' });
      expect(result.languages).toBeUndefined();
      expect(result.categories).toBeUndefined();
      expect(result.severity).toBeUndefined();
      expect(result.maxFiles).toBeUndefined();
    });

    it('throws McpError when path is missing', () => {
      expect(() => parseAnalyzeProjectInput({})).toThrow(McpError);
    });

    it('throws McpError for invalid severity', () => {
      expect(() =>
        parseAnalyzeProjectInput({ path: '/p', severity: 'extreme' }),
      ).toThrow(McpError);
    });

    it('throws McpError for invalid language in array', () => {
      expect(() =>
        parseAnalyzeProjectInput({ path: '/p', languages: ['cobol'] }),
      ).toThrow(McpError);
    });

    it('throws McpError for invalid category in array', () => {
      expect(() =>
        parseAnalyzeProjectInput({ path: '/p', categories: ['invalid-cat'] }),
      ).toThrow(McpError);
    });

    it('throws McpError when languages is not an array', () => {
      expect(() =>
        parseAnalyzeProjectInput({ path: '/p', languages: 'typescript' }),
      ).toThrow(McpError);
    });

    // TEC-73 / #240: MCP Inspector's auto-form defaults array fields to []. Treat
    // [] as "no filter" so the three call shapes below are observably identical.
    it('coerces empty languages/categories arrays to undefined', () => {
      const omitted = parseAnalyzeProjectInput({ path: '/p' });
      const explicitUndef = parseAnalyzeProjectInput({
        path: '/p',
        languages: undefined,
        categories: undefined,
      });
      const empty = parseAnalyzeProjectInput({
        path: '/p',
        languages: [],
        categories: [],
      });

      expect(omitted.languages).toBeUndefined();
      expect(omitted.categories).toBeUndefined();
      expect(explicitUndef.languages).toBeUndefined();
      expect(explicitUndef.categories).toBeUndefined();
      expect(empty.languages).toBeUndefined();
      expect(empty.categories).toBeUndefined();
    });
  });

  // ---- parseAnalyzeFileInput ----
  describe('parseAnalyzeFileInput', () => {
    it('returns typed object for valid input', () => {
      expect(parseAnalyzeFileInput({ path: '/file.ts' })).toEqual({ path: '/file.ts' });
    });

    it('throws McpError when path is missing', () => {
      expect(() => parseAnalyzeFileInput({})).toThrow(McpError);
    });
  });

  // ---- parseGetDebtSummaryInput ----
  describe('parseGetDebtSummaryInput', () => {
    it('returns typed object for valid input', () => {
      expect(parseGetDebtSummaryInput({ path: '/project' })).toEqual({ path: '/project' });
    });

    it('throws McpError when path is missing', () => {
      expect(() => parseGetDebtSummaryInput({})).toThrow(McpError);
    });
  });

  // ---- parseGetSqaleMetricsInput ----
  describe('parseGetSqaleMetricsInput', () => {
    it('returns typed object with developmentTime', () => {
      const result = parseGetSqaleMetricsInput({ path: '/p', developmentTime: 100 });
      expect(result.path).toBe('/p');
      expect(result.developmentTime).toBe(100);
    });

    it('returns undefined developmentTime when absent', () => {
      expect(parseGetSqaleMetricsInput({ path: '/p' }).developmentTime).toBeUndefined();
    });

    it('throws McpError when developmentTime is not a number', () => {
      expect(() =>
        parseGetSqaleMetricsInput({ path: '/p', developmentTime: 'lots' }),
      ).toThrow(McpError);
    });
  });

  // ---- parseGetRecommendationsInput ----
  describe('parseGetRecommendationsInput', () => {
    it('returns typed object with limit', () => {
      const result = parseGetRecommendationsInput({ path: '/p', limit: 10 });
      expect(result.limit).toBe(10);
    });

    it('returns undefined limit when absent', () => {
      expect(parseGetRecommendationsInput({ path: '/p' }).limit).toBeUndefined();
    });

    it('throws McpError for NaN limit', () => {
      expect(() =>
        parseGetRecommendationsInput({ path: '/p', limit: NaN }),
      ).toThrow(McpError);
    });

    it('throws McpError for Infinity limit', () => {
      expect(() =>
        parseGetRecommendationsInput({ path: '/p', limit: Infinity }),
      ).toThrow(McpError);
    });
  });

  // ---- null rejection for optional fields ----
  describe('null rejection for optional fields', () => {
    it('throws McpError when optionalString field is null', () => {
      expect(() => parseExecuteCustomRulesInput({ path: null })).toThrow(McpError);
    });

    it('throws McpError when optionalNumber field is null', () => {
      expect(() => parseGetRecommendationsInput({ path: '/p', limit: null })).toThrow(McpError);
    });

    it('throws McpError when optionalLanguages field is null', () => {
      expect(() => parseAnalyzeProjectInput({ path: '/p', languages: null })).toThrow(McpError);
    });

    it('throws McpError when optionalCategories field is null', () => {
      expect(() => parseAnalyzeProjectInput({ path: '/p', categories: null })).toThrow(McpError);
    });

    it('throws McpError when optionalSeverity field is null', () => {
      expect(() => parseAnalyzeProjectInput({ path: '/p', severity: null })).toThrow(McpError);
    });
  });

  // ---- numeric edge cases (optionalNumber and optionalPositiveInteger) ----
  describe('numeric edge cases (optionalNumber and optionalPositiveInteger)', () => {
    it('throws McpError for NaN developmentTime', () => {
      expect(() =>
        parseGetSqaleMetricsInput({ path: '/p', developmentTime: NaN }),
      ).toThrow(McpError);
    });

    it('throws McpError for Infinity developmentTime', () => {
      expect(() =>
        parseGetSqaleMetricsInput({ path: '/p', developmentTime: Infinity }),
      ).toThrow(McpError);
    });

    it('throws McpError for -Infinity developmentTime', () => {
      expect(() =>
        parseGetSqaleMetricsInput({ path: '/p', developmentTime: -Infinity }),
      ).toThrow(McpError);
    });

    it('throws McpError for limit of 0 (must be >= 1)', () => {
      expect(() =>
        parseGetRecommendationsInput({ path: '/p', limit: 0 }),
      ).toThrow(McpError);
    });

    it('throws McpError for negative limit', () => {
      expect(() =>
        parseGetRecommendationsInput({ path: '/p', limit: -1 }),
      ).toThrow(McpError);
    });

    it('throws McpError for non-integer limit', () => {
      expect(() =>
        parseGetRecommendationsInput({ path: '/p', limit: 2.5 }),
      ).toThrow(McpError);
    });

    it('throws McpError for non-integer maxFiles', () => {
      expect(() =>
        parseAnalyzeProjectInput({ path: '/p', maxFiles: 1.5 }),
      ).toThrow(McpError);
    });

    it('throws McpError for maxFiles of 0', () => {
      expect(() =>
        parseAnalyzeProjectInput({ path: '/p', maxFiles: 0 }),
      ).toThrow(McpError);
    });
  });

  // ---- parseGetIssuesBySeverityInput ----
  describe('parseGetIssuesBySeverityInput', () => {
    it('returns typed object for valid input', () => {
      const result = parseGetIssuesBySeverityInput({ path: '/p', severity: 'critical' });
      expect(result.severity).toBe('critical');
    });

    it('throws McpError for invalid severity', () => {
      expect(() =>
        parseGetIssuesBySeverityInput({ path: '/p', severity: 'urgent' }),
      ).toThrow(McpError);
    });

    it('throws McpError when severity is missing', () => {
      expect(() => parseGetIssuesBySeverityInput({ path: '/p' })).toThrow(McpError);
    });
  });

  // ---- parseGetIssuesByCategoryInput ----
  describe('parseGetIssuesByCategoryInput', () => {
    it('returns typed object for valid input', () => {
      const result = parseGetIssuesByCategoryInput({ path: '/p', category: 'security' });
      expect(result.category).toBe('security');
    });

    it('throws McpError for invalid category', () => {
      expect(() =>
        parseGetIssuesByCategoryInput({ path: '/p', category: 'garbage' }),
      ).toThrow(McpError);
    });

    it('throws McpError when category is missing', () => {
      expect(() => parseGetIssuesByCategoryInput({ path: '/p' })).toThrow(McpError);
    });
  });

  // ---- parseAddCustomRuleInput ----
  describe('parseAddCustomRuleInput', () => {
    const valid = {
      id: 'my-rule',
      pattern: 'TODO',
      message: 'No TODOs',
      severity: 'low',
      category: 'code-quality',
    };

    it('returns typed object for valid minimal input', () => {
      const result = parseAddCustomRuleInput(valid);
      expect(result.id).toBe('my-rule');
      expect(result.severity).toBe('low');
      expect(result.category).toBe('code-quality');
      expect(result.suggestion).toBeUndefined();
      expect(result.languages).toBeUndefined();
      expect(result.flags).toBeUndefined();
    });

    it('returns typed object for valid full input', () => {
      const result = parseAddCustomRuleInput({
        ...valid,
        suggestion: 'fix it',
        languages: ['typescript'],
        flags: 'gi',
      });
      expect(result.suggestion).toBe('fix it');
      expect(result.languages).toEqual(['typescript']);
      expect(result.flags).toBe('gi');
    });

    // TEC-73: empty languages array collapses to undefined ("applies to all languages")
    // rather than "applies to none" — pinned to prevent regression of the shared coercion.
    it('coerces empty languages array to undefined', () => {
      const result = parseAddCustomRuleInput({ ...valid, languages: [] });
      expect(result.languages).toBeUndefined();
    });

    it('throws McpError when id is missing', () => {
      const { id: _id, ...rest } = valid;
      expect(() => parseAddCustomRuleInput(rest)).toThrow(McpError);
    });

    it('throws McpError for invalid severity', () => {
      expect(() =>
        parseAddCustomRuleInput({ ...valid, severity: 'fatal' }),
      ).toThrow(McpError);
    });

    it('throws McpError for invalid category', () => {
      expect(() =>
        parseAddCustomRuleInput({ ...valid, category: 'unknown' }),
      ).toThrow(McpError);
    });
  });

  // ---- parseRemoveCustomRuleInput ----
  describe('parseRemoveCustomRuleInput', () => {
    it('returns typed object for valid input', () => {
      expect(parseRemoveCustomRuleInput({ id: 'rule-1' })).toEqual({ id: 'rule-1' });
    });

    it('throws McpError when id is missing', () => {
      expect(() => parseRemoveCustomRuleInput({})).toThrow(McpError);
    });
  });

  // ---- parseExecuteCustomRulesInput ----
  describe('parseExecuteCustomRulesInput', () => {
    it('returns typed object with path', () => {
      const result = parseExecuteCustomRulesInput({ path: '/file.ts' });
      expect(result.path).toBe('/file.ts');
      expect(result.code).toBeUndefined();
    });

    it('returns typed object with code', () => {
      const result = parseExecuteCustomRulesInput({ code: 'const x = 1;', language: 'typescript' });
      expect(result.code).toBe('const x = 1;');
      expect(result.language).toBe('typescript');
    });

    it('returns all undefined when nothing provided', () => {
      const result = parseExecuteCustomRulesInput({});
      expect(result.path).toBeUndefined();
      expect(result.code).toBeUndefined();
      expect(result.language).toBeUndefined();
    });

    it('throws McpError when code is not a string', () => {
      expect(() => parseExecuteCustomRulesInput({ code: 123 })).toThrow(McpError);
    });

    it('throws McpError for unrecognized language value', () => {
      expect(() =>
        parseExecuteCustomRulesInput({ language: 'klingon' }),
      ).toThrow(McpError);
    });

    it('throws McpError when code exceeds MAX_CODE_LENGTH characters', () => {
      expect(() =>
        parseExecuteCustomRulesInput({ code: 'a'.repeat(MAX_CODE_LENGTH + 1) }),
      ).toThrow(McpError);
    });

    it('accepts code exactly at the MAX_CODE_LENGTH limit', () => {
      const result = parseExecuteCustomRulesInput({ code: 'a'.repeat(MAX_CODE_LENGTH) });
      expect(result.code).toHaveLength(MAX_CODE_LENGTH);
    });
  });

  // ---- parseValidateCustomPatternInput ----
  describe('parseValidateCustomPatternInput', () => {
    const valid = {
      id: 'p1',
      pattern: 'TODO',
      message: 'No TODOs',
      severity: 'medium',
      category: 'code-quality',
    };

    it('returns typed object for valid input', () => {
      const result = parseValidateCustomPatternInput(valid);
      expect(result.id).toBe('p1');
      expect(result.severity).toBe('medium');
      expect(result.category).toBe('code-quality');
    });

    it('throws McpError when pattern is missing', () => {
      const { pattern: _p, ...rest } = valid;
      expect(() => parseValidateCustomPatternInput(rest)).toThrow(McpError);
    });

    it('throws McpError for invalid severity', () => {
      expect(() =>
        parseValidateCustomPatternInput({ ...valid, severity: 'bad' }),
      ).toThrow(McpError);
    });
  });

  // ---- path validation (requireAbsolutePath / optionalAbsolutePath) ----
  describe('path validation', () => {
    it('throws McpError when path is relative in parseAnalyzeProjectInput', () => {
      expect(() =>
        parseAnalyzeProjectInput({ path: 'relative/path' }),
      ).toThrow(McpError);
    });

    it('throws McpError when path is relative in parseAnalyzeFileInput', () => {
      expect(() =>
        parseAnalyzeFileInput({ path: './file.ts' }),
      ).toThrow(McpError);
    });

    it('throws McpError when path is relative in parseGetDebtSummaryInput', () => {
      expect(() =>
        parseGetDebtSummaryInput({ path: '../etc/passwd' }),
      ).toThrow(McpError);
    });

    it('throws McpError when path is relative in parseGetSqaleMetricsInput', () => {
      expect(() =>
        parseGetSqaleMetricsInput({ path: 'some/dir' }),
      ).toThrow(McpError);
    });

    it('throws McpError when path is relative in parseGetRecommendationsInput', () => {
      expect(() =>
        parseGetRecommendationsInput({ path: 'dir' }),
      ).toThrow(McpError);
    });

    it('throws McpError when path is relative in parseGetIssuesBySeverityInput', () => {
      expect(() =>
        parseGetIssuesBySeverityInput({ path: 'dir', severity: 'high' }),
      ).toThrow(McpError);
    });

    it('throws McpError when path is relative in parseGetIssuesByCategoryInput', () => {
      expect(() =>
        parseGetIssuesByCategoryInput({ path: 'dir', category: 'security' }),
      ).toThrow(McpError);
    });

    it('normalizes path with .. sequences', () => {
      const raw = '/foo/../bar/baz.ts';
      const result = parseAnalyzeFileInput({ path: raw });
      expect(result.path).toBe(path.resolve(raw));
    });

    it('returns absolute path unchanged when already clean', () => {
      const raw = '/foo/bar/baz.ts';
      const result = parseAnalyzeFileInput({ path: raw });
      expect(result.path).toBe(path.resolve(raw));
    });

    it('throws McpError for relative path in optional path field (parseExecuteCustomRulesInput)', () => {
      expect(() =>
        parseExecuteCustomRulesInput({ path: 'relative/path' }),
      ).toThrow(McpError);
    });

    it('accepts undefined for optional path field', () => {
      const result = parseExecuteCustomRulesInput({ code: 'const x = 1;', language: 'typescript' });
      expect(result.path).toBeUndefined();
    });

    it('accepts and normalizes absolute path in optional path field', () => {
      const raw = '/foo/../bar/file.ts';
      const result = parseExecuteCustomRulesInput({ path: raw });
      expect(result.path).toBe(path.resolve(raw));
    });

    it('returns undefined for empty string in optional path field', () => {
      const result = parseExecuteCustomRulesInput({ path: '' });
      expect(result.path).toBeUndefined();
    });

    it('treats empty string path identically to omitting the field', () => {
      const withEmpty = parseExecuteCustomRulesInput({ path: '', code: 'const x = 1;' });
      const withAbsent = parseExecuteCustomRulesInput({ code: 'const x = 1;' });
      expect(withEmpty.path).toBe(withAbsent.path);
    });

    it('error message mentions "must be an absolute path"', () => {
      expect(() =>
        parseAnalyzeProjectInput({ path: 'relative' }),
      ).toThrow(/must be an absolute path/);
    });
  });

  // ---- requireSeverity / requireCategory error message distinction ----
  describe('requireSeverity missing vs invalid message', () => {
    it('reports "Missing or invalid parameter" when severity is absent', () => {
      expect(() => parseGetIssuesBySeverityInput({ path: '/p' })).toThrow(
        /Missing or invalid parameter/,
      );
    });

    it('reports "Missing or invalid parameter" when severity is null', () => {
      expect(() =>
        parseGetIssuesBySeverityInput({ path: '/p', severity: null }),
      ).toThrow(/Missing or invalid parameter/);
    });

    it('reports "Invalid severity" when severity is a non-enum string', () => {
      expect(() =>
        parseGetIssuesBySeverityInput({ path: '/p', severity: 'urgent' }),
      ).toThrow(/Invalid severity/);
    });
  });

  describe('requireCategory missing vs invalid message', () => {
    it('reports "Missing or invalid parameter" when category is absent', () => {
      expect(() => parseGetIssuesByCategoryInput({ path: '/p' })).toThrow(
        /Missing or invalid parameter/,
      );
    });

    it('reports "Missing or invalid parameter" when category is null', () => {
      expect(() =>
        parseGetIssuesByCategoryInput({ path: '/p', category: null }),
      ).toThrow(/Missing or invalid parameter/);
    });

    it('reports "Invalid category" when category is a non-enum string', () => {
      expect(() =>
        parseGetIssuesByCategoryInput({ path: '/p', category: 'garbage' }),
      ).toThrow(/Invalid category/);
    });
  });
});
