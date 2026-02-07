/**
 * Parsed dependency information
 */
export interface ParsedDependency {
  name: string;
  version: string;
  isDev: boolean;
  source: string; // e.g., "package.json", "requirements.txt"
}

/**
 * Abstract base class for dependency parsers
 */
export abstract class BaseDependencyParser {
  protected readonly ecosystem: string;

  /**
   * Create a new dependency parser
   * @param ecosystem The name of the ecosystem (e.g., 'npm', 'pip')
   */
  constructor(ecosystem: string) {
    this.ecosystem = ecosystem;
  }

  /**
   * Get the ecosystem name
   */
  getEcosystem(): string {
    return this.ecosystem;
  }

  /**
   * Check if this parser can handle the given file
   * @param filePath The path to the file
   * @returns true if this parser can handle the file
   */
  abstract canParse(filePath: string): boolean;

  /**
   * Parse dependencies from file content
   * @param filePath The path to the file
   * @param content The file content
   * @returns An array of parsed dependencies
   */
  abstract parse(filePath: string, content: string): Promise<ParsedDependency[]>;

  /**
   * Get the package file names this parser handles
   * @returns An array of file names (e.g., ['package.json', 'package-lock.json'])
   */
  abstract getPackageFileNames(): string[];
}


