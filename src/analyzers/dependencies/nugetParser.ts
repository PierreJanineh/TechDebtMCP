import { BaseDependencyParser, ParsedDependency } from './baseParser.js';

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

    const fileName = filePath.split('/').pop() || '';

    if (fileName === 'packages.config') {
      return this.parsePackagesConfig(content, filePath);
    } else if (fileName === 'Directory.Build.props' || fileName.endsWith('.csproj')) {
      return this.parseCsproj(content, filePath);
    }

    return [];
  }

  private parsePackagesConfig(content: string, filePath: string): ParsedDependency[] {
    const deps: ParsedDependency[] = [];

    // Match <package id="..." version="..." />
    const regex = /<package\s+id="([^"]+)"\s+version="([^"]+)"/g;
    let match;

    while ((match = regex.exec(content)) !== null) {
      const name = match[1] || '';
      const version = match[2] || '';

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

  private parseCsproj(content: string, filePath: string): ParsedDependency[] {
    const deps: ParsedDependency[] = [];

    // Match <PackageReference Include="..." Version="..." />
    const regex = /<PackageReference\s+Include="([^"]+)"\s+Version="([^"]+)"/g;
    let match;

    while ((match = regex.exec(content)) !== null) {
      const name = match[1] || '';
      const version = match[2] || '';

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

  protected performParsing(): ParsedDependency[] {
    return [];
  }
}

