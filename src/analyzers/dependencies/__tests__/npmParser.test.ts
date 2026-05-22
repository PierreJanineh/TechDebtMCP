import { NpmParser } from '../npmParser.js';

describe('NpmParser', () => {
  let parser: NpmParser;

  beforeEach(() => {
    parser = new NpmParser();
  });

  describe('canParse', () => {
    it('should recognize package.json files', () => {
      expect(parser.canParse('package.json')).toBe(true);
      expect(parser.canParse('/path/to/package.json')).toBe(true);
      expect(parser.canParse('packages/module/package.json')).toBe(true);
    });

    it('should reject non-package.json files', () => {
      expect(parser.canParse('package-lock.json')).toBe(false);
      expect(parser.canParse('package.txt')).toBe(false);
      expect(parser.canParse('pom.xml')).toBe(false);
      expect(parser.canParse('requirements.txt')).toBe(false);
    });
  });

  describe('getPackageFileNames', () => {
    it('should return package.json', () => {
      const names = parser.getPackageFileNames();
      expect(names).toContain('package.json');
    });
  });

  describe('parse', () => {
    it('should parse simple dependencies', async () => {
      const content = JSON.stringify({
        dependencies: {
          lodash: '^4.17.21',
          express: '^4.18.0',
        },
      });

      const deps = await parser.parse('package.json', content);

      expect(deps).toHaveLength(2);
      expect(deps).toContainEqual({
        name: 'lodash',
        version: '^4.17.21',
        isDev: false,
        source: 'package.json',
      });
      expect(deps).toContainEqual({
        name: 'express',
        version: '^4.18.0',
        isDev: false,
        source: 'package.json',
      });
    });

    it('should parse devDependencies', async () => {
      const content = JSON.stringify({
        devDependencies: {
          jest: '^29.0.0',
          typescript: '^5.0.0',
        },
      });

      const deps = await parser.parse('package.json', content);

      expect(deps).toHaveLength(2);
      expect(deps).toContainEqual({
        name: 'jest',
        version: '^29.0.0',
        isDev: true,
        source: 'package.json',
      });
      expect(deps).toContainEqual({
        name: 'typescript',
        version: '^5.0.0',
        isDev: true,
        source: 'package.json',
      });
    });

    it('should parse both dependencies and devDependencies', async () => {
      const content = JSON.stringify({
        dependencies: {
          react: '^18.0.0',
        },
        devDependencies: {
          jest: '^29.0.0',
        },
      });

      const deps = await parser.parse('package.json', content);

      expect(deps).toHaveLength(2);
      const prodDeps = deps.filter(d => !d.isDev);
      const devDeps = deps.filter(d => d.isDev);

      expect(prodDeps).toHaveLength(1);
      expect(prodDeps[0]?.name).toBe('react');
      expect(devDeps).toHaveLength(1);
      expect(devDeps[0]?.name).toBe('jest');
    });

    it('should handle optional peerDependencies', async () => {
      const content = JSON.stringify({
        dependencies: {
          lodash: '^4.17.21',
        },
        peerDependencies: {
          react: '>=16.0.0',
        },
      });

      const deps = await parser.parse('package.json', content);

      expect(deps).toHaveLength(2);
      expect(deps).toContainEqual({
        name: 'react',
        version: '>=16.0.0',
        isDev: false,
        source: 'package.json',
      });
    });

    it('should handle empty dependencies', async () => {
      const content = JSON.stringify({
        name: 'empty-package',
        version: '1.0.0',
      });

      const deps = await parser.parse('package.json', content);

      expect(deps).toHaveLength(0);
    });

    it('should handle various version formats', async () => {
      const content = JSON.stringify({
        dependencies: {
          'pkg-caret': '^1.2.3',
          'pkg-tilde': '~1.2.3',
          'pkg-range': '>=1.0.0 <2.0.0',
          'pkg-exact': '1.2.3',
          'pkg-star': '*',
          'pkg-latest': 'latest',
          'pkg-git': 'git://github.com/user/repo.git#commit-ish',
        },
      });

      const deps = await parser.parse('package.json', content);

      expect(deps).toHaveLength(7);
      expect(deps.find(d => d.name === 'pkg-caret')?.version).toBe('^1.2.3');
      expect(deps.find(d => d.name === 'pkg-tilde')?.version).toBe('~1.2.3');
      expect(deps.find(d => d.name === 'pkg-star')?.version).toBe('*');
    });

    it('should handle scoped packages', async () => {
      const content = JSON.stringify({
        dependencies: {
          '@angular/core': '^14.0.0',
          '@babel/core': '^7.20.0',
          '@types/node': '^18.0.0',
        },
      });

      const deps = await parser.parse('package.json', content);

      expect(deps).toHaveLength(3);
      expect(deps.find(d => d.name === '@angular/core')).toBeDefined();
      expect(deps.find(d => d.name === '@babel/core')).toBeDefined();
    });

    it('should throw error for invalid JSON', async () => {
      const content = 'not valid json {';

      await expect(parser.parse('package.json', content)).rejects.toThrow();
    });

    it('should throw error when file cannot be parsed', async () => {
      const content = 'some content';

      await expect(parser.parse('pom.xml', content)).rejects.toThrow();
    });

    it('should handle package.json with nested packages', async () => {
      const content = JSON.stringify({
        dependencies: {
          react: '^18.0.0',
        },
        optionalDependencies: {
          fsevents: '^2.0.0',
        },
      });

      const deps = await parser.parse('package.json', content);

      expect(deps).toHaveLength(2);
      expect(deps.find(d => d.name === 'fsevents')).toBeDefined();
    });

    it('should set correct source in parsed dependencies', async () => {
      const content = JSON.stringify({
        dependencies: {
          lodash: '^4.17.21',
        },
      });

      const deps = await parser.parse('/path/to/package.json', content);

      expect(deps[0]?.source).toBe('/path/to/package.json');
    });
  });

  describe('ecosystem', () => {
    it('should have npm as ecosystem', () => {
      expect(parser.getEcosystem()).toBe('npm');
    });
  });
});

