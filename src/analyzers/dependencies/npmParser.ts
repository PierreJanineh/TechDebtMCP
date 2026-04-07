import { BaseDependencyParser, ParsedDependency } from './baseParser.js';

/**
 * Dependency parser for npm (Node.js/JavaScript/TypeScript)
 * Parses package.json files to extract dependencies
 */
export class NpmParser extends BaseDependencyParser {
  protected readonly packageManager = 'npm' as const;

  constructor() {
    super('npm');
  }

  /**
   * Check if this parser can handle the file
   */
  canParse(filePath: string): boolean {
    return filePath.endsWith('package.json');
  }

  /**
   * Get the package file names this parser handles
   */
  getPackageFileNames(): string[] {
    return ['package.json'];
  }

  /**
   * Parse package.json file content
   */
  async parse(filePath: string, content: string): Promise<ParsedDependency[]> {
    if (!this.canParse(filePath)) {
      throw new Error(`NpmParser cannot handle file: ${filePath}`);
    }

    try {
      const packageJson = JSON.parse(content) as Record<string, unknown>;

      return [
        ...this.collectJsonDeps(packageJson.dependencies, false, filePath),
        ...this.collectJsonDeps(packageJson.devDependencies, true, filePath),
        ...this.collectJsonDeps(packageJson.peerDependencies, false, filePath),
        ...this.collectJsonDeps(packageJson.optionalDependencies, false, filePath),
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
