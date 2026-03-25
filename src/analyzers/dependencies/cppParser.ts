import { BaseDependencyParser, ParsedDependency } from './baseParser.js';
import { basename } from 'node:path';

/**
 * Dependency parser for C/C++ (CMake, Conan, vcpkg)
 * Parses CMakeLists.txt, conanfile.txt, conanfile.py, vcpkg.json
 */
export class CppParser extends BaseDependencyParser {
  protected readonly packageManager = 'cpp' as const;

  constructor() {
    super('cpp');
  }

  canParse(filePath: string): boolean {
    return (
      filePath.endsWith('CMakeLists.txt') ||
      filePath.endsWith('conanfile.txt') ||
      filePath.endsWith('conanfile.py') ||
      filePath.endsWith('vcpkg.json')
    );
  }

  getPackageFileNames(): string[] {
    return ['CMakeLists.txt', 'conanfile.txt', 'conanfile.py', 'vcpkg.json'];
  }

  async parse(filePath: string, content: string): Promise<ParsedDependency[]> {
    if (!this.canParse(filePath)) {
      throw new Error(`CppParser cannot handle file: ${filePath}`);
    }

    const fileName = basename(filePath) || '';

    if (fileName === 'CMakeLists.txt') {
      return this.parseCMakeLists(content, filePath);
    } else if (fileName === 'conanfile.txt') {
      return this.parseConanfileTxt(content, filePath);
    } else if (fileName === 'conanfile.py') {
      return this.parseConanfilePy(content, filePath);
    } else if (fileName === 'vcpkg.json') {
      return this.parseVcpkgJson(content, filePath);
    }

    return [];
  }

  private parseCMakeLists(content: string, filePath: string): ParsedDependency[] {
    const deps: ParsedDependency[] = [];

    // Match find_package(Name VERSION) patterns
    const regex = /find_package\s*\(\s*([A-Za-z0-9_]+)\s+(?:([0-9.]+)\s+)?/g;
    let match;

    while ((match = regex.exec(content)) !== null) {
      const name = match[1] || '';
      const version = match[2] || '*';

      if (name) {
        deps.push({
          name,
          version,
          isDev: false,
          source: filePath,
        });
      }
    }

    return deps;
  }

  private parseConanfileTxt(content: string, filePath: string): ParsedDependency[] {
    const deps: ParsedDependency[] = [];
    const lines = content.split('\n');
    let inRequires = false;

    for (const line of lines) {
      const trimmed = line.trim();

      if (trimmed === '[requires]') {
        inRequires = true;
        continue;
      }
      if (trimmed.startsWith('[') && trimmed !== '[requires]') {
        inRequires = false;
        continue;
      }
      if (!inRequires || !trimmed || trimmed.startsWith('#')) continue;

      const dep = this.parseConanDep(trimmed, filePath);
      if (dep) deps.push(dep);
    }

    return deps;
  }

  /**
   * Parse a "package/version" Conan dependency string
   */
  private parseConanDep(depString: string, filePath: string): ParsedDependency | null {
    const parts = depString.split('/');
    const name = parts[0];
    if (!name) return null;

    return { name, version: parts[1] || '*', isDev: false, source: filePath };
  }

  private parseConanfilePy(content: string, filePath: string): ParsedDependency[] {
    const regex = /requires\s*=\s*\[\s*(?:"([^"]+)"[,\s]*)+\]/g;
    const match = regex.exec(content);
    if (!match) return [];

    const deps: ParsedDependency[] = [];
    const quotedRegex = /"([^"]+)"/g;
    let quotedMatch;

    while ((quotedMatch = quotedRegex.exec(match[0])) !== null) {
      const dep = this.parseConanDep(quotedMatch[1] || '', filePath);
      if (dep) deps.push(dep);
    }

    return deps;
  }

  private parseVcpkgJson(content: string, filePath: string): ParsedDependency[] {
    const deps: ParsedDependency[] = [];

    try {
      const json = JSON.parse(content) as { dependencies?: string[] };

      if (json.dependencies && Array.isArray(json.dependencies)) {
        for (const dep of json.dependencies) {
          deps.push({
            name: dep,
            version: '*',
            isDev: false,
            source: filePath,
          });
        }
      }
    } catch {
      // Ignore parse errors for now
    }

    return deps;
  }
}
