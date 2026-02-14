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

    const dependencies: ParsedDependency[] = [];

    try {
      const packageJson = JSON.parse(content) as Record<string, unknown>;

      // Parse production dependencies
      if (packageJson.dependencies && typeof packageJson.dependencies === 'object') {
        const deps = packageJson.dependencies as Record<string, string>;
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
      if (packageJson.devDependencies && typeof packageJson.devDependencies === 'object') {
        const devDeps = packageJson.devDependencies as Record<string, string>;
        for (const [name, version] of Object.entries(devDeps)) {
          dependencies.push({
            name,
            version,
            isDev: true,
            source: filePath,
          });
        }
      }

      // Parse peer dependencies (optional, not marked as dev)
      if (packageJson.peerDependencies && typeof packageJson.peerDependencies === 'object') {
        const peerDeps = packageJson.peerDependencies as Record<string, string>;
        for (const [name, version] of Object.entries(peerDeps)) {
          dependencies.push({
            name,
            version,
            isDev: false,
            source: filePath,
          });
        }
      }

      // Parse optional dependencies (optional, not marked as dev)
      if (packageJson.optionalDependencies && typeof packageJson.optionalDependencies === 'object') {
        const optionalDeps = packageJson.optionalDependencies as Record<string, string>;
        for (const [name, version] of Object.entries(optionalDeps)) {
          dependencies.push({
            name,
            version,
            isDev: false,
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

  protected performParsing(): ParsedDependency[] {
    // Not used - override parent implementation with async parse
    return [];
  }
}

