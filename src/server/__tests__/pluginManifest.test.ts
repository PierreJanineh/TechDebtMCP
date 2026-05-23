import { readFileSync } from 'node:fs';
import { join } from 'node:path';

interface PluginManifest {
  name: string;
  version: string;
  mcpServers: Record<string, { command: string; args: string[] }>;
}

interface MarketplaceManifest {
  name: string;
  version: string;
  plugins: Array<{ name: string; version?: string }>;
}

const REPO_ROOT = join(__dirname, '..', '..', '..');
const PLUGIN_PATH = join(REPO_ROOT, '.claude-plugin', 'plugin.json');
const MARKETPLACE_PATH = join(REPO_ROOT, '.claude-plugin', 'marketplace.json');
const PACKAGE_PATH = join(REPO_ROOT, 'package.json');

const plugin = JSON.parse(readFileSync(PLUGIN_PATH, 'utf8')) as PluginManifest;
const marketplace = JSON.parse(readFileSync(MARKETPLACE_PATH, 'utf8')) as MarketplaceManifest;
const pkg = JSON.parse(readFileSync(PACKAGE_PATH, 'utf8')) as { version: string; name: string };

describe('.claude-plugin/plugin.json', () => {
  it('version tracks package.json', () => {
    expect(plugin.version).toBe(pkg.version);
  });

  it('name matches the npm package', () => {
    expect(plugin.name).toBe(pkg.name);
  });

  it('mcpServers entry points at the published npm package', () => {
    const entry = plugin.mcpServers['tech-debt-mcp'];
    expect(entry.command).toBe('npx');
    expect(entry.args).toEqual(['-y', 'tech-debt-mcp@latest']);
  });
});

describe('.claude-plugin/marketplace.json', () => {
  it('marketplace version tracks package.json', () => {
    expect(marketplace.version).toBe(pkg.version);
  });

  it('plugin entry version tracks package.json', () => {
    const entry = marketplace.plugins.find((p) => p.name === pkg.name);
    expect(entry).toBeDefined();
    expect(entry!.version).toBe(pkg.version);
  });
});
