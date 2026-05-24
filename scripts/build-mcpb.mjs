#!/usr/bin/env node
/**
 * Build the Tech Debt MCP .mcpb bundle.
 *
 * Steps:
 *   1. Assert mcpb/manifest.json version matches package.json version.
 *   2. Ensure dist/ is current (npm run build).
 *   3. Clean mcpb/staging/ and stage runtime files.
 *   4. Run `npm ci --omit=dev --ignore-scripts` in staging for a lean prod tree.
 *   5. Run `mcpb pack` to produce mcpb/tech-debt-mcp-<version>.mcpb
 *      (replaces any existing artifact for this exact version).
 *   6. Report bundle size; warn if > 50 MB.
 */
import { spawnSync } from 'node:child_process';
import { cpSync, mkdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..');
const MCPB_DIR = join(REPO_ROOT, 'mcpb');
const STAGING_DIR = join(MCPB_DIR, 'staging');
const SIZE_WARN_BYTES = 50 * 1024 * 1024;

function run(cmd, args, opts = {}) {
  const resolvedCmd = process.platform === 'win32' ? `${cmd}.cmd` : cmd;
  const result = spawnSync(resolvedCmd, args, { stdio: 'inherit', cwd: REPO_ROOT, ...opts });
  if (result.error) {
    throw new Error(`${cmd} ${args.join(' ')} failed to launch: ${result.error.message}`);
  }
  if (result.status !== 0) {
    throw new Error(`${cmd} ${args.join(' ')} failed with exit code ${result.status}`);
  }
}

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function assertVersionsMatch() {
  const pkg = readJson(join(REPO_ROOT, 'package.json'));
  const manifest = readJson(join(MCPB_DIR, 'manifest.json'));
  const plugin = readJson(join(REPO_ROOT, 'plugin', '.claude-plugin', 'plugin.json'));
  if (pkg.version !== manifest.version) {
    throw new Error(
      `Version mismatch: package.json=${pkg.version}, mcpb/manifest.json=${manifest.version}. ` +
        `Update mcpb/manifest.json before packing.`,
    );
  }
  if (pkg.version !== plugin.version) {
    throw new Error(
      `Version mismatch: package.json=${pkg.version}, plugin/.claude-plugin/plugin.json=${plugin.version}. ` +
        `Update plugin/.claude-plugin/plugin.json before packing.`,
    );
  }
  const marketplace = readJson(join(REPO_ROOT, '.claude-plugin', 'marketplace.json'));
  if (!Array.isArray(marketplace.plugins)) {
    throw new Error(
      `.claude-plugin/marketplace.json is missing a top-level "plugins" array.`,
    );
  }
  const marketplaceEntry = marketplace.plugins.find((p) => p.name === pkg.name);
  if (!marketplaceEntry) {
    throw new Error(
      `No marketplace plugin entry found with name "${pkg.name}" in .claude-plugin/marketplace.json.`,
    );
  }
  if (marketplace.version !== pkg.version || marketplaceEntry.version !== pkg.version) {
    throw new Error(
      `Version mismatch: package.json=${pkg.version}, ` +
        `.claude-plugin/marketplace.json=${marketplace.version}, ` +
        `plugin entry=${marketplaceEntry.version}. ` +
        `Update .claude-plugin/marketplace.json before packing.`,
    );
  }
  return pkg.version;
}

function stage() {
  rmSync(STAGING_DIR, { recursive: true, force: true });
  mkdirSync(STAGING_DIR, { recursive: true });

  const copies = [
    ['package.json', 'package.json'],
    ['package-lock.json', 'package-lock.json'],
    ['README.md', 'README.md'],
    ['LICENSE', 'LICENSE'],
    ['dist', 'dist'],
    ['mcpb/manifest.json', 'manifest.json'],
    ['mcpb/icon.png', 'icon.png'],
    ['mcpb/icon.png', 'mcpb/icon.png'],
  ];
  for (const [src, dest] of copies) {
    const destPath = join(STAGING_DIR, dest);
    mkdirSync(dirname(destPath), { recursive: true });
    cpSync(join(REPO_ROOT, src), destPath, { recursive: true });
  }
}

function installProdDeps() {
  run('npm', ['ci', '--omit=dev', '--ignore-scripts'], { cwd: STAGING_DIR });
}

function pack(version) {
  const output = join(MCPB_DIR, `tech-debt-mcp-${version}.mcpb`);
  rmSync(output, { force: true });
  run('npx', ['mcpb', 'pack', STAGING_DIR, output]);
  return output;
}

function reportSize(file) {
  const bytes = statSync(file).size;
  const mb = (bytes / 1024 / 1024).toFixed(2);
  console.log(`\nBundle: ${file}`);
  console.log(`Size:   ${mb} MB`);
  if (bytes > SIZE_WARN_BYTES) {
    console.warn(`Warning: bundle exceeds ${SIZE_WARN_BYTES / 1024 / 1024} MB; audit dependencies.`);
  }
}

function main() {
  const version = assertVersionsMatch();
  run('npm', ['run', 'build']);
  stage();
  installProdDeps();
  const output = pack(version);
  reportSize(output);
}

main();
