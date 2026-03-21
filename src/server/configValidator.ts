/**
 * Config validation handler for .techdebtrc.json files
 */

import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';
import { CustomRulesEngine } from '../core/customRulesEngine.js';
import { fileExists } from '../utils/fileUtils.js';
import { readFile as fsReadFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { CustomPattern } from '../types/index.js';

/** Type guard: checks that a value is a plain object record (prototype is Object.prototype or null, not a class instance, Date, Map, etc.). */
function isRecord(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }
  const proto = Object.getPrototypeOf(value as object) as unknown;
  return proto === Object.prototype || proto === null;
}

/**
 * Assert that args is a plain non-null, non-array object, throwing McpError(InvalidParams) if not.
 */
function requireRecord(args: unknown): Record<string, unknown> {
  if (!isRecord(args)) {
    throw new McpError(
      ErrorCode.InvalidParams,
      'Tool arguments must be a plain object',
    );
  }
  return args;
}

/** Type guard: checks that a value satisfies the minimum required shape of a CustomPattern. */
function isCustomPatternShape(value: unknown): value is CustomPattern {
  if (!isRecord(value)) return false;
  return (
    typeof value['id'] === 'string' &&
    typeof value['pattern'] === 'string' &&
    typeof value['severity'] === 'string' &&
    typeof value['category'] === 'string' &&
    typeof value['message'] === 'string'
  );
}

/** Known valid keys for .techdebtrc.json */
const VALID_CONFIG_KEYS = new Set(['ignore', 'include', 'rules', 'severity', 'ruleExclusions', 'customPatterns', 'languageOverrides']);
const VALID_RULE_KEYS = new Set(['maxFileLines', 'maxFunctionLines', 'maxComplexity', 'maxNestingDepth', 'maxParameters', 'minCommentRatio']);
const VALID_SEVERITIES = new Set(['low', 'medium', 'high', 'critical']);

/**
 * Validate a .techdebtrc.json configuration file
 */
export async function handleValidateConfig(args: unknown): Promise<{ content: Array<{ type: string; text: string }> }> {
  const a = requireRecord(args);
  if (typeof a.path !== 'string') {
    throw new McpError(ErrorCode.InvalidParams, 'Missing or invalid required parameter: path (must be a string)');
  }
  const inputPath = a.path;
  if (!(await fileExists(inputPath))) {
    throw new McpError(ErrorCode.InvalidParams, `Path not found: ${inputPath}`);
  }

  const pathStat = await stat(inputPath);
  const configPath = pathStat.isDirectory()
    ? join(inputPath, '.techdebtrc.json')
    : inputPath;

  if (!(await fileExists(configPath))) {
    return { content: [{ type: 'text', text: `⚠️ No .techdebtrc.json found at:\n  ${configPath}\n\nCreate one to customize tech debt analysis for your project.` }] };
  }

  const errors: string[] = [];
  const warnings: string[] = [];
  let config: Record<string, unknown>;

  try {
    const raw = await fsReadFile(configPath, 'utf-8');
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) {
      return { content: [{ type: 'text', text: `❌ Invalid config in ${configPath}:\n  Top-level value must be a JSON object, got ${parsed === null ? 'null' : Array.isArray(parsed) ? 'array' : typeof parsed}.` }] };
    }
    config = parsed;
  } catch (err) {
    return { content: [{ type: 'text', text: `❌ Invalid JSON in ${configPath}:\n  ${err instanceof Error ? err.message : String(err)}` }] };
  }

  for (const key of Object.keys(config)) {
    if (!VALID_CONFIG_KEYS.has(key)) {
      warnings.push(`Unknown top-level key: "${key}"`);
    }
  }

  if ('ignore' in config) {
    if (!Array.isArray(config.ignore)) {
      errors.push('"ignore" must be an array of glob strings');
    } else if (config.ignore.some(v => typeof v !== 'string')) {
      errors.push('"ignore" array must contain only strings');
    }
  }

  if ('include' in config) {
    if (!Array.isArray(config.include)) {
      errors.push('"include" must be an array of glob strings');
    } else if (config.include.some(v => typeof v !== 'string')) {
      errors.push('"include" array must contain only strings');
    }
  }

  if ('rules' in config) {
    if (!isRecord(config.rules)) {
      errors.push('"rules" must be an object');
    } else {
      const rules = config.rules;
      for (const key of Object.keys(rules)) {
        if (!VALID_RULE_KEYS.has(key)) warnings.push(`Unknown rule key: "${key}"`);
      }
      for (const key of VALID_RULE_KEYS) {
        if (key in rules && typeof rules[key] !== 'number') {
          errors.push(`"rules.${key}" must be a number`);
        }
      }
    }
  }

  if ('severity' in config) {
    if (!isRecord(config.severity)) {
      errors.push('"severity" must be an object');
    } else {
      const severity = config.severity;
      for (const [rule, level] of Object.entries(severity)) {
        if (typeof level !== 'string' || !VALID_SEVERITIES.has(level)) {
          errors.push(`"severity.${rule}" has invalid value "${level}" — must be a string: low, medium, high, critical`);
        }
      }
    }
  }

  if ('ruleExclusions' in config) {
    if (!isRecord(config.ruleExclusions)) {
      errors.push('"ruleExclusions" must be an object mapping rule names to arrays of glob strings');
    } else {
      const exclusions = config.ruleExclusions;
      for (const [rule, patterns] of Object.entries(exclusions)) {
        if (!Array.isArray(patterns)) {
          errors.push(`"ruleExclusions.${rule}" must be an array of glob strings`);
        } else if (patterns.some(v => typeof v !== 'string')) {
          errors.push(`"ruleExclusions.${rule}" array must contain only strings`);
        }
      }
    }
  }

  if ('languageOverrides' in config) {
    if (!isRecord(config.languageOverrides)) {
      errors.push('"languageOverrides" must be an object keyed by language name');
    }
  }

  if ('customPatterns' in config) {
    if (!Array.isArray(config.customPatterns)) {
      errors.push('"customPatterns" must be an array');
    } else {
      config.customPatterns.forEach((p: unknown, i: number) => {
        if (!isRecord(p)) {
          errors.push(`customPatterns[${i}]: must be an object`);
          return;
        }
        if (!isCustomPatternShape(p)) {
          errors.push(`customPatterns[${i}]: missing required fields (id, pattern, severity, category, message)`);
          return;
        }
        const result = CustomRulesEngine.validatePattern(p);
        if (!result.valid) {
          result.errors.forEach(e => errors.push(`customPatterns[${i}] (${p.id}): ${e}`));
        }
      });
    }
  }

  if (errors.length === 0 && warnings.length === 0) {
    return { content: [{ type: 'text', text: `✅ ${configPath} is valid.\n\nAll fields pass schema validation.` }] };
  }

  let report = `# Config Validation: ${configPath}\n\n`;
  if (errors.length > 0) {
    report += `## ❌ Errors (${errors.length})\n${errors.map(e => `- ${e}`).join('\n')}\n\n`;
  }
  if (warnings.length > 0) {
    report += `## ⚠️ Warnings (${warnings.length})\n${warnings.map(w => `- ${w}`).join('\n')}\n\n`;
  }
  report += errors.length > 0 ? '**Fix errors before using this config.**' : '**Config is usable — address warnings to avoid surprises.**';

  return { content: [{ type: 'text', text: report }] };
}
