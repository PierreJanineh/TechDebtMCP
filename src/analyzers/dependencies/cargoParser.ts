import { BaseDependencyParser, ParsedDependency } from './baseParser.js';
import * as toml from 'toml';

/**
 * Dependency parser for Cargo (Rust)
 * Parses Cargo.toml files to extract dependencies
 */
export class CargoParser extends BaseDependencyParser {
  protected readonly packageManager = 'cargo' as const;

  constructor() {
    super('cargo');
  }

  /**
   * Check if this parser can handle the file
   */
  canParse(filePath: string): boolean {
    return filePath.endsWith('Cargo.toml') && !filePath.endsWith('Cargo.lock');
  }

  /**
   * Get the package file names this parser handles
   */
  getPackageFileNames(): string[] {
    return ['Cargo.toml'];
  }

  /**
   * Parse Cargo.toml file content
   */
  async parse(filePath: string, content: string): Promise<ParsedDependency[]> {
    if (!this.canParse(filePath)) {
      throw new Error(`CargoParser cannot handle file: ${filePath}`);
    }

    const dependencies: ParsedDependency[] = [];

    try {
      const cargoToml = toml.parse(content) as Record<string, unknown>;

      // Parse production dependencies
      if (cargoToml.dependencies && typeof cargoToml.dependencies === 'object') {
        const deps = cargoToml.dependencies as Record<string, unknown>;
        for (const [name, spec] of Object.entries(deps)) {
          const version = this.extractVersion(spec);
          if (version) {
            dependencies.push({
              name,
              version,
              isDev: false,
              source: filePath,
            });
          }
        }
      }

      // Parse dev dependencies
      if (cargoToml['dev-dependencies'] && typeof cargoToml['dev-dependencies'] === 'object') {
        const devDeps = cargoToml['dev-dependencies'] as Record<string, unknown>;
        for (const [name, spec] of Object.entries(devDeps)) {
          const version = this.extractVersion(spec);
          if (version) {
            dependencies.push({
              name,
              version,
              isDev: true,
              source: filePath,
            });
          }
        }
      }

      // Parse build dependencies (treated as dev deps)
      if (cargoToml['build-dependencies'] && typeof cargoToml['build-dependencies'] === 'object') {
        const buildDeps = cargoToml['build-dependencies'] as Record<string, unknown>;
        for (const [name, spec] of Object.entries(buildDeps)) {
          const version = this.extractVersion(spec);
          if (version) {
            dependencies.push({
              name,
              version,
              isDev: true,
              source: filePath,
            });
          }
        }
      }

      return dependencies;
    } catch (error) {
      throw new Error(
        `Failed to parse Cargo.toml: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Extract version from Cargo.toml dependency specification
   * Can be a string like "1.0" or an object like { version = "1.0", features = [...] }
   */
  private extractVersion(spec: unknown): string | null {
    if (typeof spec === 'string') {
      return spec;
    }

    if (spec && typeof spec === 'object') {
      const obj = spec as Record<string, unknown>;
      if (typeof obj.version === 'string') {
        return obj.version;
      }
      // If no version but has other properties, it might be a path dependency
      if (obj.path || obj.git) {
        return '*';
      }
    }

    return null;
  }

  protected performParsing(): ParsedDependency[] {
    // Not used - override parent implementation with async parse
    return [];
  }
}

