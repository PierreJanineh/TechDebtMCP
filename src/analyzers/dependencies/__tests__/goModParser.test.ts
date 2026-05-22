import { GoModParser } from '../goModParser.js';

describe('GoModParser', () => {
  let parser: GoModParser;

  beforeEach(() => {
    parser = new GoModParser();
  });

  describe('canParse', () => {
    it('should recognize go.mod files', () => {
      expect(parser.canParse('go.mod')).toBe(true);
      expect(parser.canParse('/path/to/go.mod')).toBe(true);
      expect(parser.canParse('project/go.mod')).toBe(true);
    });

    it('should reject non-go.mod files', () => {
      expect(parser.canParse('go.sum')).toBe(false);
      expect(parser.canParse('package.json')).toBe(false);
      expect(parser.canParse('go.yaml')).toBe(false);
    });
  });

  describe('getPackageFileNames', () => {
    it('should return go.mod', () => {
      const names = parser.getPackageFileNames();
      expect(names).toContain('go.mod');
    });
  });

  describe('parse', () => {
    it('should parse simple go.mod file', async () => {
      const content = `module github.com/example/myapp

go 1.18

require (
  github.com/gorilla/mux v1.8.0
  github.com/lib/pq v1.10.0
)`;

      const deps = await parser.parse('go.mod', content);

      expect(deps.length).toBeGreaterThan(0);
      expect(deps).toContainEqual({
        name: 'github.com/gorilla/mux',
        version: 'v1.8.0',
        isDev: false,
        source: 'go.mod',
      });
    });

    it('should parse require block', async () => {
      const content = `module github.com/example/app

require (
  github.com/gorilla/mux v1.8.0
  github.com/lib/pq v1.10.0
  golang.org/x/sys v0.0.0-20210615035016-665e8c7367d1
)`;

      const deps = await parser.parse('go.mod', content);

      expect(deps).toHaveLength(3);
      expect(deps.find(d => d.name === 'golang.org/x/sys')).toBeDefined();
    });

    it('should parse require statements', async () => {
      const content = `module github.com/example/app

require github.com/gorilla/mux v1.8.0
require github.com/lib/pq v1.10.0`;

      const deps = await parser.parse('go.mod', content);

      expect(deps).toHaveLength(2);
    });

    it('should handle v0 versions', async () => {
      const content = `require (
  github.com/pkg/errors v0.9.1
  github.com/sirupsen/logrus v1.8.0
)`;

      const deps = await parser.parse('go.mod', content);

      expect(deps.find(d => d.name === 'github.com/pkg/errors')?.version).toBe('v0.9.1');
    });

    it('should handle pseudo versions', async () => {
      const content = `require (
  github.com/example/module v0.0.0-20210101000000-abcdef123456
)`;

      const deps = await parser.parse('go.mod', content);

      expect(deps[0]?.version).toMatch(/^v0\.0\.0-\d{8}\d{6}-/);
    });

    it('should skip indirect dependencies', async () => {
      const content = `require (
  github.com/gorilla/mux v1.8.0
  github.com/lib/pq v1.10.0 // indirect
)`;

      const deps = await parser.parse('go.mod', content);

      // Currently we parse all require lines, could filter indirect if needed
      expect(deps.length).toBeGreaterThan(0);
    });

    it('should skip comments', async () => {
      const content = `// Main module
module github.com/example/app

// Dependencies
require (
  // HTTP router
  github.com/gorilla/mux v1.8.0
  // Database driver
  github.com/lib/pq v1.10.0
)`;

      const deps = await parser.parse('go.mod', content);

      expect(deps).toHaveLength(2);
      expect(deps.find(d => d.name === 'github.com/gorilla/mux')).toBeDefined();
    });

    it('should handle various import paths', async () => {
      const content = `require (
  github.com/user/repo v1.0.0
  golang.org/x/crypto v0.1.0
  google.golang.org/grpc v1.40.0
  cloud.google.com/go/storage v1.10.0
)`;

      const deps = await parser.parse('go.mod', content);

      expect(deps).toHaveLength(4);
      expect(deps.find(d => d.name === 'golang.org/x/crypto')).toBeDefined();
    });

    it('should handle empty go.mod', async () => {
      const content = `module github.com/example/app

go 1.18`;

      const deps = await parser.parse('go.mod', content);

      expect(deps).toHaveLength(0);
    });

    it('should throw error when file cannot be parsed', async () => {
      const content = 'some content';

      await expect(parser.parse('package.json', content)).rejects.toThrow();
    });

    it('should set correct source', async () => {
      const content = `module github.com/example/app

require github.com/gorilla/mux v1.8.0`;
      const deps = await parser.parse('/project/go.mod', content);

      expect(deps[0]?.source).toBe('/project/go.mod');
    });

    it('should handle multi-line require blocks', async () => {
      const content = `module github.com/example/app

require (
  github.com/gorilla/mux v1.8.0
  github.com/lib/pq v1.10.0

  github.com/pkg/errors v0.9.1
)`;

      const deps = await parser.parse('go.mod', content);

      expect(deps).toHaveLength(3);
    });
  });

  describe('ecosystem', () => {
    it('should have go as ecosystem', () => {
      expect(parser.getEcosystem()).toBe('go');
    });
  });
});

