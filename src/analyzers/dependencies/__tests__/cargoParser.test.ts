import { CargoParser } from '../cargoParser.js';

describe('CargoParser', () => {
  let parser: CargoParser;

  beforeEach(() => {
    parser = new CargoParser();
  });

  describe('canParse', () => {
    it('should recognize Cargo.toml files', () => {
      expect(parser.canParse('Cargo.toml')).toBe(true);
      expect(parser.canParse('/path/to/Cargo.toml')).toBe(true);
      expect(parser.canParse('project/Cargo.toml')).toBe(true);
    });

    it('should reject non-Cargo.toml files', () => {
      expect(parser.canParse('Cargo.lock')).toBe(false);
      expect(parser.canParse('package.json')).toBe(false);
      expect(parser.canParse('Cargo.yaml')).toBe(false);
    });
  });

  describe('getPackageFileNames', () => {
    it('should return Cargo.toml', () => {
      const names = parser.getPackageFileNames();
      expect(names).toContain('Cargo.toml');
    });
  });

  describe('parse', () => {
    it('should parse simple dependencies', async () => {
      const content = `[package]
name = "my-project"
version = "0.1.0"

[dependencies]
serde = "1.0"
tokio = { version = "1.0", features = ["full"] }
regex = "1.5"`;

      const deps = await parser.parse('Cargo.toml', content);

      expect(deps.length).toBeGreaterThan(0);
      expect(deps).toContainEqual({
        name: 'serde',
        version: '1.0',
        isDev: false,
        source: 'Cargo.toml',
      });
      expect(deps.find(d => d.name === 'tokio')).toBeDefined();
    });

    it('should parse dev-dependencies', async () => {
      const content = `[package]
name = "my-project"

[dev-dependencies]
criterion = "0.3"
assert_cmd = "2.0"`;

      const deps = await parser.parse('Cargo.toml', content);

      const devDeps = deps.filter(d => d.isDev);
      expect(devDeps.length).toBeGreaterThan(0);
      expect(devDeps.find(d => d.name === 'criterion')).toBeDefined();
    });

    it('should parse both dependencies and dev-dependencies', async () => {
      const content = `[dependencies]
serde = "1.0"

[dev-dependencies]
criterion = "0.3"`;

      const deps = await parser.parse('Cargo.toml', content);

      const prodDeps = deps.filter(d => !d.isDev);
      const devDeps = deps.filter(d => d.isDev);

      expect(prodDeps.length).toBeGreaterThan(0);
      expect(devDeps.length).toBeGreaterThan(0);
    });

    it('should handle inline table dependencies', async () => {
      const content = `[dependencies]
tokio = { version = "1.0", features = ["full"] }
serde = { version = "1.0", features = ["derive"] }
regex = { version = "1.5", optional = true }`;

      const deps = await parser.parse('Cargo.toml', content);

      expect(deps.find(d => d.name === 'tokio')).toBeDefined();
      expect(deps.find(d => d.name === 'serde')).toBeDefined();
    });

    it('should handle array of dependencies', async () => {
      const content = `[dependencies]
serde = [
  { version = "1.0", optional = true },
]`;

      const deps = await parser.parse('Cargo.toml', content);

      // Should handle array format gracefully
      expect(Array.isArray(deps)).toBe(true);
    });

    it('should handle optional dependencies', async () => {
      const content = `[dependencies]
serde = { version = "1.0", optional = true }
tokio = "1.0"

[features]
default = ["serde"]
serde = ["dep:serde"]`;

      const deps = await parser.parse('Cargo.toml', content);

      expect(deps.find(d => d.name === 'serde')).toBeDefined();
      expect(deps.find(d => d.name === 'tokio')).toBeDefined();
    });

    it('should handle build dependencies', async () => {
      const content = `[build-dependencies]
cc = "1.0"
bindgen = "0.59"`;

      const deps = await parser.parse('Cargo.toml', content);

      const buildDeps = deps.filter(d => d.isDev);
      expect(buildDeps.length).toBeGreaterThan(0);
    });

    it('should handle various version formats', async () => {
      const content = `[dependencies]
pkg1 = "1.0"
pkg2 = "^1.0"
pkg3 = "~1.0"
pkg4 = ">=1.0"
pkg5 = "1.0.*"
pkg6 = "*"`;

      const deps = await parser.parse('Cargo.toml', content);

      expect(deps).toHaveLength(6);
      expect(deps.find(d => d.name === 'pkg1')?.version).toBe('1.0');
      expect(deps.find(d => d.name === 'pkg6')?.version).toBe('*');
    });

    it('should handle workspace dependencies', async () => {
      const content = `[workspace]
members = ["crates/one", "crates/two"]

[dependencies]
one = { path = "crates/one" }
serde = "1.0"`;

      const deps = await parser.parse('Cargo.toml', content);

      // Should have at least serde
      expect(deps.find(d => d.name === 'serde')).toBeDefined();
    });

    it('should throw error for invalid TOML', async () => {
      const content = `[invalid toml
dependencies = [`;

      await expect(parser.parse('Cargo.toml', content)).rejects.toThrow();
    });

    it('should throw error when file cannot be parsed', async () => {
      const content = 'some content';

      await expect(parser.parse('pom.xml', content)).rejects.toThrow();
    });

    it('should set correct source', async () => {
      const content = `[dependencies]
serde = "1.0"`;
      const deps = await parser.parse('/project/Cargo.toml', content);

      expect(deps[0]?.source).toBe('/project/Cargo.toml');
    });

    it('should handle empty dependencies', async () => {
      const content = `[package]
name = "my-project"`;
      const deps = await parser.parse('Cargo.toml', content);

      expect(deps).toHaveLength(0);
    });
  });

  describe('ecosystem', () => {
    it('should have cargo as ecosystem', () => {
      expect(parser.getEcosystem()).toBe('cargo');
    });
  });
});

