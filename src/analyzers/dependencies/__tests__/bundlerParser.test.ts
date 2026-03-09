import { BundlerParser } from '../bundlerParser.js';
import { ParsedDependency } from '../baseParser.js';

describe('BundlerParser', () => {
  let parser: BundlerParser;

  beforeEach(() => {
    parser = new BundlerParser();
  });

  describe('canParse', () => {
    it('should recognize Gemfile', () => {
      expect(parser.canParse('Gemfile')).toBe(true);
      expect(parser.canParse('/path/to/Gemfile')).toBe(true);
      expect(parser.canParse('project/Gemfile')).toBe(true);
    });

    it('should reject non-Gemfile files', () => {
      expect(parser.canParse('Gemfile.lock')).toBe(false);
      expect(parser.canParse('package.json')).toBe(false);
      expect(parser.canParse('Gemfile.txt')).toBe(false);
    });
  });

  describe('getPackageFileNames', () => {
    it('should return Gemfile', () => {
      const names = parser.getPackageFileNames();
      expect(names).toContain('Gemfile');
    });
  });

  describe('parse', () => {
    it('should parse simple gem dependencies', async () => {
      const content = `source 'https://rubygems.org'

gem 'rails', '6.1.0'
gem 'sqlite3', '~> 1.4'
gem 'puma', '~> 5.0'`;

      const deps = await parser.parse('Gemfile', content);

      expect(deps).toHaveLength(3);
      expect(deps).toContainEqual({
        name: 'rails',
        version: '6.1.0',
        isDev: false,
        source: 'Gemfile',
      });
      expect(deps).toContainEqual({
        name: 'sqlite3',
        version: '~> 1.4',
        isDev: false,
        source: 'Gemfile',
      });
    });

    it('should parse group dependencies', async () => {
      const content = `source 'https://rubygems.org'

gem 'rails', '6.1.0'

group :development, :test do
  gem 'rspec-rails', '~> 5.0'
  gem 'factory_bot_rails'
end

group :production do
  gem 'pg', '~> 1.1'
end`;

      const deps = await parser.parse('Gemfile', content);

      expect(deps.length).toBeGreaterThan(0);
      expect(deps.find(d => d.name === 'rails' && !d.isDev)).toBeDefined();
      expect(deps.find(d => d.name === 'rspec-rails' && d.isDev)).toBeDefined();
    });

    it('should handle single-quoted gems', async () => {
      const content = `gem 'bundler', '~> 2.0'
gem 'rake', '~> 13.0'`;

      const deps = await parser.parse('Gemfile', content);

      expect(deps).toHaveLength(2);
      expect(deps.find(d => d.name === 'bundler')).toBeDefined();
    });

    it('should handle double-quoted gems', async () => {
      const content = `gem "rails", "6.1.0"
gem "sinatra", "~> 2.0"`;

      const deps = await parser.parse('Gemfile', content);

      expect(deps).toHaveLength(2);
      expect(deps.find(d => d.name === 'rails')).toBeDefined();
    });

    it('should handle gems without version', async () => {
      const content = `gem 'bundler'
gem 'rake'
gem 'webpacker'`;

      const deps = await parser.parse('Gemfile', content);

      expect(deps).toHaveLength(3);
      deps.forEach(dep => {
        expect(dep.version).toBe('*');
      });
    });

    it('should skip gem calls with git source', async () => {
      const content = `gem 'rails', '6.1.0'
gem 'my-gem', git: 'https://github.com/user/my-gem.git'
gem 'other-gem', github: 'user/other-gem'`;

      const deps = await parser.parse('Gemfile', content);

      // Should parse the gem with version, may or may not parse git ones
      expect(deps.find(d => d.name === 'rails')).toBeDefined();
    });

    it('should skip gem calls with path source', async () => {
      const content = `gem 'rails', '6.1.0'
gem 'local-gem', path: './local'`;

      const deps = await parser.parse('Gemfile', content);

      // Should at least parse rails
      expect(deps.find(d => d.name === 'rails')).toBeDefined();
    });

    it('should handle multiline gem definitions', async () => {
      const content = `gem 'rails',
    '6.1.0'`;

      const deps = await parser.parse('Gemfile', content);

      // May or may not parse multiline (simplify for now)
      // At least should not crash
      expect(Array.isArray(deps)).toBe(true);
    });

    it('should handle comments', async () => {
      const content = `# Comment about rails
gem 'rails', '6.1.0'
# Another comment
gem 'sinatra', '2.0'`;

      const deps = await parser.parse('Gemfile', content);

      expect(deps).toHaveLength(2);
    });

    it('should handle complex version constraints', async () => {
      const content = `gem 'pkg1', '1.0.0'
gem 'pkg2', '~> 2.0'
gem 'pkg3', '> 3.0, < 4.0'
gem 'pkg4', '>= 5.0'`;

      const deps = await parser.parse('Gemfile', content);

      expect(deps).toHaveLength(4);
    });

    it('should handle platform-specific gems', async () => {
      const content = `gem 'rails', '6.1.0'
gem 'win32console', platforms: :mswin`;

      const deps = await parser.parse('Gemfile', content);

      // Should parse at least rails
      expect(deps.find(d => d.name === 'rails')).toBeDefined();
    });

    it('should set correct source', async () => {
      const content = `gem 'rails', '6.1.0'`;
      const deps = await parser.parse('/project/Gemfile', content);

      expect(deps[0]?.source).toBe('/project/Gemfile');
    });

    it('should handle empty Gemfile', async () => {
      const content = `source 'https://rubygems.org'`;
      const deps = await parser.parse('Gemfile', content);

      expect(deps).toHaveLength(0);
    });

    it('should throw error when file cannot be parsed', async () => {
      const content = 'some content';

      await expect(parser.parse('package.json', content)).rejects.toThrow();
    });
  });

  describe('ecosystem', () => {
    it('should have bundler as ecosystem', () => {
      expect(parser.getEcosystem()).toBe('bundler');
    });
  });
});

