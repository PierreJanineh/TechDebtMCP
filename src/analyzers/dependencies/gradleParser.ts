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
      // Simple XML parsing using regex (not a full XML parser)
      // Match <dependency>...</dependency> blocks
      const depBlockRegex = /<dependency>([\s\S]*?)<\/dependency>/g;
      let match;

      while ((match = depBlockRegex.exec(content)) !== null) {
        const depBlock = match[1];

        // Extract groupId, artifactId, version, scope
        const groupIdMatch = /<groupId>([\s\S]*?)<\/groupId>/.exec(depBlock);
        const artifactIdMatch = /<artifactId>([\s\S]*?)<\/artifactId>/.exec(depBlock);
        const versionMatch = /<version>([\s\S]*?)<\/version>/.exec(depBlock);
        const scopeMatch = /<scope>([\s\S]*?)<\/scope>/.exec(depBlock);

        if (groupIdMatch && artifactIdMatch && versionMatch) {
          const groupId = groupIdMatch[1]?.trim() || '';
          const artifactId = artifactIdMatch[1]?.trim() || '';
          const version = versionMatch[1]?.trim() || '';
          const scope = scopeMatch?.[1]?.trim() || 'compile';

          if (groupId && artifactId) {
            dependencies.push({
              name: `${groupId}:${artifactId}`,
              version,
              isDev: scope === 'test' || scope === 'provided',
              source: filePath,
            });
          }
        }
      }

      return dependencies;
    } catch (error) {
      throw new Error(
        `Failed to parse pom.xml: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Parse Gradle build.gradle or build.gradle.kts file
   */
  private parseBuildGradle(content: string, filePath: string): ParsedDependency[] {
    const dependencies: ParsedDependency[] = [];

    // Parse Gradle dependency declarations
    // Handles both Groovy and Kotlin syntax:
    // implementation 'group:artifact:version'
    // implementation("group:artifact:version")
    // testImplementation 'group:artifact:version'

    // Match patterns like: implementation 'group:artifact:version' or implementation("group:artifact:version")
    const depRegex = /(implementation|testImplementation|compileOnly|testCompileOnly|runtimeOnly|testRuntimeOnly)\s+['"]([^'"]+)['"]/g;
    let match;

    while ((match = depRegex.exec(content)) !== null) {
      const configName = match[1] || '';
      const depString = match[2] || '';

      // Parse "group:artifact:version" format
      const parts = depString.split(':');
      if (parts.length >= 2) {
        const group = parts[0];
        const artifact = parts[1];
        const version = parts[2] || '*';

        dependencies.push({
          name: `${group}:${artifact}`,
          version,
          isDev: /test|compileOnly/.test(configName),
          source: filePath,
        });
      }
    }

    // Also match Kotlin syntax with parentheses: implementation("group:artifact:version")
    const kotlinDepRegex = /(implementation|testImplementation|compileOnly|testCompileOnly|runtimeOnly|testRuntimeOnly)\s*\(\s*["']([^"']+)["']\s*\)/g;
    while ((match = kotlinDepRegex.exec(content)) !== null) {
      const configName = match[1] || '';
      const depString = match[2] || '';

      const parts = depString.split(':');
      if (parts.length >= 2) {
        const group = parts[0];
        const artifact = parts[1];
        const version = parts[2] || '*';

        // Avoid duplicates
        const isDuplicate = dependencies.some(
          d => d.name === `${group}:${artifact}` && d.version === version
        );

        if (!isDuplicate) {
          dependencies.push({
            name: `${group}:${artifact}`,
            version,
            isDev: /test|compileOnly/.test(configName),
            source: filePath,
          });
        }
      }
    }

    return dependencies;
  }

  protected performParsing(): ParsedDependency[] {
    // Not used - override parent implementation with async parse
    return [];
  }
}

