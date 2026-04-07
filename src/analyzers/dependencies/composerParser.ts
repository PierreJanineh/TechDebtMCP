import { BaseDependencyParser, ParsedDependency } from './baseParser.js';

/**
 * Dependency parser for Composer (PHP)
 * Parses composer.json files to extract dependencies
 */
export class ComposerParser extends BaseDependencyParser {
  protected readonly packageManager = 'composer' as const;

  constructor() {
    super('composer');
  }

  /**
   * Check if this parser can handle the file
   */
  canParse(filePath: string): boolean {
    return filePath.endsWith('composer.json');
  }

  /**
   * Get the package file names this parser handles
   */
  getPackageFileNames(): string[] {
    return ['composer.json'];
  }

  /**
   * Parse composer.json file content
   */
  async parse(filePath: string, content: string): Promise<ParsedDependency[]> {
    if (!this.canParse(filePath)) {
      throw new Error(`ComposerParser cannot handle file: ${filePath}`);
    }

    try {
      const composerJson = JSON.parse(content) as Record<string, unknown>;

      return [
        ...this.collectJsonDeps(composerJson.require, false, filePath),
        ...this.collectJsonDeps(composerJson['require-dev'], true, filePath),
      ];
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error(`Invalid JSON in ${filePath}: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Collect dependencies from a JSON object of name→version pairs
   */
  private collectJsonDeps(section: unknown, isDev: boolean, filePath: string): ParsedDependency[] {
    if (!section || typeof section !== 'object') return [];

    const deps: ParsedDependency[] = [];
    for (const [name, version] of Object.entries(section as Record<string, string>)) {
      deps.push({ name, version, isDev, source: filePath });
    }
    return deps;
  }
}
