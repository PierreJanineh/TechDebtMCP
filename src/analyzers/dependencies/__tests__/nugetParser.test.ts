import { NugetParser } from '../nugetParser.js';

describe('NugetParser', () => {
  let parser: NugetParser;

  beforeEach(() => {
    parser = new NugetParser();
  });

  describe('canParse', () => {
    it('should recognize .csproj files', () => {
      expect(parser.canParse('MyProject.csproj')).toBe(true);
      expect(parser.canParse('/path/to/Project.csproj')).toBe(true);
    });

    it('should recognize packages.config', () => {
      expect(parser.canParse('packages.config')).toBe(true);
      expect(parser.canParse('/path/to/packages.config')).toBe(true);
    });

    it('should recognize Directory.Build.props', () => {
      expect(parser.canParse('Directory.Build.props')).toBe(true);
    });

    it('should reject unsupported files', () => {
      expect(parser.canParse('package.json')).toBe(false);
      expect(parser.canParse('app.config')).toBe(false);
    });
  });

  describe('getPackageFileNames', () => {
    it('should return all supported file names', () => {
      const names = parser.getPackageFileNames();
      expect(names).toContain('packages.config');
      expect(names).toContain('Directory.Build.props');
    });
  });

  describe('parse - packages.config', () => {
    it('should parse packages.config', async () => {
      const content = `<?xml version="1.0" encoding="utf-8"?>
<packages>
  <package id="Newtonsoft.Json" version="13.0.1" targetFramework="net461" />
  <package id="EntityFramework" version="6.4.4" targetFramework="net461" />
</packages>`;

      const deps = await parser.parse('packages.config', content);

      expect(deps).toContainEqual({
        name: 'Newtonsoft.Json',
        version: '13.0.1',
        isDev: false,
        source: 'packages.config',
      });
    });
  });

  describe('parse - .csproj', () => {
    it('should parse package references from csproj', async () => {
      const content = `<Project Sdk="Microsoft.NET.Sdk">
  <ItemGroup>
    <PackageReference Include="Newtonsoft.Json" Version="13.0.1" />
    <PackageReference Include="xunit" Version="2.4.1" />
  </ItemGroup>
</Project>`;

      const deps = await parser.parse('Project.csproj', content);

      expect(deps.length).toBeGreaterThan(0);
      expect(deps.find(d => d.name === 'Newtonsoft.Json')).toBeDefined();
    });
  });

  describe('error handling', () => {
    it('should handle empty files', async () => {
      const content = '';
      const deps = await parser.parse('packages.config', content);
      expect(Array.isArray(deps)).toBe(true);
    });

    it('should throw error when file cannot be parsed', async () => {
      await expect(parser.parse('package.json', 'content')).rejects.toThrow();
    });
  });

  describe('ecosystem', () => {
    it('should have nuget as ecosystem', () => {
      expect(parser.getEcosystem()).toBe('nuget');
    });
  });
});

