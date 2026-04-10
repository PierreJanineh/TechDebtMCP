import { CppParser } from '../cppParser.js';
import { ParsedDependency } from '../baseParser.js';

describe('CppParser', () => {
  let parser: CppParser;

  beforeEach(() => {
    parser = new CppParser();
  });

  describe('canParse', () => {
    it('should recognize CMakeLists.txt', () => {
      expect(parser.canParse('CMakeLists.txt')).toBe(true);
      expect(parser.canParse('/path/to/CMakeLists.txt')).toBe(true);
    });

    it('should recognize conanfile formats', () => {
      expect(parser.canParse('conanfile.txt')).toBe(true);
      expect(parser.canParse('conanfile.py')).toBe(true);
    });

    it('should recognize vcpkg.json', () => {
      expect(parser.canParse('vcpkg.json')).toBe(true);
    });

    it('should reject unsupported files', () => {
      expect(parser.canParse('package.json')).toBe(false);
      expect(parser.canParse('CMakeLists.txt.in')).toBe(false);
    });
  });

  describe('getPackageFileNames', () => {
    it('should return all supported file names', () => {
      const names = parser.getPackageFileNames();
      expect(names).toContain('CMakeLists.txt');
      expect(names).toContain('conanfile.txt');
      expect(names).toContain('conanfile.py');
      expect(names).toContain('vcpkg.json');
    });
  });

  describe('parse - CMakeLists.txt', () => {
    it('should parse CMake find_package directives', async () => {
      const content = `cmake_minimum_required(VERSION 3.10)
project(MyProject)

find_package(Boost 1.70 REQUIRED)
find_package(OpenSSL REQUIRED)
find_package(Qt5 COMPONENTS Core Gui)`;

      const deps = await parser.parse('CMakeLists.txt', content);

      expect(deps.length).toBeGreaterThan(0);
    });
  });

  describe('parse - conanfile.txt', () => {
    it('should parse conanfile.txt', async () => {
      const content = `[requires]
boost/1.81.0
openssl/3.0.5
zlib/1.2.13`;

      const deps = await parser.parse('conanfile.txt', content);

      expect(deps.length).toBeGreaterThan(0);
      expect(deps.find(d => d.name === 'boost')).toBeDefined();
    });
  });

  describe('parse - vcpkg.json', () => {
    it('should parse vcpkg.json', async () => {
      const content = `{
  "name": "myapp",
  "version": "1.0",
  "dependencies": [
    "boost",
    "openssl",
    "zlib"
  ]
}`;

      const deps = await parser.parse('vcpkg.json', content);

      expect(deps.length).toBe(3);
      expect(deps[0]).toEqual({ name: 'boost', version: '*', isDev: false, source: 'vcpkg.json' });
      expect(deps[1]).toEqual({ name: 'openssl', version: '*', isDev: false, source: 'vcpkg.json' });
      expect(deps[2]).toEqual({ name: 'zlib', version: '*', isDev: false, source: 'vcpkg.json' });
    });

    it('should parse object-form vcpkg dependencies', async () => {
      const content = JSON.stringify({
        name: 'myapp',
        dependencies: [
          { name: 'boost', 'version>=': '1.70' },
          'zlib',
          { name: 'fmt', features: ['header-only'] },
        ],
      });

      const deps = await parser.parse('vcpkg.json', content);

      expect(deps.length).toBe(3);
      expect(deps[0]).toEqual({ name: 'boost', version: '*', isDev: false, source: 'vcpkg.json' });
      expect(deps[1]).toEqual({ name: 'zlib', version: '*', isDev: false, source: 'vcpkg.json' });
      expect(deps[2]).toEqual({ name: 'fmt', version: '*', isDev: false, source: 'vcpkg.json' });
    });

    it('should skip malformed vcpkg dependency entries', async () => {
      const content = JSON.stringify({
        name: 'myapp',
        dependencies: ['boost', 42, null, { noName: true }, 'zlib'],
      });

      const deps = await parser.parse('vcpkg.json', content);

      expect(deps.length).toBe(2);
      expect(deps[0]?.name).toBe('boost');
      expect(deps[1]?.name).toBe('zlib');
    });

    it('should skip empty and whitespace-only string entries', async () => {
      const content = JSON.stringify({
        name: 'myapp',
        dependencies: ['boost', '', '   ', 'zlib'],
      });

      const deps = await parser.parse('vcpkg.json', content);

      expect(deps.length).toBe(2);
      expect(deps[0]?.name).toBe('boost');
      expect(deps[1]?.name).toBe('zlib');
    });

    it('should skip object-form entries with empty or whitespace-only name', async () => {
      const content = JSON.stringify({
        name: 'myapp',
        dependencies: [
          { name: 'boost' },
          { name: '' },
          { name: '   ' },
          'zlib',
        ],
      });

      const deps = await parser.parse('vcpkg.json', content);

      expect(deps.length).toBe(2);
      expect(deps[0]?.name).toBe('boost');
      expect(deps[1]?.name).toBe('zlib');
    });

    it('should trim whitespace from valid string entries', async () => {
      const content = JSON.stringify({
        name: 'myapp',
        dependencies: [' boost ', 'zlib'],
      });

      const deps = await parser.parse('vcpkg.json', content);

      expect(deps.length).toBe(2);
      expect(deps[0]?.name).toBe('boost');
    });

    it('should return empty array for vcpkg.json with empty dependencies', async () => {
      const content = JSON.stringify({ name: 'myapp', dependencies: [] });

      const deps = await parser.parse('vcpkg.json', content);

      expect(deps).toEqual([]);
    });

    it('should return empty array for vcpkg.json with no dependencies key', async () => {
      const content = JSON.stringify({ name: 'myapp', version: '1.0' });

      const deps = await parser.parse('vcpkg.json', content);

      expect(deps).toEqual([]);
    });

    it('should return empty array for malformed JSON in vcpkg.json', async () => {
      const content = '{ not valid json ';

      const deps = await parser.parse('vcpkg.json', content);

      expect(deps).toEqual([]);
    });
  });

  describe('error handling', () => {
    it('should handle empty files', async () => {
      const content = '';
      const deps = await parser.parse('CMakeLists.txt', content);
      expect(Array.isArray(deps)).toBe(true);
    });

    it('should throw error when file cannot be parsed', async () => {
      await expect(parser.parse('package.json', 'content')).rejects.toThrow();
    });
  });

  describe('ecosystem', () => {
    it('should have cpp as ecosystem', () => {
      expect(parser.getEcosystem()).toBe('cpp');
    });
  });
});

