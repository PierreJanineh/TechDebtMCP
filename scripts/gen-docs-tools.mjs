#!/usr/bin/env node
/**
 * Generate VitePress content from canonical sources:
 *   - One page per MCP tool from TOOL_DEFINITIONS (dist/server/tools.js)
 *   - Tool index matrix
 *   - Mirrored ARCHITECTURE.md / ROADMAP.md / CHANGELOG.md at the site root
 *
 * Invoked by `npm run docs:gen-tools` (runs after `npm run build` so dist/ exists).
 */
import { mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');
const distTools = resolve(repoRoot, 'dist/server/tools.js');
const siteRoot = resolve(repoRoot, 'docs/site');
const toolsDir = resolve(siteRoot, 'tools');

if (!existsSync(distTools)) {
  console.error(`[gen-docs-tools] ${distTools} not found — run \`npm run build\` first.`);
  process.exit(1);
}

const { TOOL_DEFINITIONS } = await import(pathToFileURL(distTools).href);

await rm(toolsDir, { recursive: true, force: true });
await mkdir(toolsDir, { recursive: true });

const slugify = (name) => name.replace(/_/g, '-');

const formatArgRow = (key, schema, required) => {
  const type = schema.type ?? 'unknown';
  const enumStr = schema.enum ? ` \`(${schema.enum.join(' | ')})\`` : '';
  const min = schema.minimum !== undefined ? ` *min: ${schema.minimum}*` : '';
  const items = schema.items?.type ? `\`array<${schema.items.type}>\`` : `\`${type}\``;
  const typeCell = schema.type === 'array' ? items : `\`${type}\`${enumStr}`;
  const req = required ? '✅' : '—';
  const desc = (schema.description ?? '').replace(/\\/g, '\\\\').replace(/\|/g, '\\|');
  return `| \`${key}\` | ${typeCell}${min} | ${req} | ${desc} |`;
};

const annotationBadge = (annotations = {}) => {
  if (annotations.destructiveHint) return '![destructive](https://img.shields.io/badge/destructive-red) Mutates server state.';
  if (annotations.readOnlyHint) return '![read-only](https://img.shields.io/badge/read--only-green) No side effects on server state.';
  return '![unclassified](https://img.shields.io/badge/unclassified-grey)';
};

const renderToolPage = (tool) => {
  const props = tool.inputSchema?.properties ?? {};
  const required = new Set(tool.inputSchema?.required ?? []);
  const rows = Object.entries(props)
    .map(([k, v]) => formatArgRow(k, v, required.has(k)))
    .join('\n');
  const argsTable = rows
    ? `| Argument | Type | Required | Description |\n| --- | --- | --- | --- |\n${rows}`
    : '_This tool takes no arguments._';

  return `---
title: ${tool.name}
outline: deep
editLink: false
---

# \`${tool.name}\`

${annotationBadge(tool.annotations)}

${tool.description}

## Arguments

${argsTable}

## Example

\`\`\`json
{
  "name": "${tool.name}",
  "arguments": ${JSON.stringify(exampleArgs(tool), null, 2).replace(/\n/g, '\n  ')}
}
\`\`\`

> Generated from \`TOOL_DEFINITIONS\` in \`src/server/tools.ts\` — do not edit by hand. Source: [tools.ts](https://github.com/PierreJanineh/TechDebtMCP/blob/develop/src/server/tools.ts).
`;
};

const exampleArgs = (tool) => {
  const props = tool.inputSchema?.properties ?? {};
  const required = tool.inputSchema?.required ?? [];
  const out = {};
  for (const key of required) {
    const schema = props[key] ?? {};
    if (schema.type === 'string') out[key] = key.toLowerCase().includes('path') ? '/abs/path/to/project' : 'example';
    else if (schema.type === 'integer' || schema.type === 'number') out[key] = schema.minimum ?? 1;
    else if (schema.type === 'array') out[key] = [];
    else if (schema.type === 'object') out[key] = {};
    else out[key] = null;
  }
  return out;
};

const renderIndex = (tools) => {
  const rows = tools
    .map((t) => {
      const kind = t.annotations?.destructiveHint
        ? 'destructive'
        : t.annotations?.readOnlyHint
          ? 'read-only'
          : 'unclassified';
      return `| [\`${t.name}\`](./${slugify(t.name)}) | ${kind} | ${t.description} |`;
    })
    .join('\n');
  return `---
title: Tool Reference
outline: 2
editLink: false
---

# Tool Reference

Tech Debt MCP exposes **${tools.length} tools**. All tool schemas are generated from \`TOOL_DEFINITIONS\` in \`src/server/tools.ts\` at build time — what you see here matches what the server advertises.

| Tool | Kind | Description |
| --- | --- | --- |
${rows}

## Resources

Beyond tools, the server registers two RFC-6570 resource templates:

- \`debt://summary/{+projectPath}\` — quick debt summary for a project root.
- \`debt://issues/{+projectPath}\` — full issue list for a project root.

The leading \`/\` of an absolute path doubles the slash after \`debt://summary\` — e.g. \`debt://summary//Users/me/repo\`.
`;
};

let count = 0;
for (const tool of TOOL_DEFINITIONS) {
  const out = join(toolsDir, `${slugify(tool.name)}.md`);
  await writeFile(out, renderToolPage(tool), 'utf8');
  count += 1;
}
await writeFile(join(toolsDir, 'index.md'), renderIndex(TOOL_DEFINITIONS), 'utf8');

// Mirror canonical root docs into the site so they're navigable via the sidebar.
const mirrors = [
  { src: 'ARCHITECTURE.md', dest: 'architecture.md', title: 'Architecture' },
  { src: 'ROADMAP.md', dest: 'roadmap.md', title: 'Roadmap' },
  { src: 'CHANGELOG.md', dest: 'changelog.md', title: 'Changelog' },
];
for (const { src, dest, title } of mirrors) {
  const body = await readFile(resolve(repoRoot, src), 'utf8');
  const frontmatter = `---\ntitle: ${title}\noutline: 2\neditLink: false\n---\n\n> Mirrored from [\`${src}\`](https://github.com/PierreJanineh/TechDebtMCP/blob/develop/${src}) at build time.\n\n`;
  await writeFile(resolve(siteRoot, dest), frontmatter + body, 'utf8');
}

console.log(`[gen-docs-tools] Wrote ${count} tool pages + index + ${mirrors.length} mirrors.`);
