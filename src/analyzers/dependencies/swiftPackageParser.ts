import { BaseDependencyParser, ParsedDependency } from './baseParser.js';
import { basename } from 'node:path';

export class SwiftPackageParser extends BaseDependencyParser {
  protected readonly packageManager = 'swift' as const;

  constructor() {
    super('swift');
  }

  canParse(filePath: string): boolean {
    const fileName = basename(filePath) || '';
    return fileName === 'Package.swift' || fileName === 'Podfile' || fileName === 'Cartfile';
  }

  getPackageFileNames(): string[] {
    return ['Package.swift', 'Podfile', 'Cartfile'];
  }

  async parse(filePath: string, content: string): Promise<ParsedDependency[]> {
    if (!this.canParse(filePath)) {
      throw new Error(`SwiftPackageParser cannot handle file: ${filePath}`);
    }

    const fileName = basename(filePath) || '';
    if (fileName === 'Package.swift') return this.parsePackageSwift(content, filePath);
    if (fileName === 'Podfile') return this.parsePodfile(content, filePath);
    if (fileName === 'Cartfile') return this.parseCartfile(content, filePath);
    return [];
  }

  private extractRepoNameFromUrl(url: string): string {
    try {
      // Try parsing as URL
      if (url.startsWith('http')) {
        const parsed = new URL(url);
        return basename(parsed.pathname).replace('.git', '');
      }
    } catch {
      // ignore
    }
    // Fallback for github "user/repo" or similar
    return url.split('/').pop()?.replace('.git', '') || url;
  }

  private parsePackageSwift(content: string, filePath: string): ParsedDependency[] {
    const deps: ParsedDependency[] = [];
    const pkgRegex = /\.package\s*\(\s*url\s*:\s*"([^"]+)"/g;
    let match;
    while ((match = pkgRegex.exec(content)) !== null) {
      const repoUrl = match[1] || '';
      const name = this.extractRepoNameFromUrl(repoUrl);
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
        if (name.includes('/') && !name.includes('http')) {
          // GitHub style - keep user/repo
          name = name.split('/').pop() || name;
        } else if (name.includes('http')) {
          name = this.extractRepoNameFromUrl(name);
        }
        if (name) deps.push({ name, version: '*', isDev: false, source: filePath });
      }
    }
    return deps;
  }
}
