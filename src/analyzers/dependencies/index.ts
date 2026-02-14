import { basename } from 'node:path';
import { BaseDependencyParser, ParsedDependency } from './baseParser.js';
import { NpmParser } from './npmParser.js';
import { PipParser } from './pipParser.js';
import { ComposerParser } from './composerParser.js';
import { BundlerParser } from './bundlerParser.js';
import { CargoParser } from './cargoParser.js';
import { GoModParser } from './goModParser.js';
import { GradleParser } from './gradleParser.js';

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
    // 'requirements.txt': new PipParser(), // handled by requirements check
    // ... other parsers
  };

  // Check file extension/name patterns
  if (Object.hasOwn(parserMap, fileName)) {
    return parserMap[fileName];
  }

  // Check for requirements.txt variants
  if (fileName.startsWith('requirements') && fileName.endsWith('.txt')) {
    return new PipParser();
  }

  // Check for build files
  if (fileName === 'pom.xml' || fileName === 'build.gradle' || fileName === 'build.gradle.kts') {
    // return new GradleParser();
  }

  if (fileName === 'Cargo.toml') {
    // return new CargoParser();
  }

  if (fileName === 'go.mod') {
    // return new GoModParser();
  }

  if (fileName === 'composer.json') {
    // return new ComposerParser();
  }

  if (fileName === 'Gemfile') {
    // return new BundlerParser();
  }

  if (fileName === 'Package.swift' || fileName === 'Podfile') {
    // return new SwiftParser();
  }

  if (fileName === 'packages.config' || fileName.endsWith('.csproj')) {
    // return new NugetParser();
  }

  if (fileName === 'CMakeLists.txt' || fileName === 'conanfile.txt' || fileName === 'vcpkg.json') {
    // return new CppParser();
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


