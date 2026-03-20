import {
  TechDebtIssue,
  SupportedLanguage,
  FileAnalysisResult,
  FileMetrics,
  TechDebtConfig,
} from '../types/index.js';
import { getLanguageConfig } from '../config/languages.js';
import { countLines } from '../utils/fileUtils.js';
import { minimatch } from 'minimatch';

/** Regex matching `// techdebt-ignore-next-line [optional-rule]` or `# techdebt-ignore-next-line [optional-rule]` suppression comments. */
const SUPPRESSION_NEXT_LINE = /^\s*(?:\/\/|#)\s*techdebt-ignore-next-line(?:\s+(\S+))?\s*$/;

/** Regex matching `// techdebt-ignore-start [optional-rule]` or `# techdebt-ignore-start [optional-rule]` block-start comments. */
const SUPPRESSION_BLOCK_START = /^\s*(?:\/\/|#)\s*techdebt-ignore-start(?:\s+(\S+))?\s*$/;

/** Regex matching `// techdebt-ignore-end [optional-rule]` or `# techdebt-ignore-end [optional-rule]` block-end comments. */
const SUPPRESSION_BLOCK_END = /^\s*(?:\/\/|#)\s*techdebt-ignore-end(?:\s+(\S+))?\s*$/;

/**
 * Build a set of line indices that fall within `techdebt-ignore-start/end` blocks.
 * Supports rule-specific blocks: only lines for the matching rule are suppressed.
 * Returns a Map from line index to the set of suppressed rules (empty string = all).
 */
function buildBlockSuppressionMap(lines: string[]): Map<number, Set<string>> {
  const map = new Map<number, Set<string>>();
  const openBlocks: string[] = []; // stack of rule names ("" = blanket)

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    const startMatch = SUPPRESSION_BLOCK_START.exec(line);
    if (startMatch) {
      openBlocks.push(startMatch[1] || '');
      addToMap(map, i, openBlocks);
      continue;
    }

    const endMatch = SUPPRESSION_BLOCK_END.exec(line);
    if (endMatch) {
      const closingRule = endMatch[1] || '';
      // Close the most recent matching block
      for (let j = openBlocks.length - 1; j >= 0; j--) {
        if (openBlocks[j] === closingRule) {
          openBlocks.splice(j, 1);
          break;
        }
      }
      addToMap(map, i, openBlocks);
      continue;
    }

    if (openBlocks.length > 0) {
      addToMap(map, i, openBlocks);
    }
  }

  return map;
}

/** Add all currently-open suppression rules to the map for a given line. */
function addToMap(
  map: Map<number, Set<string>>,
  lineIndex: number,
  openBlocks: string[]
): void {
  let set = map.get(lineIndex);
  if (!set) {
    set = new Set<string>();
    map.set(lineIndex, set);
  }
  for (const rule of openBlocks) {
    set.add(rule);
  }
}

/**
 * Base analyzer that all language-specific analyzers extend
 */
export abstract class BaseAnalyzer {
  protected language: SupportedLanguage;
  protected config: TechDebtConfig;

  constructor(language: SupportedLanguage, config: TechDebtConfig = {}) {
    this.language = language;
    this.config = config;
  }

  /**
   * Check whether a line is suppressed by inline suppression comments.
   *
   * Supports:
   * - `// techdebt-ignore-next-line [rule]` — suppresses the following line
   * - `// techdebt-ignore-start [rule]` / `// techdebt-ignore-end [rule]` — block suppression
   * - Lines that are suppression directives themselves are always suppressed
   */
  protected isLineSuppressed(
    lines: string[],
    lineIndex: number,
    rule: string,
    blockMap?: Map<number, Set<string>>
  ): boolean {
    const line = lines[lineIndex];

    // Skip suppression directive lines themselves — they are not code
    if (
      SUPPRESSION_NEXT_LINE.test(line) ||
      SUPPRESSION_BLOCK_START.test(line) ||
      SUPPRESSION_BLOCK_END.test(line)
    ) {
      return true;
    }

    // Check block suppression
    if (blockMap) {
      const suppressedRules = blockMap.get(lineIndex);
      if (suppressedRules) {
        // Blanket suppression (empty string) or specific rule match
        if (suppressedRules.has('') || suppressedRules.has(rule)) {
          return true;
        }
      }
    }

    // Check next-line suppression
    if (lineIndex > 0) {
      const prevLine = lines[lineIndex - 1];
      const match = SUPPRESSION_NEXT_LINE.exec(prevLine);
      if (match) {
        const suppressedRule = match[1];
        return !suppressedRule || suppressedRule === rule;
      }
    }

    return false;
  }

  /**
   * Analyze a file and return issues
   */
  async analyze(filePath: string, content: string): Promise<FileAnalysisResult> {
    const issues: TechDebtIssue[] = [];
    const langConfig = getLanguageConfig(this.language);

    // Common checks for all languages
    issues.push(...this.checkTodoComments(filePath, content, langConfig.todoPatterns));
    issues.push(...this.checkFileTooLong(filePath, content));
    issues.push(...this.checkLongLines(filePath, content));
    issues.push(...this.checkDeepNesting(filePath, content));

    // Language-specific checks
    issues.push(...await this.performLanguageSpecificChecks(filePath, content));

    // Apply rule exclusions
    const filteredIssues = this.applyRuleExclusions(filePath, issues);

    // Calculate metrics
    const metrics = this.calculateMetrics(content);

    return {
      file: filePath,
      language: this.language,
      issues: filteredIssues,
      metrics,
    };
  }

  /**
   * Override in subclasses for language-specific checks
   */
  protected abstract performLanguageSpecificChecks(
    filePath: string,
    content: string
  ): Promise<TechDebtIssue[]>;

  /**
   * Check for TODO/FIXME comments
   */
  protected checkTodoComments(
    filePath: string,
    content: string,
    patterns: RegExp[]
  ): TechDebtIssue[] {
    const issues: TechDebtIssue[] = [];
    const lines = content.split('\n');
    const blockMap = buildBlockSuppressionMap(lines);

    for (let i = 0; i < lines.length; i++) {
      if (this.isLineSuppressed(lines, i, 'todo-comment', blockMap)) {
        continue;
      }
      const line = lines[i];
      for (const pattern of patterns) {
        // Reset lastIndex for global regexes
        pattern.lastIndex = 0;
        const match = pattern.exec(line);
        if (match) {
          const todoType = match[1].toUpperCase();
          const severity = this.getTodoSeverity(todoType);

          issues.push({
            id: `todo-${i + 1}`,
            category: 'code-quality',
            severity,
            file: filePath,
            line: i + 1,
            title: `${todoType} comment found`,
            description: line.trim(),
            suggestion: `Address this ${todoType} item or create a tracked issue`,
            effort: 'small',
            language: this.language,
            rule: 'todo-comment',
            tags: ['todo', todoType.toLowerCase()],
          });
        }
      }
    }

    return issues;
  }

  /**
   * Get severity for TODO type
   */
  protected getTodoSeverity(todoType: string): TechDebtIssue['severity'] {
    const severityMap: Record<string, TechDebtIssue['severity']> = {
      'FIXME': 'high',
      'BUG': 'high',
      'HACK': 'high',
      'XXX': 'medium',
      'TODO': 'low',
      'OPTIMIZE': 'low',
      'MARK': 'low',
    };
    return severityMap[todoType] || 'low';
  }

  /**
   * Check if file is too long
   */
  protected checkFileTooLong(filePath: string, content: string): TechDebtIssue[] {
    const issues: TechDebtIssue[] = [];
    const maxLines = this.config.rules?.maxFileLines || 500;
    const lineCount = content.split('\n').length;

    if (lineCount > maxLines) {
      issues.push({
        id: 'file-too-long',
        category: 'maintainability',
        severity: lineCount > maxLines * 2 ? 'high' : 'medium',
        file: filePath,
        title: 'File is too long',
        description: `File has ${lineCount} lines (max recommended: ${maxLines})`,
        suggestion: 'Consider breaking this file into smaller, more focused modules',
        effort: 'medium',
        language: this.language,
        rule: 'file-length',
        tags: ['maintainability', 'file-size'],
      });
    }

    return issues;
  }

  /**
   * Check for long lines
   */
  protected checkLongLines(
    filePath: string,
    content: string,
    maxLength: number = 120
  ): TechDebtIssue[] {
    const issues: TechDebtIssue[] = [];
    const lines = content.split('\n');
    let longLineCount = 0;

    for (let i = 0; i < lines.length; i++) {
      if (lines[i].length > maxLength) {
        longLineCount++;
      }
    }

    if (longLineCount > 10) {
      issues.push({
        id: 'long-lines',
        category: 'code-quality',
        severity: 'low',
        file: filePath,
        title: 'Multiple long lines detected',
        description: `${longLineCount} lines exceed ${maxLength} characters`,
        suggestion: 'Consider breaking long lines for better readability',
        effort: 'small',
        language: this.language,
        rule: 'line-length',
        tags: ['readability'],
      });
    }

    return issues;
  }

  /**
   * Check for deep nesting
   */
  protected checkDeepNesting(
    filePath: string,
    content: string,
    maxDepth: number = 4
  ): TechDebtIssue[] {
    const issues: TechDebtIssue[] = [];
    const lines = content.split('\n');
    let maxFound = 0;
    let maxLine = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // Count leading spaces/tabs as nesting indicator
      const match = line.match(/^(\s*)/);
      if (match) {
        const spaces = match[1].replace(/\t/g, '    ').length;
        const depth = Math.floor(spaces / 2); // Assume 2-space indent
        if (depth > maxFound) {
          maxFound = depth;
          maxLine = i + 1;
        }
      }
    }

    const configMaxDepth = this.config.rules?.maxNestingDepth || maxDepth;
    if (maxFound > configMaxDepth) {
      issues.push({
        id: `deep-nesting-${maxLine}`,
        category: 'maintainability',
        severity: maxFound > configMaxDepth * 2 ? 'high' : 'medium',
        file: filePath,
        line: maxLine,
        title: 'Deep nesting detected',
        description: `Maximum nesting depth is ${maxFound} (recommended max: ${configMaxDepth})`,
        suggestion: 'Consider extracting nested logic into separate functions or using early returns',
        effort: 'medium',
        language: this.language,
        rule: 'nesting-depth',
        tags: ['complexity', 'maintainability'],
      });
    }

    return issues;
  }

  /**
   * Calculate file metrics
   */
  protected calculateMetrics(content: string): FileMetrics {
    const lineCounts = countLines(content);
    return {
      lines: lineCounts.total,
      codeLines: lineCounts.code,
      commentLines: lineCounts.comment,
      blankLines: lineCounts.blank,
    };
  }

  /**
   * Filter out issues matching ruleExclusions config.
   * Normalizes file paths to POSIX separators before matching
   * so glob patterns work consistently across platforms.
   */
  private applyRuleExclusions(
    filePath: string,
    issues: TechDebtIssue[]
  ): TechDebtIssue[] {
    const exclusions = this.config.ruleExclusions;
    if (!exclusions || Object.keys(exclusions).length === 0) {
      return issues;
    }

    const normalizedPath = filePath.replace(/\\/g, '/');

    return issues.filter(issue => {
      const patterns = exclusions[issue.rule];
      if (!patterns || patterns.length === 0) {
        return true;
      }
      return !patterns.some(pattern => minimatch(normalizedPath, pattern));
    });
  }

  /**
   * Helper to create pattern-based checks
   */
  protected checkPattern(
    filePath: string,
    content: string,
    pattern: RegExp,
    issueConfig: Omit<TechDebtIssue, 'id' | 'file' | 'line' | 'language'>
  ): TechDebtIssue[] {
    const issues: TechDebtIssue[] = [];
    const lines = content.split('\n');
    const blockMap = buildBlockSuppressionMap(lines);

    for (let i = 0; i < lines.length; i++) {
      if (this.isLineSuppressed(lines, i, issueConfig.rule, blockMap)) {
        continue;
      }
      const line = lines[i];
      pattern.lastIndex = 0;
      if (pattern.test(line)) {
        issues.push({
          id: `${issueConfig.rule}-${i + 1}`,
          file: filePath,
          line: i + 1,
          language: this.language,
          code: line.trim(),
          ...issueConfig,
        });
      }
    }

    return issues;
  }
}
