import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';
import {
  SupportedLanguage,
  DebtCategory,
  Severity,
} from '../types/index.js';
import { LANGUAGE_CONFIGS } from '../config/languages.js';
import { requireRecord } from './argValidation.js';

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
  language?: string;
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
 * Optionally narrow an array of strings to SupportedLanguage[].
 * Returns undefined if the field is absent; throws McpError for null or invalid entries.
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
 * Returns undefined if the field is absent; throws McpError for null or invalid entries.
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
    path: requireString(a, 'path'),
    languages: optionalLanguages(a, 'languages'),
    categories: optionalCategories(a, 'categories'),
    severity: optionalSeverity(a, 'severity'),
    maxFiles: optionalNumber(a, 'maxFiles'),
  };
}

/**
 * Parse and validate typed input for the analyze_file tool.
 */
export function parseAnalyzeFileInput(
  args: unknown,
): AnalyzeFileInput {
  const a = requireRecord(args);
  return { path: requireString(a, 'path') };
}

/**
 * Parse and validate typed input for the get_debt_summary tool.
 */
export function parseGetDebtSummaryInput(
  args: unknown,
): GetDebtSummaryInput {
  const a = requireRecord(args);
  return { path: requireString(a, 'path') };
}

/**
 * Parse and validate typed input for the get_sqale_metrics tool.
 */
export function parseGetSqaleMetricsInput(
  args: unknown,
): GetSqaleMetricsInput {
  const a = requireRecord(args);
  return {
    path: requireString(a, 'path'),
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
    path: requireString(a, 'path'),
    limit: optionalNumber(a, 'limit'),
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
    path: requireString(a, 'path'),
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
    path: requireString(a, 'path'),
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
  return {
    path: optionalString(a, 'path'),
    code: optionalString(a, 'code'),
    language: optionalString(a, 'language'),
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
