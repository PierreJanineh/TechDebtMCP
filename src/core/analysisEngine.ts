import {
  TechDebtReport,
  TechDebtIssue,
  DebtSummary,
  Recommendation,
  ProjectInfo,
  SupportedLanguage,
  AnalysisOptions,
  TechDebtConfig,
  Severity,
  DebtCategory,
  CustomPattern,
} from '../types/index.js';
import { minimatch } from 'minimatch';
import { analyzeFileContent } from '../analyzers/index.js';
import { readFile } from '../utils/fileUtils.js';
import {
  LANGUAGE_CONFIGS,
  detectLanguageFromExtension,
  getAllExtensions,
  getSupportedLanguages,
} from '../config/languages.js';
import { SQALEEngine } from './sqaleEngine.js';
import { CustomRulesEngine, VALID_SEVERITIES, VALID_CATEGORIES } from './customRulesEngine.js';
import {
  getProjectFiles,
  loadConfig,
  findPackageFiles,
  getRelativePath,
} from '../utils/fileUtils.js';

/**
 * Returns true if ext is a safe file extension that won't corrupt the glob
 * pattern in getProjectFiles() (`**\/*{ext1,ext2}`). An extension must start
 * with '.' and must not contain glob metacharacters (`,`, `{`, `}`, `[`, `]`,
 * `(`, `)`, `?`, `*`, `!`).
 */
function isValidExtension(ext: string): boolean {
  return ext.startsWith('.') && !/[,{}()[\]?*!]/.test(ext);
}

/**
 * Build a precomputed Map<extension, SupportedLanguage> from languageOverrides.
 * Uses Object.hasOwn to check only own-property language keys (prevents prototype-
 * chain false positives for keys like "toString" or "__proto__"). Only extensions
 * that pass string-type, leading-dot, and glob-metacharacter validation are
 * included. Called once per analyzeProject() run for O(1) per-file lookups.
 */
function buildOverrideExtensionMap(config: TechDebtConfig): Map<string, SupportedLanguage> {
  const overrideMap = new Map<string, SupportedLanguage>();
  const overrides = config.languageOverrides;
  if (!overrides) return overrideMap;
  for (const [lang, partial] of Object.entries(overrides)) {
    if (!Object.hasOwn(LANGUAGE_CONFIGS, lang)) continue;
    if (!Array.isArray(partial?.extensions)) continue;
    for (const ext of partial.extensions) {
      if (typeof ext !== 'string') continue;
      const normalized = ext.toLowerCase();
      if (!isValidExtension(normalized)) continue;
      overrideMap.set(normalized, lang as SupportedLanguage);
    }
  }
  return overrideMap;
}

/**
 * Detect the language for a file path using a precomputed override extension map.
 * Override wins when the file extension matches an entry in the map; otherwise
 * falls back to the static LANGUAGE_CONFIGS map via detectLanguageFromExtension().
 * The map is built once per analyzeProject() run, making this O(1) per file.
 */
function detectLanguageWithOverrides(
  filePath: string,
  overrideMap: Map<string, SupportedLanguage>
): SupportedLanguage | null {
  if (overrideMap.size > 0) {
    const ext = filePath.includes('.')
      ? filePath.slice(filePath.lastIndexOf('.')).toLowerCase()
      : '';
    const lang = overrideMap.get(ext);
    if (lang) return lang;
  }
  return detectLanguageFromExtension(filePath);
}

/** Valid severity values — mirrors the Severity union type. */
const VALID_SEVERITY_VALUES = new Set<string>(['low', 'medium', 'high', 'critical']);

/** Returns true if v is a non-null, non-array plain object. */
function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/**
 * Deep-merge a single languageOverride entry into the base config.
 * The override's `rules` and `severity` objects are merged (override wins per
 * key), but invalid inner values are silently dropped so a malformed config
 * can't corrupt analysis:
 *   - `rules` values must be numbers (non-numeric entries are ignored).
 *   - `severity` values must be a valid Severity string; unknown strings
 *     (e.g. "extreme") are ignored.
 * All other properties (extensions, etc.) are structural metadata that the
 * analyzer factory already handles via the language parameter.
 */
function mergeLanguageOverride(
  config: TechDebtConfig,
  language: SupportedLanguage
): TechDebtConfig {
  const override = config.languageOverrides?.[language];
  if (!override) return config;

  const mergedRules: typeof config.rules = isPlainObject(override.rules)
    ? {
        ...config.rules,
        ...Object.fromEntries(
          Object.entries(override.rules).filter(([, v]) => typeof v === 'number')
        ) as typeof config.rules,
      }
    : config.rules;

  const mergedSeverity: typeof config.severity = isPlainObject(override.severity)
    ? {
        ...config.severity,
        ...Object.fromEntries(
          Object.entries(override.severity).filter(
            ([, v]) => typeof v === 'string' && VALID_SEVERITY_VALUES.has(v)
          )
        ),
      }
    : config.severity;

  return { ...config, rules: mergedRules, severity: mergedSeverity };
}

/**
 * Main analysis engine
 */
export class AnalysisEngine {
  private config: TechDebtConfig;

  constructor(config: TechDebtConfig = {}) {
    this.config = config;
  }

  /**
   * Analyze an entire project
   */
  async analyzeProject(options: AnalysisOptions): Promise<TechDebtReport> {
    const { path: projectPath } = options;

    // Load project config if exists
    const projectConfig = await loadConfig(projectPath);
    const mergedConfig = { ...this.config, ...projectConfig };

    // Build a per-call custom rules engine from config patterns (if any).
    // Pre-filter to only entries that are plain objects with a string id — loadConfig()
    // does not validate schema, so null entries or entries missing id would otherwise
    // throw inside the constructor.  Valid entries are preserved so one bad entry
    // does not silence all custom patterns.
    let customRulesEngine: CustomRulesEngine | null = null;
    if (Array.isArray(mergedConfig.customPatterns) && mergedConfig.customPatterns.length > 0) {
      const validPatterns = mergedConfig.customPatterns.filter(
        (p): p is CustomPattern => {
          if (p === null || typeof p !== 'object' || Array.isArray(p)) return false;
          const entry = p as unknown as Record<string, unknown>;
          return (
            typeof entry['id'] === 'string' &&
            entry['id'].length > 0 &&
            typeof entry['pattern'] === 'string' &&
            entry['pattern'].length > 0 &&
            typeof entry['message'] === 'string' &&
            entry['message'].length > 0 &&
            VALID_SEVERITIES.includes(entry['severity'] as Severity) &&
            VALID_CATEGORIES.includes(entry['category'] as DebtCategory)
          );
        }
      );
      if (validPatterns.length > 0) {
        customRulesEngine = new CustomRulesEngine(validPatterns);
      }
    }

    // Build override map once — O(1) per-file language detection in both loops below
    const overrideMap = buildOverrideExtensionMap(mergedConfig);
    const baseExtensions = getAllExtensions();
    const extensions = [
      ...baseExtensions,
      ...Array.from(overrideMap.keys()).filter(ext => !baseExtensions.includes(ext)),
    ];

    // Find all files to analyze
    const allFiles = await getProjectFiles(
      projectPath,
      extensions,
      mergedConfig.ignore
    );

    // Honor the include allowlist when present — filter against relative paths.
    // Normalize to POSIX separators so patterns work on Windows too (same
    // convention as BaseAnalyzer.applyRuleExclusions).
    const includeGlobs = mergedConfig.include;
    const files = (includeGlobs && includeGlobs.length > 0)
      ? allFiles.filter(file => {
          const rel = getRelativePath(projectPath, file).replace(/\\/g, '/');
          return includeGlobs.some(pattern => minimatch(rel, pattern, { dot: true }));
        })
      : allFiles;

    // Apply max files limit if specified
    const filesToAnalyze = options.maxFiles
      ? files.slice(0, options.maxFiles)
      : files;

    // Detect languages used in project (override-aware)
    const languagesUsed = new Set<SupportedLanguage>();
    for (const file of filesToAnalyze) {
      const lang = detectLanguageWithOverrides(file, overrideMap);
      if (lang) {
        languagesUsed.add(lang);
      }
    }

    // Filter by requested languages if specified
    const targetLanguages = options.languages
      ? new Set(options.languages)
      : languagesUsed;

    // Analyze all files
    const allIssues: TechDebtIssue[] = [];
    let analyzedCount = 0;

    for (const file of filesToAnalyze) {
      const lang = detectLanguageWithOverrides(file, overrideMap);
      if (!lang || !targetLanguages.has(lang)) continue;

      // Read file once; reuse for both the language analyzer and custom patterns.
      let content: string;
      try {
        content = await readFile(file);
      } catch {
        continue;
      }

      const fileIssues = await this.analyzeFileSafe(file, content, lang, projectPath, mergedConfig, options);
      if (fileIssues === null) continue;

      allIssues.push(...fileIssues);

      if (customRulesEngine) {
        const customIssues = this.applyCustomPatterns(
          customRulesEngine, file, content, projectPath, lang, mergedConfig, options
        );
        allIssues.push(...customIssues);
      }
      analyzedCount++;
    }

    // Find package files
    const packageFiles = await findPackageFiles(projectPath);
    const packageManagers = this.detectPackageManagers(packageFiles);

    // Build project info
    const projectInfo: ProjectInfo = {
      path: projectPath,
      languages: Array.from(languagesUsed),
      totalFiles: files.length,
      analyzedFiles: analyzedCount,
      packageManagers,
      frameworks: [], // Could be enhanced to detect frameworks
    };

    // Calculate summary
    const summary = this.calculateSummary(allIssues);

    // Calculate SQALE metrics
    const sqaleEngine = new SQALEEngine();
    const sqale = sqaleEngine.calculateMetrics(allIssues);

    // Generate recommendations
    const recommendations = this.generateRecommendations(allIssues, summary);

    return {
      timestamp: new Date().toISOString(),
      project: projectInfo,
      summary,
      sqale,
      issues: allIssues,
      recommendations,
    };
  }

  /**
   * Analyze a single file using pre-read content, returning filtered issues or null on failure.
   * Content is read once in the caller and shared with custom-pattern processing to avoid
   * duplicate filesystem I/O per file. The per-language override is applied here via
   * mergeLanguageOverride() before delegating to analyzeFileContent().
   */
  private async analyzeFileSafe(
    file: string,
    content: string,
    language: SupportedLanguage,
    projectPath: string,
    config: TechDebtConfig,
    options: AnalysisOptions
  ): Promise<TechDebtIssue[] | null> {
    try {
      const effectiveConfig = mergeLanguageOverride(config, language);
      const relativePath = getRelativePath(projectPath, file);
      const result = await analyzeFileContent(relativePath, content, language, effectiveConfig);
      return this.filterIssues(result.issues, options);
    } catch {
      // Skip files that cannot be analyzed (e.g., encoding or permission errors).
      // Individual file failures should not abort the whole project scan.
      return null;
    }
  }

  /**
   * Run custom patterns from the config against a single file using pre-read content.
   * Stamps `language` on each issue so they contribute to `summary.byLanguage`,
   * applies `ruleExclusions` and `severity` overrides, and filters by severity/category.
   */
  private applyCustomPatterns(
    engine: CustomRulesEngine,
    file: string,
    content: string,
    projectPath: string,
    lang: SupportedLanguage,
    config: TechDebtConfig,
    options: AnalysisOptions
  ): TechDebtIssue[] {
    // Apply per-language overrides so `languageOverrides[lang].severity` reaches
    // custom-pattern issues the same way it reaches built-in analyzer issues
    // (which go through mergeLanguageOverride inside analyzeFileSafe).
    const effectiveConfig = mergeLanguageOverride(config, lang);
    const relativePath = getRelativePath(projectPath, file);
    const rawIssues = engine.executeRules(relativePath, content, lang);
    const stampedIssues = rawIssues.map(issue => ({ ...issue, language: lang }));
    const excluded = this.applyCustomRuleExclusions(relativePath, stampedIssues, effectiveConfig);
    const withSeverity = this.applyCustomSeverityOverrides(excluded, effectiveConfig);
    return this.filterIssues(withSeverity, options);
  }

  /**
   * Apply ruleExclusions from config to custom-pattern issues.
   * Mirrors the logic in BaseAnalyzer.applyRuleExclusions so that config-defined
   * `ruleExclusions` work consistently for both built-in and custom rules.
   */
  private applyCustomRuleExclusions(
    relativePath: string,
    issues: TechDebtIssue[],
    config: TechDebtConfig
  ): TechDebtIssue[] {
    const exclusions = config.ruleExclusions;
    if (!exclusions || Object.keys(exclusions).length === 0) {
      return issues;
    }
    const normalizedPath = relativePath.replace(/\\/g, '/');
    return issues.filter(issue => {
      const patterns = exclusions[issue.rule];
      if (!patterns || patterns.length === 0) return true;
      return !patterns.some(pattern => minimatch(normalizedPath, pattern));
    });
  }

  /**
   * Apply severity overrides from `config.severity` to custom-pattern issues.
   * Mirrors BaseAnalyzer.applySeverityOverrides so custom rules respect the same
   * per-rule severity config that built-in analyzer rules honor.
   */
  private applyCustomSeverityOverrides(issues: TechDebtIssue[], config: TechDebtConfig): TechDebtIssue[] {
    const overrides = config.severity;
    if (!overrides || Object.keys(overrides).length === 0) {
      return issues;
    }
    return issues.map(issue => {
      const override = overrides[issue.rule];
      return override !== undefined ? { ...issue, severity: override } : issue;
    });
  }

  /**
   * Apply severity and category filters to a list of issues
   */
  private filterIssues(issues: TechDebtIssue[], options: AnalysisOptions): TechDebtIssue[] {
    const { severity, categories } = options;
    const bySeverity = severity
      ? issues.filter(i => this.severityMeetsThreshold(i.severity, severity))
      : issues;
    return categories
      ? bySeverity.filter(i => categories.includes(i.category))
      : bySeverity;
  }

  /**
   * Check if severity meets threshold
   */
  private severityMeetsThreshold(severity: Severity, threshold: Severity): boolean {
    const levels: Severity[] = ['low', 'medium', 'high', 'critical'];
    return levels.indexOf(severity) >= levels.indexOf(threshold);
  }

  /**
   * Calculate summary statistics
   */
  private calculateSummary(issues: TechDebtIssue[]): DebtSummary {
    const bySeverity: Record<Severity, number> = {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0,
    };

    const byCategory: Record<DebtCategory, number> = {
      'dependency': 0,
      'code-quality': 0,
      'architecture': 0,
      'documentation': 0,
      'testing': 0,
      'security': 0,
      'performance': 0,
      'maintainability': 0,
    };

    const byLanguage: Record<string, number> = {};

    for (const issue of issues) {
      bySeverity[issue.severity]++;
      byCategory[issue.category]++;

      if (issue.language) {
        byLanguage[issue.language] = (byLanguage[issue.language] || 0) + 1;
      }
    }

    // Calculate debt score (0-100, higher = more debt)
    const debtScore = this.calculateDebtScore(issues);
    const healthScore = 100 - debtScore;

    return {
      totalIssues: issues.length,
      bySeverity,
      byCategory,
      byLanguage,
      debtScore,
      healthScore,
    };
  }

  /**
   * Calculate debt score based on issues
   */
  private calculateDebtScore(issues: TechDebtIssue[]): number {
    if (issues.length === 0) return 0;

    const severityWeights: Record<Severity, number> = {
      low: 1,
      medium: 3,
      high: 7,
      critical: 15,
    };

    let totalWeight = 0;
    for (const issue of issues) {
      totalWeight += severityWeights[issue.severity];
    }

    // Normalize to 0-100 scale (cap at 100)
    // Assuming a baseline of 500 weighted points = 100 score
    const score = Math.min(100, (totalWeight / 500) * 100);
    return Math.round(score * 10) / 10;
  }

  /**
   * Generate recommendations based on issues
   */
  private generateRecommendations(
    issues: TechDebtIssue[],
    summary: DebtSummary
  ): Recommendation[] {
    const recommendations: Recommendation[] = [];

    // Critical issues recommendation
    if (summary.bySeverity.critical > 0) {
      recommendations.push({
        title: 'Address Critical Issues Immediately',
        description: `You have ${summary.bySeverity.critical} critical issues that should be fixed as soon as possible.`,
        priority: 1,
        effort: 'medium',
        impact: 'high',
        relatedIssues: issues
          .filter(i => i.severity === 'critical')
          .map(i => i.id),
        actionItems: [
          'Review all critical security issues',
          'Fix eval() and exec() usages',
          'Remove debugger statements',
          'Address format string vulnerabilities',
        ],
      });
    }

    // Security issues
    if (summary.byCategory.security > 0) {
      recommendations.push({
        title: 'Security Improvements Needed',
        description: `Found ${summary.byCategory.security} security-related issues.`,
        priority: 2,
        effort: 'medium',
        impact: 'high',
        relatedIssues: issues
          .filter(i => i.category === 'security')
          .map(i => i.id),
        actionItems: [
          'Run a security audit on the codebase',
          'Replace unsafe functions with safe alternatives',
          'Review and fix all security-related warnings',
        ],
      });
    }

    // TODO/FIXME cleanup
    const todoIssues = issues.filter(i => i.rule === 'todo-comment');
    if (todoIssues.length > 10) {
      recommendations.push({
        title: 'Clean Up TODO/FIXME Comments',
        description: `Found ${todoIssues.length} TODO/FIXME comments. Consider creating tracked issues.`,
        priority: 3,
        effort: 'small',
        impact: 'medium',
        relatedIssues: todoIssues.map(i => i.id),
        actionItems: [
          'Review all TODO comments',
          'Create GitHub issues for important TODOs',
          'Remove or complete outdated TODOs',
        ],
      });
    }

    // High issue count recommendation
    if (summary.bySeverity.high > 10) {
      recommendations.push({
        title: 'Dedicate Time for Tech Debt Reduction',
        description: `${summary.bySeverity.high} high-severity issues found. Consider allocating sprint time for tech debt.`,
        priority: 4,
        effort: 'large',
        impact: 'high',
        relatedIssues: issues
          .filter(i => i.severity === 'high')
          .map(i => i.id),
        actionItems: [
          'Schedule tech debt sprints',
          'Prioritize issues by business impact',
          'Set up automated code quality checks',
        ],
      });
    }

    // Maintainability recommendation
    if (summary.byCategory.maintainability > 5) {
      recommendations.push({
        title: 'Improve Code Maintainability',
        description: 'Several files have maintainability issues like deep nesting or excessive length.',
        priority: 5,
        effort: 'large',
        impact: 'medium',
        relatedIssues: issues
          .filter(i => i.category === 'maintainability')
          .map(i => i.id),
        actionItems: [
          'Break down large files into smaller modules',
          'Reduce function complexity',
          'Apply single responsibility principle',
        ],
      });
    }

    return recommendations.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Detect package managers from package files
   */
  private detectPackageManagers(packageFiles: string[]): string[] {
    const managers = new Set<string>();

    for (const file of packageFiles) {
      if (file.includes('package.json')) managers.add('npm');
      if (file.includes('requirements.txt') || file.includes('setup.py') || file.includes('pyproject.toml')) managers.add('pip');
      if (file.includes('Pipfile')) managers.add('pipenv');
      if (file.includes('pom.xml')) managers.add('maven');
      if (file.includes('build.gradle')) managers.add('gradle');
      if (file.includes('Cargo.toml')) managers.add('cargo');
      if (file.includes('go.mod')) managers.add('go modules');
      if (file.includes('Gemfile')) managers.add('bundler');
      if (file.includes('composer.json')) managers.add('composer');
      if (file.includes('.csproj')) managers.add('nuget');
      if (file.includes('Package.swift')) managers.add('swift package manager');
      if (file.includes('Podfile')) managers.add('cocoapods');
      if (file.includes('CMakeLists.txt')) managers.add('cmake');
    }

    return Array.from(managers);
  }
}

/**
 * Get list of supported languages with their details
 */
export function getLanguageDetails(): Array<{
  id: SupportedLanguage;
  name: string;
  extensions: string[];
}> {
  const languages = getSupportedLanguages();

  return languages.map(lang => ({
    id: lang,
    name: LANGUAGE_CONFIGS[lang].name,
    extensions: LANGUAGE_CONFIGS[lang].extensions,
  }));
}
