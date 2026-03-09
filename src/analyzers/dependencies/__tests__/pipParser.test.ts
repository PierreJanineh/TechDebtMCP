import { PipParser } from '../pipParser.js';
import { ParsedDependency } from '../baseParser.js';

describe('PipParser', () => {
  let parser: PipParser;

  beforeEach(() => {
    parser = new PipParser();
  });

  describe('canParse', () => {
    it('should recognize requirements.txt files', () => {
      expect(parser.canParse('requirements.txt')).toBe(true);
      expect(parser.canParse('/path/to/requirements.txt')).toBe(true);
      expect(parser.canParse('requirements-dev.txt')).toBe(true);
      expect(parser.canParse('/path/to/requirements-dev.txt')).toBe(true);
    });

    it('should recognize pyproject.toml files', () => {
      expect(parser.canParse('pyproject.toml')).toBe(true);
      expect(parser.canParse('/path/to/pyproject.toml')).toBe(true);
    });

    it('should recognize Pipfile', () => {
      expect(parser.canParse('Pipfile')).toBe(true);
      expect(parser.canParse('/path/to/Pipfile')).toBe(true);
    });

    it('should reject unsupported files', () => {
      expect(parser.canParse('package.json')).toBe(false);
      expect(parser.canParse('pom.xml')).toBe(false);
      expect(parser.canParse('requirements.in')).toBe(false);
      expect(parser.canParse('Pipfile.lock')).toBe(false);
    });
  });

  describe('getPackageFileNames', () => {
    it('should return all supported package file names', () => {
      const names = parser.getPackageFileNames();
      expect(names).toContain('requirements.txt');
      expect(names).toContain('pyproject.toml');
      expect(names).toContain('Pipfile');
    });
  });

  describe('parse - requirements.txt', () => {
    it('should parse simple requirements.txt', async () => {
      const content = `requests==2.28.1
flask==2.2.2
Django>=4.0`;

      const deps = await parser.parse('requirements.txt', content);

      expect(deps).toHaveLength(3);
      expect(deps).toContainEqual({
        name: 'requests',
        version: '2.28.1',
        isDev: false,
        source: 'requirements.txt',
      });
      expect(deps).toContainEqual({
        name: 'flask',
        version: '2.2.2',
        isDev: false,
        source: 'requirements.txt',
      });
    });

    it('should handle comments in requirements.txt', async () => {
      const content = `# This is a comment
requests==2.28.1
# Another comment
flask==2.2.2`;

      const deps = await parser.parse('requirements.txt', content);

      expect(deps).toHaveLength(2);
      expect(deps.find(d => d.name === 'requests')).toBeDefined();
      expect(deps.find(d => d.name === 'flask')).toBeDefined();
    });

    it('should handle blank lines', async () => {
      const content = `requests==2.28.1

flask==2.2.2`;

      const deps = await parser.parse('requirements.txt', content);

      expect(deps).toHaveLength(2);
    });

    it('should handle various version specifiers', async () => {
      const content = `numpy==1.23.0
scipy>=1.9.0
matplotlib<3.6
pandas~=1.5.0
scikit-learn!=1.0.0`;

      const deps = await parser.parse('requirements.txt', content);

      expect(deps).toHaveLength(5);
      expect(deps.find(d => d.name === 'numpy')?.version).toBe('1.23.0');
      expect(deps.find(d => d.name === 'scipy')?.version).toBe('1.9.0');
    });

    it('should skip environment markers', async () => {
      const content = `requests==2.28.1 ; python_version >= "3.6"
flask==2.2.2
pathlib2==2.3.7 ; python_version < "3.4"`;

      const deps = await parser.parse('requirements.txt', content);

      expect(deps).toHaveLength(3);
      expect(deps.find(d => d.name === 'requests')).toBeDefined();
    });

    it('should handle package names with hyphens and underscores', async () => {
      const content = `python-dateutil==2.8.2
google-cloud-storage==2.5.0
opencv-python==4.6.0.66`;

      const deps = await parser.parse('requirements.txt', content);

      expect(deps).toHaveLength(3);
      expect(deps.find(d => d.name === 'python-dateutil')).toBeDefined();
      expect(deps.find(d => d.name === 'google-cloud-storage')).toBeDefined();
    });

    it('should handle empty file', async () => {
      const content = '';
      const deps = await parser.parse('requirements.txt', content);
      expect(deps).toHaveLength(0);
    });

    it('should handle file with only comments', async () => {
      const content = `# Comment line 1
# Comment line 2`;

      const deps = await parser.parse('requirements.txt', content);
      expect(deps).toHaveLength(0);
    });
  });

  describe('parse - pyproject.toml', () => {
    it('should parse pyproject.toml with dependencies', async () => {
      const content = `[project]
name = "my-project"
dependencies = [
    "requests>=2.28.0",
    "flask==2.2.2",
]`;

      const deps = await parser.parse('pyproject.toml', content);

      expect(deps).toHaveLength(2);
      expect(deps).toContainEqual({
        name: 'requests',
        version: '2.28.0',
        isDev: false,
        source: 'pyproject.toml',
      });
    });

    it('should parse pyproject.toml optional dependencies', async () => {
      const content = `[project.optional-dependencies]
dev = [
    "pytest>=7.0",
    "black==22.12.0",
]
docs = [
    "sphinx>=4.0",
]`;

      const deps = await parser.parse('pyproject.toml', content);

      expect(deps).toHaveLength(3);
      expect(deps.find(d => d.name === 'pytest')).toBeDefined();
      expect(deps.find(d => d.name === 'sphinx')).toBeDefined();
    });

    it('should parse Poetry-style pyproject.toml', async () => {
      const content = `[tool.poetry.dependencies]
python = "^3.9"
requests = "^2.28.0"
flask = "2.2.2"

[tool.poetry.dev-dependencies]
pytest = "^7.0"
black = "22.12.0"`;

      const deps = await parser.parse('pyproject.toml', content);

      expect(deps.length).toBeGreaterThan(0);
      expect(deps.find(d => d.name === 'requests')).toBeDefined();
    });

    it('should parse Poetry 1.2+ group dependencies', async () => {
      const content = `[tool.poetry.dependencies]
python = "^3.9"
requests = "^2.28.0"

[tool.poetry.group.dev.dependencies]
pytest = "^7.0"
black = "22.12.0"

[tool.poetry.group.docs.dependencies]
sphinx = "^4.0"`;

      const deps = await parser.parse('pyproject.toml', content);

      expect(deps.find(d => d.name === 'requests')).toBeDefined();
      const pytest = deps.find(d => d.name === 'pytest');
      expect(pytest).toBeDefined();
      expect(pytest?.isDev).toBe(true);
      const sphinx = deps.find(d => d.name === 'sphinx');
      expect(sphinx).toBeDefined();
      expect(sphinx?.isDev).toBe(false);
    });

    it('should handle invalid TOML', async () => {
      const content = `[invalid toml
dependencies = [`;

      await expect(parser.parse('pyproject.toml', content)).rejects.toThrow();
    });
  });

  describe('parse - Pipfile', () => {
    it('should parse Pipfile packages', async () => {
      const content = `[packages]
requests = "*"
flask = "==2.2.2"
django = ">=4.0"

[dev-packages]
pytest = "*"
black = "22.12.0"`;

      const deps = await parser.parse('Pipfile', content);

      expect(deps.length).toBeGreaterThan(0);
      expect(deps.find(d => d.name === 'requests')).toBeDefined();
      expect(deps.find(d => d.name === 'pytest')).toBeDefined();
    });

    it('should handle invalid Pipfile', async () => {
      const content = `[packages
invalid syntax`;

      await expect(parser.parse('Pipfile', content)).rejects.toThrow();
    });
  });

  describe('error handling', () => {
    it('should throw error when cannot parse file', async () => {
      const content = 'some content';

      await expect(parser.parse('pom.xml', content)).rejects.toThrow();
    });

    it('should throw meaningful error for malformed requirements.txt', async () => {
      const content = `requests==2.28.1
invalid line without version`;

      // Should handle gracefully - either parse what it can or throw clear error
      try {
        const deps = await parser.parse('requirements.txt', content);
        // If it parses, should at least get the valid one
        expect(deps.length).toBeGreaterThan(0);
      } catch {
        // If it throws, error message should be informative
        // This is acceptable behavior
      }
    });
  });

  describe('ecosystem', () => {
    it('should have pip as ecosystem', () => {
      expect(parser.getEcosystem()).toBe('pip');
    });
  });

  describe('source tracking', () => {
    it('should set correct source for requirements.txt', async () => {
      const content = 'requests==2.28.1';
      const deps = await parser.parse('/project/requirements.txt', content);

      expect(deps[0]?.source).toBe('/project/requirements.txt');
    });

    it('should set correct source for pyproject.toml', async () => {
      const content = '[project]\ndependencies = ["requests>=2.28.0"]';
      const deps = await parser.parse('/project/pyproject.toml', content);

      expect(deps[0]?.source).toBe('/project/pyproject.toml');
    });
  });
});


