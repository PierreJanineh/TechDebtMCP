import { BaseDependencyParser, ParsedDependency } from './baseParser.js';
import { basename } from 'node:path';

/**
 * Dependency parser for NuGet (C#/.NET)
 * Parses packages.config, .csproj, and Directory.Build.props files
 */
export class NugetParser extends BaseDependencyParser {
  protected readonly packageManager = 'nuget' as const;

  constructor() {
    super('nuget');
  }

  canParse(filePath: string): boolean {
    return (
      filePath.endsWith('packages.config') ||
      filePath.endsWith('.csproj') ||
      filePath.endsWith('Directory.Build.props')
    );
  }

  getPackageFileNames(): string[] {
    return ['packages.config', 'Directory.Build.props'];
  }

  async parse(filePath: string, content: string): Promise<ParsedDependency[]> {
    if (!this.canParse(filePath)) {
      throw new Error(`NugetParser cannot handle file: ${filePath}`);
    }

    const fileName = basename(filePath) || '';

    if (fileName === 'packages.config') {
      return this.parsePackagesConfig(content, filePath);
    } else if (fileName === 'Directory.Build.props' || fileName.endsWith('.csproj')) {
      return this.parseCsproj(content, filePath);
    }

    return [];
  }

  private parsePackagesConfig(content: string, filePath: string): ParsedDependency[] {
    return this.collectXmlDeps(/<package\s+id="([^"]+)"\s+version="([^"]+)"/g, content, filePath);
  }

  private parseCsproj(content: string, filePath: string): ParsedDependency[] {
    return this.collectXmlDeps(/<PackageReference\s+Include="([^"]+)"\s+Version="([^"]+)"/g, content, filePath);
  }

  /**
   * Collect dependencies from XML content using a regex with name (group 1) and version (group 2)
   */
  private collectXmlDeps(regex: RegExp, content: string, filePath: string): ParsedDependency[] {
    const deps: ParsedDependency[] = [];
    let match;

    while ((match = regex.exec(content)) !== null) {
      const name = match[1] || '';
      if (!name) continue;
      deps.push({ name, version: match[2] || '', isDev: false, source: filePath });
    }

    return deps;
  }
}
