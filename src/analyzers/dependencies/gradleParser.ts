import { BaseDependencyParser, ParsedDependency } from './baseParser.js';

/**
 * Dependency parser for Maven and Gradle (Java/Kotlin)
 * Parses both pom.xml (Maven) and build.gradle/build.gradle.kts (Gradle) files
 */
export class GradleParser extends BaseDependencyParser {
  protected readonly packageManager = 'gradle' as const;

  constructor() {
    super('gradle');
  }

  /**
   * Check if this parser can handle the file
   */
  canParse(filePath: string): boolean {
    return (
      filePath.endsWith('pom.xml') ||
      filePath.endsWith('build.gradle') ||
      filePath.endsWith('build.gradle.kts')
    );
  }

  /**
   * Get the package file names this parser handles
   */
  getPackageFileNames(): string[] {
    return ['pom.xml', 'build.gradle', 'build.gradle.kts'];
  }

  /**
   * Parse Maven/Gradle dependency files
   */
  async parse(filePath: string, content: string): Promise<ParsedDependency[]> {
    if (!this.canParse(filePath)) {
      throw new Error(`GradleParser cannot handle file: ${filePath}`);
    }

    if (filePath.endsWith('pom.xml')) {
      return this.parsePomXml(content, filePath);
    } else {
      return this.parseBuildGradle(content, filePath);
    }
  }

  /**
   * Parse Maven pom.xml file
   */
  private parsePomXml(content: string, filePath: string): ParsedDependency[] {
    const dependencies: ParsedDependency[] = [];

    try {
      const depBlockRegex = /<dependency>([\s\S]*?)<\/dependency>/g;
      let match;

      while ((match = depBlockRegex.exec(content)) !== null) {
        const dep = this.extractMavenDep(match[1], filePath);
        if (dep) dependencies.push(dep);
      }

      return dependencies;
    } catch (error) {
      throw new Error(
        `Failed to parse pom.xml: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Extract a single Maven dependency from a dependency XML block
   */
  private extractMavenDep(depBlock: string, filePath: string): ParsedDependency | null {
    const groupId = /<groupId>([\s\S]*?)<\/groupId>/.exec(depBlock)?.[1]?.trim() || '';
    const artifactId = /<artifactId>([\s\S]*?)<\/artifactId>/.exec(depBlock)?.[1]?.trim() || '';
    const version = /<version>([\s\S]*?)<\/version>/.exec(depBlock)?.[1]?.trim() || '';
    const scope = /<scope>([\s\S]*?)<\/scope>/.exec(depBlock)?.[1]?.trim() || 'compile';

    if (!groupId || !artifactId || !version) return null;

    return {
      name: `${groupId}:${artifactId}`,
      version,
      isDev: scope === 'test' || scope === 'provided',
      source: filePath,
    };
  }

  /**
   * Parse Gradle build.gradle or build.gradle.kts file
   */
  private parseBuildGradle(content: string, filePath: string): ParsedDependency[] {
    const dependencies: ParsedDependency[] = [];

    // Groovy syntax: implementation 'group:artifact:version'
    const depRegex = /(implementation|testImplementation|compileOnly|testCompileOnly|runtimeOnly|testRuntimeOnly)\s+['"]([^'"]+)['"]/g;
    this.collectGradleDeps(depRegex, content, filePath, dependencies);

    // Kotlin syntax: implementation("group:artifact:version")
    const kotlinDepRegex = /(implementation|testImplementation|compileOnly|testCompileOnly|runtimeOnly|testRuntimeOnly)\s*\(\s*["']([^"']+)["']\s*\)/g;
    this.collectGradleDeps(kotlinDepRegex, content, filePath, dependencies);

    return dependencies;
  }

  /**
   * Collect Gradle dependencies matching the given regex, deduplicating against existing entries
   */
  private collectGradleDeps(regex: RegExp, content: string, filePath: string, dependencies: ParsedDependency[]): void {
    let match;
    while ((match = regex.exec(content)) !== null) {
      const dep = this.parseGradleDepString(match[1] || '', match[2] || '', filePath);
      if (!dep) continue;

      const isDuplicate = dependencies.some(d => d.name === dep.name && d.version === dep.version);
      if (!isDuplicate) dependencies.push(dep);
    }
  }

  /**
   * Parse a "group:artifact:version" Gradle dependency string
   */
  private parseGradleDepString(configName: string, depString: string, filePath: string): ParsedDependency | null {
    const parts = depString.split(':');
    if (parts.length < 2) return null;

    return {
      name: `${parts[0]}:${parts[1]}`,
      version: parts[2] || '*',
      isDev: /test|compileOnly/.test(configName),
      source: filePath,
    };
  }
}
