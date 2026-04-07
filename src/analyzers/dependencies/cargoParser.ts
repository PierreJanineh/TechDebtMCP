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

    try {
      const cargoToml = toml.parse(content) as Record<string, unknown>;

      return [
        ...this.collectCargoSection(cargoToml.dependencies, false, filePath),
        ...this.collectCargoSection(cargoToml['dev-dependencies'], true, filePath),
        ...this.collectCargoSection(cargoToml['build-dependencies'], true, filePath),
      ];
    } catch (error) {
      throw new Error(
        `Failed to parse Cargo.toml: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Collect dependencies from a Cargo.toml dependency section
   */
  private collectCargoSection(section: unknown, isDev: boolean, filePath: string): ParsedDependency[] {
    if (!section || typeof section !== 'object') return [];

    const deps: ParsedDependency[] = [];
    for (const [name, spec] of Object.entries(section as Record<string, unknown>)) {
      const version = this.extractVersion(spec);
      if (!version) continue;
      deps.push({ name, version, isDev, source: filePath });
    }
    return deps;
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
}
