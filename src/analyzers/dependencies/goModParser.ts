import { BaseDependencyParser, ParsedDependency } from './baseParser.js';

/**
 * Dependency parser for Go Modules (Go)
 * Parses go.mod files to extract dependencies
 */
export class GoModParser extends BaseDependencyParser {
  protected readonly packageManager = 'go' as const;

  constructor() {
    super('go');
  }

  /**
   * Check if this parser can handle the file
   */
  canParse(filePath: string): boolean {
    return filePath.endsWith('go.mod');
  }

  /**
   * Get the package file names this parser handles
   */
  getPackageFileNames(): string[] {
    return ['go.mod'];
  }

  /**
   * Parse go.mod file content
   */
  async parse(filePath: string, content: string): Promise<ParsedDependency[]> {
    if (!this.canParse(filePath)) {
      throw new Error(`GoModParser cannot handle file: ${filePath}`);
    }

    const dependencies: ParsedDependency[] = [];
    const lines = content.split('\n');
    let inRequireBlock = false;

    for (const line of lines) {
      const trimmed = line.trim();

      // Skip empty lines and comments
      if (!trimmed || trimmed.startsWith('//')) {
        continue;
      }

      // Track require blocks
      if (trimmed.startsWith('require (')) {
        inRequireBlock = true;
        continue;
      }

      // End of require block
      if (inRequireBlock && trimmed === ')') {
        inRequireBlock = false;
        continue;
      }

      // Parse require lines
      if (inRequireBlock || trimmed.startsWith('require ')) {
        const dep = this.parseRequireLine(trimmed);
        if (dep) {
          dependencies.push({
            ...dep,
            isDev: false,
            source: filePath,
          });
        }
      }
    }

    return dependencies;
  }

  /**
   * Parse a single require line
   * Examples:
   *   github.com/gorilla/mux v1.8.0
   *   github.com/lib/pq v1.10.0 // indirect
   *   require github.com/gorilla/mux v1.8.0
   */
  private parseRequireLine(line: string): { name: string; version: string } | null {
    // Remove 'require ' prefix if present
    let requireLine = line;
    if (requireLine.startsWith('require ')) {
      requireLine = requireLine.substring(8).trim();
    }

    // Remove comments (// indirect, etc.)
    const withoutComment = requireLine.split('//')[0]?.trim() || '';
    if (!withoutComment) {
      return null;
    }

    // Match: package.name version
    // Package names can contain slashes, version starts with 'v'
    const match = /^([a-zA-Z0-9.\-/_]+)\s+(v[a-zA-Z0-9.\-]+)/.exec(withoutComment);

    if (!match) {
      return null;
    }

    return {
      name: match[1],
      version: match[2],
    };
  }
}
