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

    const dependencies: ParsedDependency[] = [];

    try {
      const composerJson = JSON.parse(content) as Record<string, unknown>;

      // Parse production dependencies
      if (composerJson.require && typeof composerJson.require === 'object') {
        const deps = composerJson.require as Record<string, string>;
        for (const [name, version] of Object.entries(deps)) {
          dependencies.push({
            name,
            version,
            isDev: false,
            source: filePath,
          });
        }
      }

      // Parse development dependencies
      if (composerJson['require-dev'] && typeof composerJson['require-dev'] === 'object') {
        const devDeps = composerJson['require-dev'] as Record<string, string>;
        for (const [name, version] of Object.entries(devDeps)) {
          dependencies.push({
            name,
            version,
            isDev: true,
            source: filePath,
          });
        }
      }

      return dependencies;
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error(`Invalid JSON in ${filePath}: ${error.message}`);
      }
      throw error;
    }
  }
}
