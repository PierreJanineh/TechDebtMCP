import { BaseDependencyParser, ParsedDependency } from './baseParser.js';

/**
 * Dependency parser for Bundler (Ruby)
 * Parses Gemfile files to extract gem dependencies
 * Uses regex patterns to parse Ruby DSL
 */
export class BundlerParser extends BaseDependencyParser {
  protected readonly packageManager = 'bundler' as const;

  constructor() {
    super('bundler');
  }

  /**
   * Check if this parser can handle the file
   */
  canParse(filePath: string): boolean {
    return filePath.endsWith('Gemfile') && !filePath.endsWith('Gemfile.lock');
  }

  /**
   * Get the package file names this parser handles
   */
  getPackageFileNames(): string[] {
    return ['Gemfile'];
  }

  /**
   * Parse Gemfile content
   */
  async parse(filePath: string, content: string): Promise<ParsedDependency[]> {
    if (!this.canParse(filePath)) {
      throw new Error(`BundlerParser cannot handle file: ${filePath}`);
    }

    const dependencies: ParsedDependency[] = [];

    // Track if we're in a group block (for dev dependencies)
    let inDevGroup = false;

    const lines = content.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();

      // Skip empty lines and comments
      if (!trimmed || trimmed.startsWith('#')) {
        continue;
      }

      // Track group blocks for dev dependencies
      if (trimmed.startsWith('group')) {
        const groupMatch = /group\s+(.+)\s+do/.exec(trimmed);
        inDevGroup = groupMatch ? /dev|test/.test(groupMatch[1]) : false;
        continue;
      }

      if (trimmed === 'end') {
        inDevGroup = false;
        continue;
      }

      if (!trimmed.startsWith('gem')) continue;

      const dep = this.parseGemLine(trimmed);
      if (dep) {
        dependencies.push({ ...dep, isDev: inDevGroup, source: filePath });
      }
    }

    return dependencies;
  }

  /**
   * Parse a single gem line
   * Handles: gem 'name', gem 'name', '1.0', gem "name", "1.0", etc.
   */
  private parseGemLine(line: string): { name: string; version: string } | null {
    // Match: gem 'name' or gem "name" or gem 'name', '1.0' or gem 'name', '1.0', ...
    // This regex captures gem name in group 1 and optional version in group 3
    const match = /gem\s+['"]([^'"]+)['"]\s*(?:,\s*['"]([^'"]+)['"])?/.exec(line);

    if (!match) {
      return null;
    }

    const name = match[1];
    const version = match[2] || '*';

    // Skip git, path, and github sources (they have different handling)
    if (line.includes('git:') || line.includes('path:') || line.includes('github:')) {
      // Could return null to skip, or return the gem anyway
      // For now, we'll still return it but could filter out based on requirements
      if (!version || version === '*') {
        return null;
      }
    }

    return {
      name,
      version,
    };
  }
}
