/**
 * Custom rules management handlers (add, remove, list, execute, validate pattern)
 */

import { basename } from 'node:path';
import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';
import { CustomRulesEngine, MAX_FILE_SIZE_BYTES } from '../core/customRulesEngine.js';
import { readFile, getFileStats } from '../utils/fileUtils.js';
import { CustomPattern } from '../types/index.js';
import {
  parseAddCustomRuleInput,
  parseRemoveCustomRuleInput,
  parseExecuteCustomRulesInput,
  parseValidateCustomPatternInput,
} from './inputParser.js';

/** MCP tool response shape */
type ToolResponse = { content: Array<{ type: string; text: string }> };

/**
 * Handle add_custom_rule tool call.
 */
export async function handleAddCustomRule(
  customRulesEngine: CustomRulesEngine,
  args: unknown,
): Promise<ToolResponse> {
  const input = parseAddCustomRuleInput(args);

  const customPattern: CustomPattern = {
    id: input.id,
    pattern: input.pattern,
    message: input.message,
    severity: input.severity,
    category: input.category,
    suggestion: input.suggestion,
    languages: input.languages,
    flags: input.flags,
  };

  const validation = CustomRulesEngine.validatePattern(customPattern);
  if (!validation.valid) {
    const errors = validation.errors.map(e => `- ${e}`).join('\n');
    return {
      content: [{ type: 'text', text: `❌ Pattern validation failed:\n${errors}` }],
    };
  }

  customRulesEngine.addRule(customPattern);
  return {
    content: [{
      type: 'text',
      text:
        `✅ Custom rule '${input.id}' added successfully.\n\n` +
        `Rule: ${input.pattern}\nSeverity: ${input.severity}\nCategory: ${input.category}`,
    }],
  };
}

/**
 * Handle remove_custom_rule tool call.
 */
export function handleRemoveCustomRule(
  customRulesEngine: CustomRulesEngine,
  args: unknown,
): ToolResponse {
  const { id } = parseRemoveCustomRuleInput(args);
  const removed = customRulesEngine.removeRule(id);
  if (removed) {
    return {
      content: [{ type: 'text', text: `✅ Custom rule '${id}' removed successfully.` }],
    };
  }
  return { content: [{ type: 'text', text: `❌ Custom rule '${id}' not found.` }] };
}

/**
 * Handle list_session_custom_rules tool call. Only session-registered rules
 * (added via add_custom_rule) are surfaced; .techdebtrc.json customPatterns
 * are executed inside analyze_project but not listed here.
 */
export function handleListSessionCustomRules(customRulesEngine: CustomRulesEngine): ToolResponse {
  const rules = customRulesEngine.getAllRules();
  const stats = customRulesEngine.getRuleStats();
  if (rules.length === 0) {
    return {
      content: [{
        type: 'text',
        text:
          'No session custom rules defined. ' +
          'Note: rules declared in .techdebtrc.json under customPatterns are not listed here; ' +
          'they run inside analyze_project.',
      }],
    };
  }

  const rulesText = rules
    .map(
      r =>
        `- **${r.id}**: ${r.message}\n` +
        `  - Pattern: \`${r.pattern}\`\n` +
        `  - Severity: ${r.severity}\n` +
        `  - Category: ${r.category}\n` +
        `  ${r.languages ? `- Languages: ${r.languages.join(', ')}` : '- Languages: All'}`,
    )
    .join('\n');

  const categoryStats = Object.entries(stats.byCategory)
    .filter(([, count]) => count > 0)
    .map(([cat, count]) => `  - ${cat}: ${count}`)
    .join('\n');

  const statsText =
    `\n## Statistics\n\n` +
    `- **Total Rules:** ${stats.totalRules}\n` +
    `- **By Severity:** Low: ${stats.bySeverity.low}, ` +
    `Medium: ${stats.bySeverity.medium}, ` +
    `High: ${stats.bySeverity.high}, ` +
    `Critical: ${stats.bySeverity.critical}\n` +
    `- **By Category:** \n${categoryStats}\n`;

  return { content: [{ type: 'text', text: `# Session Custom Rules\n\n${rulesText}\n${statsText}` }] };
}

/**
 * Handle execute_custom_rules tool call.
 */
export async function handleExecuteCustomRules(
  customRulesEngine: CustomRulesEngine,
  args: unknown,
): Promise<ToolResponse> {
  const input = parseExecuteCustomRulesInput(args);
  const { path, language } = input;
  let { code } = input;

  if (!path && !code) {
    throw new McpError(ErrorCode.InvalidParams, 'Either path or code must be provided');
  }
  if (!code && path) {
    const displayPath = basename(path) || '(root path)';
    const stats = await getFileStats(path);
    if (!stats) {
      throw new McpError(
        ErrorCode.InvalidParams,
        `Path not found or not accessible: ${displayPath}`
      );
    }
    if (!stats.isFile()) {
      throw new McpError(
        ErrorCode.InvalidParams,
        `Path is not a regular file: ${displayPath}`
      );
    }
    if (stats.size > MAX_FILE_SIZE_BYTES) {
      throw new McpError(
        ErrorCode.InvalidParams,
        `File exceeds maximum size of ${MAX_FILE_SIZE_BYTES} bytes for regex matching`
      );
    }
    code = await readFile(path);
  }
  if (!code) {
    throw new McpError(ErrorCode.InvalidParams, 'Could not read code from path or input');
  }

  const filePath = path || 'inline-code';
  const issues = customRulesEngine.executeRules(filePath, code, language);
  if (issues.length === 0) {
    return {
      content: [{ type: 'text', text: `✅ No custom rule violations found in ${filePath}.` }],
    };
  }

  const issueLines = issues
    .map(
      issue =>
        `## ${issue.title} [${issue.severity.toUpperCase()}]\n\n` +
        `**File:** ${issue.file}:${issue.line}\n` +
        `**Rule:** \`${issue.rule}\`\n` +
        `**Category:** ${issue.category}\n` +
        `**Suggestion:** ${issue.suggestion ?? 'N/A'}\n\n` +
        `${'```'}\n${issue.description}\n${'```'}`,
    )
    .join('\n\n---\n\n');

  const formatted =
    `# Custom Rule Violations in ${filePath}\n\n` +
    `Found ${issues.length} issue(s):\n\n` +
    issueLines;

  return { content: [{ type: 'text', text: formatted }] };
}

/**
 * Handle validate_custom_pattern tool call.
 */
export function handleValidateCustomPattern(args: unknown): ToolResponse {
  const input = parseValidateCustomPatternInput(args);
  const customPattern: CustomPattern = {
    id: input.id,
    pattern: input.pattern,
    message: input.message,
    severity: input.severity,
    category: input.category,
  };

  const validation = CustomRulesEngine.validatePattern(customPattern);
  if (validation.valid) {
    return {
      content: [{ type: 'text', text: `✅ Pattern is valid and can be used as a custom rule.` }],
    };
  }
  const errors = validation.errors.map(e => `- ${e}`).join('\n');
  return {
    content: [{ type: 'text', text: `❌ Pattern validation failed:\n${errors}` }],
  };
}
