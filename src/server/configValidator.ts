/**
 * Config validation handler for .techdebtrc.json files
 */

import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';
import { CustomRulesEngine } from '../core/customRulesEngine.js';
import { fileExists } from '../utils/fileUtils.js';
import { readFile as fsReadFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { CustomPattern } from '../types/index.js';

/** Known valid keys for .techdebtrc.json */
const VALID_CONFIG_KEYS = new Set(['ignore', 'include', 'rules', 'severity', 'ruleExclusions', 'customPatterns', 'languageOverrides']);
const VALID_RULE_KEYS = new Set(['maxFileLines', 'maxFunctionLines', 'maxComplexity', 'maxNestingDepth', 'maxParameters', 'minCommentRatio']);
const VALID_SEVERITIES = new Set(['low', 'medium', 'high', 'critical']);

/**
 * Validate a .techdebtrc.json configuration file
 */
export async function handleValidateConfig(args: Record<string, unknown>): Promise<{ content: Array<{ type: string; text: string }> }> {
  const inputPath = args.path as string;
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
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { content: [{ type: 'text', text: `❌ Invalid config in ${configPath}:\n  Top-level value must be a JSON object, got ${parsed === null ? 'null' : Array.isArray(parsed) ? 'array' : typeof parsed}.` }] };
    }
    config = parsed as Record<string, unknown>;
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
    if (config.rules === null || typeof config.rules !== 'object' || Array.isArray(config.rules)) {
      errors.push('"rules" must be an object');
    } else {
      const rules = config.rules as Record<string, unknown>;
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
    if (config.severity === null || typeof config.severity !== 'object' || Array.isArray(config.severity)) {
      errors.push('"severity" must be an object');
    } else {
      const severity = config.severity as Record<string, unknown>;
      for (const [rule, level] of Object.entries(severity)) {
        if (typeof level !== 'string' || !VALID_SEVERITIES.has(level)) {
          errors.push(`"severity.${rule}" has invalid value "${level}" — must be a string: low, medium, high, critical`);
        }
      }
    }
  }

  if ('ruleExclusions' in config) {
    if (config.ruleExclusions === null || typeof config.ruleExclusions !== 'object' || Array.isArray(config.ruleExclusions)) {
      errors.push('"ruleExclusions" must be an object mapping rule names to arrays of glob strings');
    } else {
      const exclusions = config.ruleExclusions as Record<string, unknown>;
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
    if (config.languageOverrides === null || typeof config.languageOverrides !== 'object' || Array.isArray(config.languageOverrides)) {
      errors.push('"languageOverrides" must be an object keyed by language name');
    }
  }

  if ('customPatterns' in config) {
    if (!Array.isArray(config.customPatterns)) {
      errors.push('"customPatterns" must be an array');
    } else {
      (config.customPatterns as unknown[]).forEach((p, i) => {
        if (typeof p !== 'object' || p === null) {
          errors.push(`customPatterns[${i}]: must be an object`);
          return;
        }
        const pattern = p as Record<string, unknown>;
        const result = CustomRulesEngine.validatePattern(pattern as unknown as CustomPattern);
        if (!result.valid) {
          result.errors.forEach(e => errors.push(`customPatterns[${i}] (${pattern.id ?? 'unknown'}): ${e}`));
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
