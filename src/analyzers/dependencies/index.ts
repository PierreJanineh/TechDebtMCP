import { basename } from 'node:path';
import { BaseDependencyParser, ParsedDependency } from './baseParser.js';
import { NpmParser } from './npmParser.js';
import { PipParser } from './pipParser.js';
import { ComposerParser } from './composerParser.js';
import { BundlerParser } from './bundlerParser.js';
import { CargoParser } from './cargoParser.js';
import { GoModParser } from './goModParser.js';
import { GradleParser } from './gradleParser.js';
import { SwiftPackageParser } from './swiftPackageParser.js';
import { NugetParser } from './nugetParser.js';
import { CppParser } from './cppParser.js';

/**
 * Factory function to create a dependency parser for a given file
 * @param filePath The path to the file
 * @returns A dependency parser if one can handle the file, null otherwise
 */
export function createDependencyParser(filePath: string): BaseDependencyParser | null {
  const fileName = basename(filePath);

  // Map of file names to parser instances
  const parserMap: Record<string, BaseDependencyParser> = {
    'package.json': new NpmParser(),
    'pyproject.toml': new PipParser(),
    'Pipfile': new PipParser(),
    'composer.json': new ComposerParser(),
    'Gemfile': new BundlerParser(),
    'Cargo.toml': new CargoParser(),
    'go.mod': new GoModParser(),
    'pom.xml': new GradleParser(),
    'build.gradle': new GradleParser(),
    'build.gradle.kts': new GradleParser(),
    'Package.swift': new SwiftPackageParser(),
    'Podfile': new SwiftPackageParser(),
    'Cartfile': new SwiftPackageParser(),
    'packages.config': new NugetParser(),
    'Directory.Build.props': new NugetParser(),
    'CMakeLists.txt': new CppParser(),
    'conanfile.txt': new CppParser(),
    'conanfile.py': new CppParser(),
    'vcpkg.json': new CppParser(),
    // 'requirements.txt': new PipParser(), // handled by requirements check
    // ... other parsers
  };

  // Check file extension/name patterns
  if (Object.hasOwn(parserMap, fileName)) {
    return parserMap[fileName];
  }

  // Check for requirements.txt variants (requirements-dev.txt, etc.)
  if (fileName.startsWith('requirements') && fileName.endsWith('.txt')) {
    return new PipParser();
  }

  // Check for .csproj files (dynamic file names not in parserMap)
  if (fileName.endsWith('.csproj')) {
    return new NugetParser();
  }

  return null;
}

/**
 * Get all available dependency parsers
 * @returns An array of all dependency parser instances
 */
export function getAllParsers(): BaseDependencyParser[] {
  const parsers: BaseDependencyParser[] = [
    new NpmParser(),
    new PipParser(),
    new ComposerParser(),
    new BundlerParser(),
    new CargoParser(),
    new GoModParser(),
    new GradleParser(),
    new SwiftPackageParser(),
    new NugetParser(),
    new CppParser(),
    // ... other parsers
  ];

  return parsers;
}

/**
 * Get package file names from all parsers
 * @returns An array of all package file names
 */
export function getAllPackageFileNames(): string[] {
  const fileNames = new Set<string>();

  for (const parser of getAllParsers()) {
    parser.getPackageFileNames().forEach(name => fileNames.add(name));
  }

  return Array.from(fileNames);
}

// Re-export types and base classes
export { BaseDependencyParser, ParsedDependency };


