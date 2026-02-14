import { BaseDependencyParser, ParsedDependency } from './baseParser.js';

export class SwiftPackageParser extends BaseDependencyParser {
  protected readonly packageManager = 'swift' as const;

  constructor() {
    super('swift');
  }

  canParse(filePath: string): boolean {
    const fileName = filePath.split('/').pop() || '';
    return fileName === 'Package.swift' || fileName === 'Podfile' || fileName === 'Cartfile';
  }

  getPackageFileNames(): string[] {
    return ['Package.swift', 'Podfile', 'Cartfile'];
  }

  async parse(filePath: string, content: string): Promise<ParsedDependency[]> {
    if (!this.canParse(filePath)) {
      throw new Error(`SwiftPackageParser cannot handle file: ${filePath}`);
    }

    const fileName = filePath.split('/').pop() || '';
    if (fileName === 'Package.swift') return this.parsePackageSwift(content, filePath);
    if (fileName === 'Podfile') return this.parsePodfile(content, filePath);
    if (fileName === 'Cartfile') return this.parseCartfile(content, filePath);
    return [];
  }

  private parsePackageSwift(content: string, filePath: string): ParsedDependency[] {
    const deps: ParsedDependency[] = [];
    const regex = /\.package\s*\(\s*url\s*:\s*"([^"]+)"/g;
    let match;
    while ((match = regex.exec(content)) !== null) {
      const name = match[1]?.split('/').pop()?.replace('.git', '') || '';
      if (name) deps.push({ name, version: '*', isDev: false, source: filePath });
    }
    return deps;
  }

  private parsePodfile(content: string, filePath: string): ParsedDependency[] {
    const deps: ParsedDependency[] = [];
    const regex = /pod\s+['"]([^'"]+)['"]\s*(?:,\s*['"]([^'"]+)['"])?/g;
    let match;
    while ((match = regex.exec(content)) !== null) {
      const name = match[1] || '';
      const version = match[2] || '*';
      if (name) deps.push({ name, version, isDev: false, source: filePath });
    }
    return deps;
  }

  private parseCartfile(content: string, filePath: string): ParsedDependency[] {
    const deps: ParsedDependency[] = [];
    const lines = content.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const match = /^(?:github|git|binary)\s+["']([^"']+)["']/.exec(trimmed);
      if (match) {
        let name = match[1] || '';
        if (name?.includes('/') && !name?.includes('http')) {
          // GitHub style - keep as is
        } else if (name?.includes('http')) {
          name = name?.split('/').pop()?.replace('.git', '') || '';
        }
        if (name) deps.push({ name, version: '*', isDev: false, source: filePath });
      }
    }
    return deps;
  }

  protected performParsing(): ParsedDependency[] {
    return [];
  }
}


