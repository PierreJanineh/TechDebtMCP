import { SwiftPackageParser } from '../swiftPackageParser.js';
import { ParsedDependency } from '../baseParser.js';

describe('SwiftPackageParser', () => {
  let parser: SwiftPackageParser;

  beforeEach(() => {
    parser = new SwiftPackageParser();
  });

  describe('canParse', () => {
    it('should recognize Package.swift files', () => {
      expect(parser.canParse('Package.swift')).toBe(true);
      expect(parser.canParse('/path/to/Package.swift')).toBe(true);
    });

    it('should recognize Podfile', () => {
      expect(parser.canParse('Podfile')).toBe(true);
      expect(parser.canParse('/path/to/Podfile')).toBe(true);
    });

    it('should recognize Cartfile', () => {
      expect(parser.canParse('Cartfile')).toBe(true);
      expect(parser.canParse('/path/to/Cartfile')).toBe(true);
    });

    it('should reject unsupported files', () => {
      expect(parser.canParse('package.json')).toBe(false);
      expect(parser.canParse('Podfile.lock')).toBe(false);
    });
  });

  describe('getPackageFileNames', () => {
    it('should return all supported package file names', () => {
      const names = parser.getPackageFileNames();
      expect(names).toContain('Package.swift');
      expect(names).toContain('Podfile');
      expect(names).toContain('Cartfile');
    });
  });

  describe('parse - Package.swift', () => {
    it('should parse simple Swift package dependencies', async () => {
      const content = `
let package = Package(
  name: "MyPackage",
  dependencies: [
    .package(url: "https://github.com/Alamofire/Alamofire.git", from: "5.0.0"),
    .package(url: "https://github.com/SwiftyJSON/SwiftyJSON.git", .upToNextMajor(from: "5.0.0")),
  ]
)`;

      const deps = await parser.parse('Package.swift', content);

      expect(deps.length).toBeGreaterThan(0);
      expect(deps.find(d => d.name.includes('Alamofire'))).toBeDefined();
    });

    it('should handle version constraints', async () => {
      const content = `
let package = Package(
  name: "MyApp",
  dependencies: [
    .package(url: "https://github.com/example/lib.git", from: "1.0.0"),
  ]
)`;

      const deps = await parser.parse('Package.swift', content);

      expect(deps.length).toBeGreaterThan(0);
    });
  });

  describe('parse - Podfile', () => {
    it('should parse simple Podfile', async () => {
      const content = `
target 'MyApp' do
  pod 'Alamofire', '~> 5.0'
  pod 'SwiftyJSON'
  pod 'Realm', '~> 10.0'
end`;

      const deps = await parser.parse('Podfile', content);

      expect(deps.length).toBeGreaterThan(0);
      expect(deps.find(d => d.name === 'Alamofire')).toBeDefined();
    });

    it('should handle multiple targets', async () => {
      const content = `
target 'MyApp' do
  pod 'Alamofire', '~> 5.0'
end

target 'MyAppTests' do
  pod 'XCTest'
end`;

      const deps = await parser.parse('Podfile', content);

      expect(deps.length).toBeGreaterThan(0);
    });
  });

  describe('parse - Cartfile', () => {
    it('should parse simple Cartfile', async () => {
      const content = `
github "Alamofire/Alamofire" ~> 5.0
github "SwiftyJSON/SwiftyJSON" >= 5.0
github "realm/realm-swift" == 10.5.0`;

      const deps = await parser.parse('Cartfile', content);

      expect(deps.length).toBeGreaterThan(0);
      expect(deps.find(d => d.name.includes('Alamofire'))).toBeDefined();
    });

    it('should handle git and binary dependencies', async () => {
      const content = `
github "user/repo" >= 1.0
git "https://example.com/repo.git" "main"
binary "https://example.com/framework.json" ~> 2.0`;

      const deps = await parser.parse('Cartfile', content);

      expect(Array.isArray(deps)).toBe(true);
    });
  });

  describe('error handling', () => {
    it('should throw error when file cannot be parsed', async () => {
      const content = 'some content';

      await expect(parser.parse('package.json', content)).rejects.toThrow();
    });

    it('should handle empty files', async () => {
      const content = '';
      const deps = await parser.parse('Package.swift', content);

      expect(Array.isArray(deps)).toBe(true);
    });
  });

  describe('ecosystem', () => {
    it('should have swift as ecosystem', () => {
      expect(parser.getEcosystem()).toBe('swift');
    });
  });
});

