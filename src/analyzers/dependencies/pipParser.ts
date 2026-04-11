import { BaseDependencyParser, ParsedDependency } from './baseParser.js';
import * as toml from 'toml';
import { basename } from 'node:path';

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
    const fileName = basename(filePath) || '';
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

    const fileName = basename(filePath) || '';

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
      this.parsePep517Dependencies(data, dependencies, filePath);

      // Poetry format
      this.parsePoetryDependencies(data, dependencies, filePath);

    } catch (error) {
      throw new Error(
        `Failed to parse pyproject.toml: ${error instanceof Error ? error.message : String(error)}`
      );
    }

    return dependencies;
  }

  /**
   * Parse PEP 517/518 standard dependencies from pyproject.toml
   */
  private parsePep517Dependencies(data: Record<string, unknown>, dependencies: ParsedDependency[], filePath: string): void {
    const project = data.project as Record<string, unknown>;
    if (!project) return;

    // Main dependencies
    this.parseDependencyArray(project.dependencies, dependencies, filePath, false);

    // Optional dependencies
    this.parseOptionalDependencies(project, dependencies, filePath);
  }

  /**
   * Parse an array of PEP 508 dependency strings
   */
  private parseDependencyArray(depArray: unknown, dependencies: ParsedDependency[], filePath: string, isDev: boolean): void {
    if (!Array.isArray(depArray)) return;

    for (const dep of depArray) {
      const parsed = this.parseDependencyString(dep as string);
      if (parsed) {
        dependencies.push({
          ...parsed,
          isDev,
          source: filePath,
        });
      }
    }
  }

  /**
   * Parse [project.optional-dependencies] groups from pyproject.toml
   */
  private parseOptionalDependencies(project: Record<string, unknown>, dependencies: ParsedDependency[], filePath: string): void {
    const optDeps = project['optional-dependencies'];
    if (!optDeps || typeof optDeps !== 'object') return;

    const optionalDeps = optDeps as Record<string, unknown[]>;
    for (const depList of Object.values(optionalDeps)) {
      this.parseDependencyArray(depList, dependencies, filePath, false);
    }
  }

  /**
   * Collect dependencies from a TOML record of name→version pairs
   */
  private collectTomlDeps(
    record: unknown,
    isDev: boolean,
    filePath: string,
    excludeNames: string[] = [],
  ): ParsedDependency[] {
    if (!record || typeof record !== 'object') return [];

    const deps: ParsedDependency[] = [];
    for (const [name, version] of Object.entries(record as Record<string, unknown>)) {
      if (excludeNames.includes(name)) continue;
      deps.push({
        name,
        version: typeof version === 'string' ? version : JSON.stringify(version),
        isDev,
        source: filePath,
      });
    }
    return deps;
  }

  /**
   * Parse Poetry-style dependencies including 1.2+ group format
   */
  private parsePoetryDependencies(data: Record<string, unknown>, dependencies: ParsedDependency[], filePath: string): void {
    if (!data.tool || typeof data.tool !== 'object') return;

    const tool = data.tool as Record<string, unknown>;
    if (!tool.poetry || typeof tool.poetry !== 'object') return;

    const poetry = tool.poetry as Record<string, unknown>;

    // Poetry dependencies (exclude 'python' meta-dep)
    dependencies.push(...this.collectTomlDeps(poetry.dependencies, false, filePath, ['python']));

    // Poetry dev-dependencies
    dependencies.push(...this.collectTomlDeps(poetry['dev-dependencies'], true, filePath));

    // Poetry group dependencies (Poetry 1.2+)
    this.parsePoetryGroups(poetry.group, dependencies, filePath);
  }

  /**
   * Parse Poetry 1.2+ group dependencies
   * Only 'dev' is universally understood as dev-only; groups like 'test', 'lint', 'docs'
   * vary by project convention, so we conservatively treat them as production.
   */
  private parsePoetryGroups(groups: unknown, dependencies: ParsedDependency[], filePath: string): void {
    if (!groups || typeof groups !== 'object') return;

    for (const [groupName, groupData] of Object.entries(groups as Record<string, unknown>)) {
      if (typeof groupData !== 'object' || !groupData) continue;

      const group = groupData as Record<string, unknown>;
      const isDev = groupName === 'dev';
      dependencies.push(...this.collectTomlDeps(group.dependencies, isDev, filePath));
    }
  }

  /**
   * Parse Pipfile format
   */
  private parsePipfile(content: string, filePath: string): ParsedDependency[] {
    try {
      const data = toml.parse(content) as Record<string, unknown>;
      return [
        ...this.collectTomlDeps(data.packages, false, filePath),
        ...this.collectTomlDeps(data['dev-packages'], true, filePath),
      ];
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
    // Extract name and version specifier. The dependency name is the first
    // capture group; extras like `django[async]` are naturally ignored
    // because the pattern only matches the leading `[a-zA-Z0-9._-]+`
    // identifier (the `[` is not in the character class).
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
}

