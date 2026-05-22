import { ComposerParser } from '../composerParser.js';

describe('ComposerParser', () => {
  let parser: ComposerParser;

  beforeEach(() => {
    parser = new ComposerParser();
  });

  describe('canParse', () => {
    it('should recognize composer.json files', () => {
      expect(parser.canParse('composer.json')).toBe(true);
      expect(parser.canParse('/path/to/composer.json')).toBe(true);
      expect(parser.canParse('project/composer.json')).toBe(true);
    });

    it('should reject non-composer.json files', () => {
      expect(parser.canParse('composer.lock')).toBe(false);
      expect(parser.canParse('package.json')).toBe(false);
      expect(parser.canParse('composer.yaml')).toBe(false);
    });
  });

  describe('getPackageFileNames', () => {
    it('should return composer.json', () => {
      const names = parser.getPackageFileNames();
      expect(names).toContain('composer.json');
    });
  });

  describe('parse', () => {
    it('should parse simple require dependencies', async () => {
      const content = JSON.stringify({
        require: {
          'monolog/monolog': '^2.0',
          'symfony/console': '~5.4|^6.0',
        },
      });

      const deps = await parser.parse('composer.json', content);

      expect(deps).toHaveLength(2);
      expect(deps).toContainEqual({
        name: 'monolog/monolog',
        version: '^2.0',
        isDev: false,
        source: 'composer.json',
      });
      expect(deps).toContainEqual({
        name: 'symfony/console',
        version: '~5.4|^6.0',
        isDev: false,
        source: 'composer.json',
      });
    });

    it('should parse require-dev dependencies', async () => {
      const content = JSON.stringify({
        'require-dev': {
          'phpunit/phpunit': '^9.5',
          'squizlabs/php_codesniffer': '*',
        },
      });

      const deps = await parser.parse('composer.json', content);

      expect(deps).toHaveLength(2);
      expect(deps).toContainEqual({
        name: 'phpunit/phpunit',
        version: '^9.5',
        isDev: true,
        source: 'composer.json',
      });
      expect(deps).toContainEqual({
        name: 'squizlabs/php_codesniffer',
        version: '*',
        isDev: true,
        source: 'composer.json',
      });
    });

    it('should parse both require and require-dev', async () => {
      const content = JSON.stringify({
        require: {
          'monolog/monolog': '^2.0',
        },
        'require-dev': {
          'phpunit/phpunit': '^9.5',
        },
      });

      const deps = await parser.parse('composer.json', content);

      expect(deps).toHaveLength(2);
      const prodDeps = deps.filter(d => !d.isDev);
      const devDeps = deps.filter(d => d.isDev);

      expect(prodDeps).toHaveLength(1);
      expect(prodDeps[0]?.name).toBe('monolog/monolog');
      expect(devDeps).toHaveLength(1);
      expect(devDeps[0]?.name).toBe('phpunit/phpunit');
    });

    it('should handle various version formats', async () => {
      const content = JSON.stringify({
        require: {
          'pkg-exact': '1.0.0',
          'pkg-caret': '^1.0',
          'pkg-tilde': '~1.0',
          'pkg-range': '>=1.0 <2.0',
          'pkg-multiple': '1.0 || 2.0',
          'pkg-wildcard': '1.0.*',
          'pkg-any': '*',
          'pkg-next': '@next',
          'pkg-dev': '@dev',
        },
      });

      const deps = await parser.parse('composer.json', content);

      expect(deps).toHaveLength(9);
      expect(deps.find(d => d.name === 'pkg-exact')?.version).toBe('1.0.0');
      expect(deps.find(d => d.name === 'pkg-caret')?.version).toBe('^1.0');
      expect(deps.find(d => d.name === 'pkg-any')?.version).toBe('*');
    });

    it('should handle empty dependencies', async () => {
      const content = JSON.stringify({
        name: 'my-package',
        description: 'My package',
      });

      const deps = await parser.parse('composer.json', content);

      expect(deps).toHaveLength(0);
    });

    it('should handle vendor/package-name format', async () => {
      const content = JSON.stringify({
        require: {
          'symfony/console': '^6.0',
          'doctrine/orm': '^2.10',
          'laravel/framework': '^9.0',
          'guzzlehttp/guzzle': '^7.0',
        },
      });

      const deps = await parser.parse('composer.json', content);

      expect(deps).toHaveLength(4);
      expect(deps.map(d => d.name)).toEqual([
        'symfony/console',
        'doctrine/orm',
        'laravel/framework',
        'guzzlehttp/guzzle',
      ]);
    });

    it('should handle PHP version requirements', async () => {
      const content = JSON.stringify({
        require: {
          'php': '>=7.4',
          'monolog/monolog': '^2.0',
        },
      });

      const deps = await parser.parse('composer.json', content);

      expect(deps).toHaveLength(2);
      expect(deps.find(d => d.name === 'php')).toBeDefined();
    });

    it('should throw error for invalid JSON', async () => {
      const content = 'not valid json {';

      await expect(parser.parse('composer.json', content)).rejects.toThrow();
    });

    it('should throw error when file cannot be parsed', async () => {
      const content = 'some content';

      await expect(parser.parse('package.json', content)).rejects.toThrow();
    });

    it('should set correct source in parsed dependencies', async () => {
      const content = JSON.stringify({
        require: {
          'monolog/monolog': '^2.0',
        },
      });

      const deps = await parser.parse('/project/composer.json', content);

      expect(deps[0]?.source).toBe('/project/composer.json');
    });

    it('should handle complex version constraints', async () => {
      const content = JSON.stringify({
        require: {
          'stable-lib': 'v1.0.0',
          'pre-release': 'v2.0.0-beta',
          'with-stability': '^1.0@stable',
          'any-stable': '*@stable',
        },
      });

      const deps = await parser.parse('composer.json', content);

      expect(deps).toHaveLength(4);
    });
  });

  describe('ecosystem', () => {
    it('should have composer as ecosystem', () => {
      expect(parser.getEcosystem()).toBe('composer');
    });
  });
});

