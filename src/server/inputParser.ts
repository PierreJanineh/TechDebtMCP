import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';
import {
  SupportedLanguage,
  DebtCategory,
  Severity,
} from '../types/index.js';

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
const VALID_LANGUAGES: SupportedLanguage[] = [
  'javascript',
  'typescript',
  'python',
  'java',
  'swift',
  'kotlin',
  'objectivec',
  'cpp',
  'c',
  'csharp',
  'go',
  'rust',
  'ruby',
  'php',
];

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
 * Narrow a raw value to Severity, throwing McpError if invalid.
 */
function requireSeverity(args: Record<string, unknown>, key: string): Severity {
  const value = args[key];
  if (!VALID_SEVERITIES.includes(value as Severity)) {
    throw new McpError(
      ErrorCode.InvalidParams,
      `Invalid ${key}: must be one of ${VALID_SEVERITIES.join(', ')}`,
    );
  }
  return value as Severity;
}

/**
 * Narrow a raw value to DebtCategory, throwing McpError if invalid.
 */
function requireCategory(args: Record<string, unknown>, key: string): DebtCategory {
  const value = args[key];
  if (!VALID_CATEGORIES.includes(value as DebtCategory)) {
    throw new McpError(
      ErrorCode.InvalidParams,
      `Invalid ${key}: must be one of ${VALID_CATEGORIES.join(', ')}`,
    );
  }
  return value as DebtCategory;
}

/**
 * Optionally narrow an array of strings to SupportedLanguage[].
 * Returns undefined if the field is absent; throws McpError for invalid entries.
 */
function optionalLanguages(
  args: Record<string, unknown>,
  key: string,
): SupportedLanguage[] | undefined {
  const value = args[key];
  if (value === undefined || value === null) return undefined;
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
 */
function optionalCategories(
  args: Record<string, unknown>,
  key: string,
): DebtCategory[] | undefined {
  const value = args[key];
  if (value === undefined || value === null) return undefined;
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

/** Optional Severity field — returns undefined if absent. */
function optionalSeverity(
  args: Record<string, unknown>,
  key: string,
): Severity | undefined {
  const value = args[key];
  if (value === undefined || value === null) return undefined;
  if (!VALID_SEVERITIES.includes(value as Severity)) {
    throw new McpError(
      ErrorCode.InvalidParams,
      `Invalid ${key}: must be one of ${VALID_SEVERITIES.join(', ')}`,
    );
  }
  return value as Severity;
}

/** Optional number field — returns undefined if absent. */
function optionalNumber(
  args: Record<string, unknown>,
  key: string,
): number | undefined {
  const value = args[key];
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'number') {
    throw new McpError(ErrorCode.InvalidParams, `${key} must be a number`);
  }
  return value;
}

/** Optional string field — returns undefined if absent. */
function optionalString(
  args: Record<string, unknown>,
  key: string,
): string | undefined {
  const value = args[key];
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'string') {
    throw new McpError(ErrorCode.InvalidParams, `${key} must be a string`);
  }
  return value;
}

/**
 * Parse and validate typed input for the analyze_project tool.
 */
export function parseAnalyzeProjectInput(
  args: Record<string, unknown>,
): AnalyzeProjectInput {
  return {
    path: requireString(args, 'path'),
    languages: optionalLanguages(args, 'languages'),
    categories: optionalCategories(args, 'categories'),
    severity: optionalSeverity(args, 'severity'),
    maxFiles: optionalNumber(args, 'maxFiles'),
  };
}

/**
 * Parse and validate typed input for the analyze_file tool.
 */
export function parseAnalyzeFileInput(
  args: Record<string, unknown>,
): AnalyzeFileInput {
  return { path: requireString(args, 'path') };
}

/**
 * Parse and validate typed input for the get_debt_summary tool.
 */
export function parseGetDebtSummaryInput(
  args: Record<string, unknown>,
): GetDebtSummaryInput {
  return { path: requireString(args, 'path') };
}

/**
 * Parse and validate typed input for the get_sqale_metrics tool.
 */
export function parseGetSqaleMetricsInput(
  args: Record<string, unknown>,
): GetSqaleMetricsInput {
  return {
    path: requireString(args, 'path'),
    developmentTime: optionalNumber(args, 'developmentTime'),
  };
}

/**
 * Parse and validate typed input for the get_recommendations tool.
 */
export function parseGetRecommendationsInput(
  args: Record<string, unknown>,
): GetRecommendationsInput {
  return {
    path: requireString(args, 'path'),
    limit: optionalNumber(args, 'limit'),
  };
}

/**
 * Parse and validate typed input for the get_issues_by_severity tool.
 */
export function parseGetIssuesBySeverityInput(
  args: Record<string, unknown>,
): GetIssuesBySeverityInput {
  return {
    path: requireString(args, 'path'),
    severity: requireSeverity(args, 'severity'),
  };
}

/**
 * Parse and validate typed input for the get_issues_by_category tool.
 */
export function parseGetIssuesByCategoryInput(
  args: Record<string, unknown>,
): GetIssuesByCategoryInput {
  return {
    path: requireString(args, 'path'),
    category: requireCategory(args, 'category'),
  };
}

/**
 * Parse and validate typed input for the add_custom_rule tool.
 */
export function parseAddCustomRuleInput(
  args: Record<string, unknown>,
): AddCustomRuleInput {
  return {
    id: requireString(args, 'id'),
    pattern: requireString(args, 'pattern'),
    message: requireString(args, 'message'),
    severity: requireSeverity(args, 'severity'),
    category: requireCategory(args, 'category'),
    suggestion: optionalString(args, 'suggestion'),
    languages: optionalLanguages(args, 'languages'),
    flags: optionalString(args, 'flags'),
  };
}

/**
 * Parse and validate typed input for the remove_custom_rule tool.
 */
export function parseRemoveCustomRuleInput(
  args: Record<string, unknown>,
): RemoveCustomRuleInput {
  return { id: requireString(args, 'id') };
}

/**
 * Parse and validate typed input for the execute_custom_rules tool.
 */
export function parseExecuteCustomRulesInput(
  args: Record<string, unknown>,
): ExecuteCustomRulesInput {
  return {
    path: optionalString(args, 'path'),
    code: optionalString(args, 'code'),
    language: optionalString(args, 'language'),
  };
}

/**
 * Parse and validate typed input for the validate_custom_pattern tool.
 */
export function parseValidateCustomPatternInput(
  args: Record<string, unknown>,
): ValidateCustomPatternInput {
  return {
    id: requireString(args, 'id'),
    pattern: requireString(args, 'pattern'),
    message: requireString(args, 'message'),
    severity: requireSeverity(args, 'severity'),
    category: requireCategory(args, 'category'),
  };
}
