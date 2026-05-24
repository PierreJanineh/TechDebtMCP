import { resolve, isAbsolute } from 'node:path';
import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';
import {
  SupportedLanguage,
  DebtCategory,
  Severity,
} from '../types/index.js';
import { LANGUAGE_CONFIGS } from '../config/languages.js';
import { requireRecord } from './argValidation.js';
import { MAX_CODE_LENGTH } from '../core/customRulesEngine.js';

/** Typed input for analyze_project tool */
export interface AnalyzeProjectInput {
  path: string;
  languages?: SupportedLanguage[];
  categories?: DebtCategory[];
  severity?: Severity;
  maxFiles?: number;
}

/** Typed input for analyze_file tool */
export interface AnalyzeFileInput {
  path: string;
}

/** Typed input for get_debt_summary tool */
export interface GetDebtSummaryInput {
  path: string;
}

/** Typed input for get_sqale_metrics tool */
export interface GetSqaleMetricsInput {
  path: string;
  developmentTime?: number;
}

/** Typed input for get_recommendations tool */
export interface GetRecommendationsInput {
  path: string;
  limit?: number;
}

/** Typed input for get_issues_by_severity tool */
export interface GetIssuesBySeverityInput {
  path: string;
  severity: Severity;
}

/** Typed input for get_issues_by_category tool */
export interface GetIssuesByCategoryInput {
  path: string;
  category: DebtCategory;
}

/** Typed input for add_custom_rule tool */
export interface AddCustomRuleInput {
  id: string;
  pattern: string;
  message: string;
  severity: Severity;
  category: DebtCategory;
  suggestion?: string;
  languages?: SupportedLanguage[];
  flags?: string;
}

/** Typed input for remove_custom_rule tool */
export interface RemoveCustomRuleInput {
  id: string;
}

/** Typed input for execute_custom_rules tool */
export interface ExecuteCustomRulesInput {
  path?: string;
  code?: string;
  language?: SupportedLanguage;
}

/** Typed input for validate_custom_pattern tool */
export interface ValidateCustomPatternInput {
  id: string;
  pattern: string;
  message: string;
  severity: Severity;
  category: DebtCategory;
}

const VALID_SEVERITIES: Severity[] = ['low', 'medium', 'high', 'critical'];
const VALID_CATEGORIES: DebtCategory[] = [
  'dependency',
  'code-quality',
  'architecture',
  'documentation',
  'testing',
  'security',
  'performance',
  'maintainability',
];
/** Derived from LANGUAGE_CONFIGS keys to stay in sync with supported languages. */
const VALID_LANGUAGES: SupportedLanguage[] = Object.keys(LANGUAGE_CONFIGS) as SupportedLanguage[];

/**
 * Assert that a value is a non-empty string, throwing McpError if not.
 */
function requireString(args: Record<string, unknown>, key: string): string {
  const value = args[key];
  if (typeof value !== 'string' || value.length === 0) {
    throw new McpError(ErrorCode.InvalidParams, `Missing or invalid parameter: ${key}`);
  }
  return value;
}

/**
 * Assert that a value is a non-empty absolute path string, throwing McpError if not.
 * Normalizes the path with resolve() to collapse any `..` sequences.
 */
export function requireAbsolutePath(args: Record<string, unknown>, key: string): string {
  const value = requireString(args, key);
  if (!isAbsolute(value)) {
    throw new McpError(ErrorCode.InvalidParams, `${key} must be an absolute path`);
  }
  return resolve(value);
}

/**
 * Optionally validate and normalize a path string.
 * Returns undefined if absent or empty string; throws McpError if present but not an absolute path.
 */
function optionalAbsolutePath(
  args: Record<string, unknown>,
  key: string,
): string | undefined {
  const value = args[key];
  if (value === undefined || value === '') return undefined;
  if (typeof value !== 'string') {
    throw new McpError(ErrorCode.InvalidParams, `${key} must be a string`);
  }
  if (!isAbsolute(value)) {
    throw new McpError(ErrorCode.InvalidParams, `${key} must be an absolute path`);
  }
  return resolve(value);
}

/**
 * Narrow a raw value to Severity, throwing McpError if invalid or missing.
 */
function requireSeverity(args: Record<string, unknown>, key: string): Severity {
  const raw = args[key];
  if (typeof raw !== 'string' || raw.length === 0) {
    throw new McpError(
      ErrorCode.InvalidParams,
      `Missing or invalid parameter: ${key}`,
    );
  }
  const value = raw as Severity;
  if (!VALID_SEVERITIES.includes(value)) {
    throw new McpError(
      ErrorCode.InvalidParams,
      `Invalid ${key}: must be one of ${VALID_SEVERITIES.join(', ')}`,
    );
  }
  return value;
}

/**
 * Narrow a raw value to DebtCategory, throwing McpError if invalid or missing.
 */
function requireCategory(args: Record<string, unknown>, key: string): DebtCategory {
  const raw = args[key];
  if (typeof raw !== 'string' || raw.length === 0) {
    throw new McpError(
      ErrorCode.InvalidParams,
      `Missing or invalid parameter: ${key}`,
    );
  }
  const value = raw as DebtCategory;
  if (!VALID_CATEGORIES.includes(value)) {
    throw new McpError(
      ErrorCode.InvalidParams,
      `Invalid ${key}: must be one of ${VALID_CATEGORIES.join(', ')}`,
    );
  }
  return value;
}

/**
 * Optionally narrow a string to SupportedLanguage.
 * Returns undefined if the field is absent; throws McpError for unrecognized values.
 */
function optionalLanguage(
  args: Record<string, unknown>,
  key: string,
): SupportedLanguage | undefined {
  const value = optionalString(args, key);
  if (value === undefined) return undefined;
  if (!VALID_LANGUAGES.includes(value as SupportedLanguage)) {
    throw new McpError(
      ErrorCode.InvalidParams,
      `Invalid language '${value}': must be one of ${VALID_LANGUAGES.join(', ')}`,
    );
  }
  return value as SupportedLanguage;
}

/**
 * Optionally narrow an array of strings to SupportedLanguage[].
 * Returns undefined if the field is absent or an empty array; throws McpError for
 * non-array values or invalid entries.
 *
 * Empty arrays collapse to `undefined` because MCP Inspector's auto-generated forms
 * default array fields to `[]`. Treating `[]` as "no filter" matches user intent and
 * keeps the engine contract literal — callers who pass `[]` get the same result as
 * omitting the field. See TEC-73 / #240.
 *
 * Also consumed by `parseAddCustomRuleInput`, where `[]` → `undefined` means the
 * stored custom rule "applies to all languages" rather than "applies to none" — the
 * desired semantics, since a no-language rule would be a configuration footgun.
 */
function optionalLanguages(
  args: Record<string, unknown>,
  key: string,
): SupportedLanguage[] | undefined {
  const value = args[key];
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) {
    throw new McpError(ErrorCode.InvalidParams, `${key} must be an array`);
  }
  if (value.length === 0) return undefined;
  for (const lang of value) {
    if (!VALID_LANGUAGES.includes(lang as SupportedLanguage)) {
      throw new McpError(
        ErrorCode.InvalidParams,
        `Invalid language '${lang}': must be one of ${VALID_LANGUAGES.join(', ')}`,
      );
    }
  }
  return value as SupportedLanguage[];
}

/**
 * Optionally narrow an array of strings to DebtCategory[].
 * Returns undefined if the field is absent or an empty array; throws McpError for
 * non-array values or invalid entries. See `optionalLanguages` for the `[]` rationale.
 */
function optionalCategories(
  args: Record<string, unknown>,
  key: string,
): DebtCategory[] | undefined {
  const value = args[key];
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) {
    throw new McpError(ErrorCode.InvalidParams, `${key} must be an array`);
  }
  if (value.length === 0) return undefined;
  for (const cat of value) {
    if (!VALID_CATEGORIES.includes(cat as DebtCategory)) {
      throw new McpError(
        ErrorCode.InvalidParams,
        `Invalid category '${cat}': must be one of ${VALID_CATEGORIES.join(', ')}`,
      );
    }
  }
  return value as DebtCategory[];
}

/** Optional Severity field — returns undefined if absent; throws McpError for null. */
function optionalSeverity(
  args: Record<string, unknown>,
  key: string,
): Severity | undefined {
  const value = args[key];
  if (value === undefined) return undefined;
  if (!VALID_SEVERITIES.includes(value as Severity)) {
    throw new McpError(
      ErrorCode.InvalidParams,
      `Invalid ${key}: must be one of ${VALID_SEVERITIES.join(', ')}`,
    );
  }
  return value as Severity;
}

/** Optional number field — returns undefined if absent. Rejects null, NaN, and Infinity. */
function optionalNumber(
  args: Record<string, unknown>,
  key: string,
): number | undefined {
  const value = args[key];
  if (value === undefined) return undefined;
  if (typeof value !== 'number') {
    throw new McpError(ErrorCode.InvalidParams, `${key} must be a number`);
  }
  if (!Number.isFinite(value)) {
    throw new McpError(ErrorCode.InvalidParams, `${key} must be a finite number`);
  }
  return value;
}

/**
 * Optional positive-integer field — returns undefined if absent.
 * Rejects null, NaN, Infinity, non-integers, and values less than 1.
 */
function optionalPositiveInteger(
  args: Record<string, unknown>,
  key: string,
): number | undefined {
  const value = args[key];
  if (value === undefined) return undefined;
  if (typeof value !== 'number') {
    throw new McpError(ErrorCode.InvalidParams, `${key} must be an integer (>= 1)`);
  }
  if (!Number.isFinite(value)) {
    throw new McpError(
      ErrorCode.InvalidParams,
      `${key} must be a finite number (NaN and Infinity are not allowed)`,
    );
  }
  if (!Number.isInteger(value) || value < 1) {
    throw new McpError(
      ErrorCode.InvalidParams,
      `${key} must be a finite positive integer (minimum value: 1)`,
    );
  }
  return value;
}

/** Optional string field — returns undefined if absent; throws McpError for null. */
function optionalString(
  args: Record<string, unknown>,
  key: string,
): string | undefined {
  const value = args[key];
  if (value === undefined) return undefined;
  if (typeof value !== 'string') {
    throw new McpError(ErrorCode.InvalidParams, `${key} must be a string`);
  }
  return value;
}

/**
 * Parse and validate typed input for the analyze_project tool.
 */
export function parseAnalyzeProjectInput(
  args: unknown,
): AnalyzeProjectInput {
  const a = requireRecord(args);
  return {
    path: requireAbsolutePath(a, 'path'),
    languages: optionalLanguages(a, 'languages'),
    categories: optionalCategories(a, 'categories'),
    severity: optionalSeverity(a, 'severity'),
    maxFiles: optionalPositiveInteger(a, 'maxFiles'),
  };
}

/**
 * Parse and validate typed input for the analyze_file tool.
 */
export function parseAnalyzeFileInput(
  args: unknown,
): AnalyzeFileInput {
  const a = requireRecord(args);
  return { path: requireAbsolutePath(a, 'path') };
}

/**
 * Parse and validate typed input for the get_debt_summary tool.
 */
export function parseGetDebtSummaryInput(
  args: unknown,
): GetDebtSummaryInput {
  const a = requireRecord(args);
  return { path: requireAbsolutePath(a, 'path') };
}

/**
 * Parse and validate typed input for the get_sqale_metrics tool.
 */
export function parseGetSqaleMetricsInput(
  args: unknown,
): GetSqaleMetricsInput {
  const a = requireRecord(args);
  return {
    path: requireAbsolutePath(a, 'path'),
    developmentTime: optionalNumber(a, 'developmentTime'),
  };
}

/**
 * Parse and validate typed input for the get_recommendations tool.
 */
export function parseGetRecommendationsInput(
  args: unknown,
): GetRecommendationsInput {
  const a = requireRecord(args);
  return {
    path: requireAbsolutePath(a, 'path'),
    limit: optionalPositiveInteger(a, 'limit'),
  };
}

/**
 * Parse and validate typed input for the get_issues_by_severity tool.
 */
export function parseGetIssuesBySeverityInput(
  args: unknown,
): GetIssuesBySeverityInput {
  const a = requireRecord(args);
  return {
    path: requireAbsolutePath(a, 'path'),
    severity: requireSeverity(a, 'severity'),
  };
}

/**
 * Parse and validate typed input for the get_issues_by_category tool.
 */
export function parseGetIssuesByCategoryInput(
  args: unknown,
): GetIssuesByCategoryInput {
  const a = requireRecord(args);
  return {
    path: requireAbsolutePath(a, 'path'),
    category: requireCategory(a, 'category'),
  };
}

/**
 * Parse and validate typed input for the add_custom_rule tool.
 */
export function parseAddCustomRuleInput(
  args: unknown,
): AddCustomRuleInput {
  const a = requireRecord(args);
  return {
    id: requireString(a, 'id'),
    pattern: requireString(a, 'pattern'),
    message: requireString(a, 'message'),
    severity: requireSeverity(a, 'severity'),
    category: requireCategory(a, 'category'),
    suggestion: optionalString(a, 'suggestion'),
    languages: optionalLanguages(a, 'languages'),
    flags: optionalString(a, 'flags'),
  };
}

/**
 * Parse and validate typed input for the remove_custom_rule tool.
 */
export function parseRemoveCustomRuleInput(
  args: unknown,
): RemoveCustomRuleInput {
  const a = requireRecord(args);
  return { id: requireString(a, 'id') };
}

/**
 * Parse and validate typed input for the execute_custom_rules tool.
 */
export function parseExecuteCustomRulesInput(
  args: unknown,
): ExecuteCustomRulesInput {
  const a = requireRecord(args);
  const code = optionalString(a, 'code');
  if (code !== undefined && code.length === 0) {
    throw new McpError(
      ErrorCode.InvalidParams,
      'Inline code must not be empty',
    );
  }
  if (code !== undefined && code.length > MAX_CODE_LENGTH) {
    throw new McpError(
      ErrorCode.InvalidParams,
      `Inline code exceeds maximum length of ${MAX_CODE_LENGTH} characters`,
    );
  }
  return {
    path: optionalAbsolutePath(a, 'path'),
    code,
    language: optionalLanguage(a, 'language'),
  };
}

/**
 * Parse and validate typed input for the validate_custom_pattern tool.
 */
export function parseValidateCustomPatternInput(
  args: unknown,
): ValidateCustomPatternInput {
  const a = requireRecord(args);
  return {
    id: requireString(a, 'id'),
    pattern: requireString(a, 'pattern'),
    message: requireString(a, 'message'),
    severity: requireSeverity(a, 'severity'),
    category: requireCategory(a, 'category'),
  };
}
