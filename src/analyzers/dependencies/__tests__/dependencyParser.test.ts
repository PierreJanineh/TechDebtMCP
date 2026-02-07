import { BaseDependencyParser, ParsedDependency, createDependencyParser, getAllParsers, getAllPackageFileNames } from '../index.js';

/**
 * Mock implementation of BaseDependencyParser for testing
 */
class MockDependencyParser extends BaseDependencyParser {
  constructor(ecosystem: string) {
    super(ecosystem);
  }

  canParse(filePath: string): boolean {
    return filePath.includes('mock');
  }

  async parse(filePath: string, content: string): Promise<ParsedDependency[]> {
    return [
      {
        name: 'mock-package',
        version: '1.0.0',
        isDev: false,
        source: filePath,
      },
    ];
  }

  getPackageFileNames(): string[] {
    return ['mock-package.json'];
  }
}

describe('BaseDependencyParser', () => {
  let parser: BaseDependencyParser;

  beforeEach(() => {
    parser = new MockDependencyParser('mock');
  });

  it('should create a parser with the correct ecosystem', () => {
    expect(parser.getEcosystem()).toBe('mock');
  });

  it('should implement canParse method', () => {
    expect(parser.canParse('mock-file.json')).toBe(true);
    expect(parser.canParse('other-file.json')).toBe(false);
  });

  it('should implement parse method', async () => {
    const content = '{}';
    const dependencies = await parser.parse('mock-file.json', content);

    expect(dependencies).toEqual([
      {
        name: 'mock-package',
        version: '1.0.0',
        isDev: false,
        source: 'mock-file.json',
      },
    ]);
  });

  it('should implement getPackageFileNames method', () => {
    const names = parser.getPackageFileNames();

    expect(names).toContain('mock-package.json');
    expect(Array.isArray(names)).toBe(true);
  });
});

describe('Dependency Parser Factory', () => {
  it('should return null for unknown file types', () => {
    const parser = createDependencyParser('unknown-file.xyz');
    expect(parser).toBeNull();
  });

  it('should recognize package.json', () => {
    // Will be implemented when NpmParser is created
    // const parser = createDependencyParser('package.json');
    // expect(parser).not.toBeNull();
    // expect(parser?.getEcosystem()).toBe('npm');
  });

  it('should recognize pom.xml (Maven)', () => {
    // Will be implemented when GradleParser is created
    // const parser = createDependencyParser('pom.xml');
    // expect(parser).not.toBeNull();
  });

  it('should recognize Cargo.toml (Rust)', () => {
    // Will be implemented when CargoParser is created
    // const parser = createDependencyParser('Cargo.toml');
    // expect(parser).not.toBeNull();
  });

  it('should recognize go.mod (Go)', () => {
    // Will be implemented when GoModParser is created
    // const parser = createDependencyParser('go.mod');
    // expect(parser).not.toBeNull();
  });

  it('should recognize composer.json (PHP)', () => {
    // Will be implemented when ComposerParser is created
    // const parser = createDependencyParser('composer.json');
    // expect(parser).not.toBeNull();
  });

  it('should recognize Gemfile (Ruby)', () => {
    // Will be implemented when BundlerParser is created
    // const parser = createDependencyParser('Gemfile');
    // expect(parser).not.toBeNull();
  });

  it('should recognize Package.swift (Swift)', () => {
    // Will be implemented when SwiftParser is created
    // const parser = createDependencyParser('Package.swift');
    // expect(parser).not.toBeNull();
  });

  it('should recognize packages.config (C#)', () => {
    // Will be implemented when NugetParser is created
    // const parser = createDependencyParser('packages.config');
    // expect(parser).not.toBeNull();
  });

  it('should recognize CMakeLists.txt (C/C++)', () => {
    // Will be implemented when CppParser is created
    // const parser = createDependencyParser('CMakeLists.txt');
    // expect(parser).not.toBeNull();
  });
});

describe('Dependency Parser Utilities', () => {
  it('should return empty array for all parsers when none are implemented', () => {
    const parsers = getAllParsers();
    expect(Array.isArray(parsers)).toBe(true);
    expect(parsers.length).toBe(0);
  });

  it('should return empty array for all package file names when no parsers are implemented', () => {
    const fileNames = getAllPackageFileNames();
    expect(Array.isArray(fileNames)).toBe(true);
    expect(fileNames.length).toBe(0);
  });

  it('should return unique file names from all parsers', () => {
    // Will be tested once parsers are implemented
    // This ensures no duplicate file names in the array
    const fileNames = getAllPackageFileNames();
    const uniqueNames = new Set(fileNames);
    expect(uniqueNames.size).toBe(fileNames.length);
  });
});

describe('ParsedDependency Interface', () => {
  it('should create a valid ParsedDependency object', () => {
    const dep: ParsedDependency = {
      name: 'lodash',
      version: '^4.17.21',
      isDev: false,
      source: 'package.json',
    };

    expect(dep.name).toBe('lodash');
    expect(dep.version).toBe('^4.17.21');
    expect(dep.isDev).toBe(false);
    expect(dep.source).toBe('package.json');
  });

  it('should support dev dependencies', () => {
    const dep: ParsedDependency = {
      name: 'jest',
      version: '^29.0.0',
      isDev: true,
      source: 'package.json',
    };

    expect(dep.isDev).toBe(true);
  });

  it('should support various version formats', () => {
    const versions = ['^4.17.21', '~1.0.0', '>=2.0.0', '1.0.0', '*'];

    versions.forEach(version => {
      const dep: ParsedDependency = {
        name: 'test-pkg',
        version,
        isDev: false,
        source: 'package.json',
      };
      expect(dep.version).toBe(version);
    });
  });

  it('should support various source file names', () => {
    const sources = [
      'package.json',
      'requirements.txt',
      'pom.xml',
      'Cargo.toml',
      'go.mod',
      'composer.json',
      'Gemfile',
    ];

    sources.forEach(source => {
      const dep: ParsedDependency = {
        name: 'test-pkg',
        version: '1.0.0',
        isDev: false,
        source,
      };
      expect(dep.source).toBe(source);
    });
  });
});

