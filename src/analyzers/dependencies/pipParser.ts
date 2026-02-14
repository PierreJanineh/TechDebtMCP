import { BaseDependencyParser, ParsedDependency } from './baseParser.js';
import * as toml from 'toml';

/**
 * Dependency parser for pip (Python)
 * Parses multiple Python dependency file formats:
 * - requirements.txt
 * - pyproject.toml (PEP 517/518 standard + Poetry extensions)
 * - Pipfile (Pipenv format)
 */
export class PipParser extends BaseDependencyParser {
  protected readonly packageManager = 'pip' as const;

  constructor() {
    super('pip');
  }

  /**
   * Check if this parser can handle the file
   */
  canParse(filePath: string): boolean {
    const fileName = filePath.split('/').pop() || '';
    return (
      (fileName.startsWith('requirements') && fileName.endsWith('.txt')) ||
      fileName === 'pyproject.toml' ||
      fileName === 'Pipfile'
    );
  }

  /**
   * Get the package file names this parser handles
   */
  getPackageFileNames(): string[] {
    return ['requirements.txt', 'pyproject.toml', 'Pipfile'];
  }

  /**
   * Parse Python dependency files
   */
  async parse(filePath: string, content: string): Promise<ParsedDependency[]> {
    if (!this.canParse(filePath)) {
      throw new Error(`PipParser cannot handle file: ${filePath}`);
    }

    const fileName = filePath.split('/').pop() || '';

    if (fileName.includes('requirements') && fileName.endsWith('.txt')) {
      return this.parseRequirementsTxt(content, filePath);
    } else if (fileName === 'pyproject.toml') {
      return this.parsePyprojectToml(content, filePath);
    } else if (fileName === 'Pipfile') {
      return this.parsePipfile(content, filePath);
    }

    throw new Error(`Unknown Python dependency file format: ${fileName}`);
  }

  /**
   * Parse requirements.txt format
   */
  private parseRequirementsTxt(content: string, filePath: string): ParsedDependency[] {
    const dependencies: ParsedDependency[] = [];
    const lines = content.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();

      // Skip empty lines and comments
      if (!trimmed || trimmed.startsWith('#')) {
        continue;
      }

      // Remove environment markers (e.g., "; python_version >= '3.6'")
      const withoutMarker = trimmed.split(';')[0]?.trim() || '';
      if (!withoutMarker) {
        continue;
      }

      // Parse package name and version
      const dependency = this.parseRequirementLine(withoutMarker);
      if (dependency) {
        dependencies.push({
          ...dependency,
          source: filePath,
        });
      }
    }

    return dependencies;
  }

  /**
   * Parse a single requirement line
   * Handles: package-name, package-name==1.0.0, package-name>=1.0.0, etc.
   */
  private parseRequirementLine(line: string): { name: string; version: string; isDev: boolean } | null {
    // Match package name and version specifier
    // Supports: name, name==1.0, name>=1.0, name<2.0, name~=1.5, name!=1.0, name[extra]>=1.0
    const match = /^([a-zA-Z0-9._-]+(?:\[[^\]]*\])?)\s*([><=!~].*)?$/.exec(line);

    if (!match) {
      return null;
    }

    let name = match[1];
    let version = match[2]?.trim() || '*';

    // Remove extras like [dev,docs]
    if (name.includes('[')) {
      name = name.split('[')[0] || '';
    }

    // Extract just the version number from specifier
    // e.g., "==1.0.0" -> "1.0.0", ">=1.0.0" -> "1.0.0", "~=1.5" -> "1.5"
    version = this.extractVersion(version);

    return {
      name: name.trim(),
      version,
      isDev: false, // requirements.txt doesn't distinguish dev by default
    };
  }

  /**
   * Parse pyproject.toml format
   */
  private parsePyprojectToml(content: string, filePath: string): ParsedDependency[] {
    const dependencies: ParsedDependency[] = [];

    try {
      const data = toml.parse(content) as Record<string, unknown>;

      // PEP 517/518 standard format
      if (data.project && typeof data.project === 'object') {
        const project = data.project as Record<string, unknown>;
        if (Array.isArray(project.dependencies)) {
          for (const dep of project.dependencies) {
            const parsed = this.parseDependencyString(dep as string);
            if (parsed) {
              dependencies.push({
                ...parsed,
                isDev: false,
                source: filePath,
              });
            }
          }
        }

        // Optional dependencies
        if (project['optional-dependencies'] && typeof project['optional-dependencies'] === 'object') {
          const optDeps = project['optional-dependencies'] as Record<string, unknown[]>;
          for (const depList of Object.values(optDeps)) {
            if (Array.isArray(depList)) {
              for (const dep of depList) {
                const parsed = this.parseDependencyString(dep as string);
                if (parsed) {
                  dependencies.push({
                    ...parsed,
                    isDev: false,
                    source: filePath,
                  });
                }
              }
            }
          }
        }
      }

      // Poetry format
      if (data.tool && typeof data.tool === 'object') {
        const tool = data.tool as Record<string, unknown>;
        if (tool.poetry && typeof tool.poetry === 'object') {
          const poetry = tool.poetry as Record<string, unknown>;

          // Poetry dependencies
          if (poetry.dependencies && typeof poetry.dependencies === 'object') {
            const deps = poetry.dependencies as Record<string, unknown>;
            for (const [name, version] of Object.entries(deps)) {
              if (name !== 'python') {
                dependencies.push({
                  name,
                  version: typeof version === 'string' ? version : JSON.stringify(version),
                  isDev: false,
                  source: filePath,
                });
              }
            }
          }

          // Poetry dev-dependencies
          if (poetry['dev-dependencies'] && typeof poetry['dev-dependencies'] === 'object') {
            const devDeps = poetry['dev-dependencies'] as Record<string, unknown>;
            for (const [name, version] of Object.entries(devDeps)) {
              dependencies.push({
                name,
                version: typeof version === 'string' ? version : JSON.stringify(version),
                isDev: true,
                source: filePath,
              });
            }
          }
        }
      }

      return dependencies;
    } catch (error) {
      throw new Error(
        `Failed to parse pyproject.toml: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Parse Pipfile format
   */
  private parsePipfile(content: string, filePath: string): ParsedDependency[] {
    const dependencies: ParsedDependency[] = [];

    try {
      const data = toml.parse(content) as Record<string, unknown>;

      // Parse packages
      if (data.packages && typeof data.packages === 'object') {
        const packages = data.packages as Record<string, unknown>;
        for (const [name, version] of Object.entries(packages)) {
          dependencies.push({
            name,
            version: typeof version === 'string' ? version : JSON.stringify(version),
            isDev: false,
            source: filePath,
          });
        }
      }

      // Parse dev-packages
      if (data['dev-packages'] && typeof data['dev-packages'] === 'object') {
        const devPackages = data['dev-packages'] as Record<string, unknown>;
        for (const [name, version] of Object.entries(devPackages)) {
          dependencies.push({
            name,
            version: typeof version === 'string' ? version : JSON.stringify(version),
            isDev: true,
            source: filePath,
          });
        }
      }

      return dependencies;
    } catch (error) {
      throw new Error(
        `Failed to parse Pipfile: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Parse dependency string in PEP format
   * Examples: "requests>=2.28.0", "flask==2.2.2", "django[async]>=4.0"
   */
  private parseDependencyString(depStr: string): { name: string; version: string } | null {
    // Remove extras
    let name = depStr.split('[')[0] || '';
    name = name.trim();

    // Extract version specifier
    const match = /^([a-zA-Z0-9._-]+)\s*(.*)$/.exec(depStr);
    if (!match) {
      return null;
    }

    let version = match[2]?.trim() || '*';

    // Extract just the version number from specifier
    version = this.extractVersion(version);

    return {
      name: match[1],
      version,
    };
  }

  /**
   * Extract version from constraint string
   * Handles: ==1.0.0, >=1.0.0, <=2.0.0, ~=1.5, !=1.0.0, <3.0, >1.0
   */
  private extractVersion(constraint: string): string {
    if (constraint === '*' || !constraint) {
      return '*';
    }

    // Remove leading operators like ^, ~, >=, <=, =, >, <, !=, ~=
    return constraint
      .replace(/^[\^~><=!]+/, '') // Remove leading operators
      .trim()
      .split(/[\s,]/) // Take first part if split
      [0] || '*';
  }

  protected performParsing(): ParsedDependency[] {
    // Not used - override parent implementation with async parse
    return [];
  }
}




