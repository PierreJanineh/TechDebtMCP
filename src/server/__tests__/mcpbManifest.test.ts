import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { TOOL_DEFINITIONS } from '../tools.js';

interface McpbManifest {
  manifest_version: string;
  version: string;
  server: { type: string; entry_point: string; mcp_config: { command: string; args: string[] } };
  tools: Array<{ name: string; description?: string }>;
}

const REPO_ROOT = join(__dirname, '..', '..', '..');
const MANIFEST_PATH = join(REPO_ROOT, 'mcpb', 'manifest.json');
const PACKAGE_PATH = join(REPO_ROOT, 'package.json');

const manifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf8')) as McpbManifest;
const pkg = JSON.parse(readFileSync(PACKAGE_PATH, 'utf8')) as { version: string };

describe('mcpb/manifest.json', () => {
  it('version tracks package.json', () => {
    expect(manifest.version).toBe(pkg.version);
  });

  it('declares Node entry point pointing at dist/index.js', () => {
    expect(manifest.server.type).toBe('node');
    expect(manifest.server.entry_point).toBe('dist/index.js');
  });

  it('lists exactly the tools exposed by TOOL_DEFINITIONS', () => {
    const sourceNames = TOOL_DEFINITIONS.map((t) => t.name).sort();
    const manifestNames = manifest.tools.map((t) => t.name).sort();
    expect(manifestNames).toEqual(sourceNames);
  });

  it('every manifest tool has a non-empty description', () => {
    for (const tool of manifest.tools) {
      expect(tool.description).toBeTruthy();
    }
  });
});
