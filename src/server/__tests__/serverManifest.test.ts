import { readFileSync } from 'node:fs';
import { join } from 'node:path';

interface ServerManifest {
  name: string;
  description: string;
  version: string;
  packages: Array<{
    registryType: string;
    identifier: string;
    version: string;
    transport?: { type: string };
  }>;
}

const REPO_ROOT = join(__dirname, '..', '..', '..');
const SERVER_PATH = join(REPO_ROOT, 'server.json');
const PACKAGE_PATH = join(REPO_ROOT, 'package.json');

const server = JSON.parse(readFileSync(SERVER_PATH, 'utf8')) as ServerManifest;
const pkg = JSON.parse(readFileSync(PACKAGE_PATH, 'utf8')) as {
  version: string;
  name: string;
  mcpName: string;
};

// Registry schema (server.schema.json) caps the description at 100 characters.
const DESCRIPTION_MAX = 100;

describe('server.json (official MCP Registry manifest)', () => {
  it('top-level version tracks package.json', () => {
    expect(server.version).toBe(pkg.version);
  });

  it('packages[0].version tracks package.json', () => {
    expect(server.packages[0]?.version).toBe(pkg.version);
  });

  it('reverse-DNS name matches package.json mcpName', () => {
    expect(server.name).toBe(pkg.mcpName);
  });

  it('packages[0].identifier matches the npm package name', () => {
    expect(server.packages[0]?.identifier).toBe(pkg.name);
  });

  it('description stays within the registry schema 100-char cap', () => {
    expect(server.description.length).toBeLessThanOrEqual(DESCRIPTION_MAX);
  });

  it('publishes the npm package over stdio', () => {
    expect(server.packages[0]?.registryType).toBe('npm');
    expect(server.packages[0]?.transport?.type).toBe('stdio');
  });
});
