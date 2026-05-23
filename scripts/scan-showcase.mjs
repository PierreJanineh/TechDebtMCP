#!/usr/bin/env node
/**
 * Generate the showcase pages under docs/site/examples/.
 *
 * Reads docs/site/.showcase.json, clones each repo at its pinned SHA into
 * node_modules/.cache/td-showcase/, scans it via AnalysisEngine, and emits:
 *   - docs/site/examples/[slug].md   (rendered page)
 *   - docs/site/examples/[slug].json (raw scan data)
 *   - docs/site/examples/index.md    (showcase index)
 *
 * Outputs are gitignored — bump SHAs in .showcase.json and re-run at release.
 */
import { mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');
const distAnalysis = resolve(repoRoot, 'dist/core/analysisEngine.js');
const distSqale = resolve(repoRoot, 'dist/core/sqaleEngine.js');
const distDeps = resolve(repoRoot, 'dist/server/dependencyHandlers.js');
const siteRoot = resolve(repoRoot, 'docs/site');
const examplesDir = resolve(siteRoot, 'examples');
const manifestPath = resolve(siteRoot, '.showcase.json');
const cacheDir = resolve(repoRoot, 'node_modules/.cache/td-showcase');

if (process.env.SKIP_SHOWCASE === '1') {
  console.log('[scan-showcase] SKIP_SHOWCASE=1 — skipping showcase generation.');
  // Clear any previously generated examples/ content so stale pages don't
  // get served alongside the "skipped" index, then emit a minimal index.md
  // so nav/sidebar links remain valid (offline builds, CI opt-out, etc.).
  await rm(resolve(repoRoot, 'docs/site/examples'), { recursive: true, force: true });
  await mkdir(resolve(repoRoot, 'docs/site/examples'), { recursive: true });
  await writeFile(
    resolve(repoRoot, 'docs/site/examples/index.md'),
    `---\ntitle: Example Scans\n---\n\n# Example Scans\n\nShowcase generation was skipped (\`SKIP_SHOWCASE=1\`).\nRun \`npm run docs:scan-showcase\` to generate the full example pages.\n`,
    'utf-8',
  );
  process.exit(0);
}

if (!existsSync(distAnalysis) || !existsSync(distSqale) || !existsSync(distDeps)) {
  console.error('[scan-showcase] dist not built. Run `npm run build` first.');
  process.exit(1);
}

const { AnalysisEngine } = await import(pathToFileURL(distAnalysis).href);
const { SQALEEngine } = await import(pathToFileURL(distSqale).href);
const { handleCheckDependencies } = await import(pathToFileURL(distDeps).href);

const manifest = JSON.parse(await readFile(manifestPath, 'utf-8'));

await rm(examplesDir, { recursive: true, force: true });
await mkdir(examplesDir, { recursive: true });
await mkdir(cacheDir, { recursive: true });

const run = (cmd, args, opts = {}) => {
  const r = spawnSync(cmd, args, { stdio: 'pipe', encoding: 'utf-8', ...opts });
  if (r.error) {
    throw new Error(`${cmd} ${args.join(' ')} failed to spawn: ${r.error.message}`);
  }
  if (r.status !== 0) {
    throw new Error(`${cmd} ${args.join(' ')} failed: ${r.stderr || r.stdout}`);
  }
  return r.stdout;
};

const cloneAtSha = async (owner, name, sha) => {
  const target = join(cacheDir, `${owner}-${name}-${sha.slice(0, 12)}`);
  if (existsSync(join(target, '.git'))) {
    // Verify the cached working tree is actually at the requested SHA.
    // A previous run may have been interrupted after `git init` but before
    // `git checkout`, or the directory may have been manually modified — in
    // either case HEAD will differ from the pinned SHA and scan results would
    // be wrong.  Re-clone from scratch when the SHAs don't match.
    let headSha = '';
    try {
      headSha = run('git', ['-C', target, 'rev-parse', 'HEAD']).trim();
    } catch {
      // rev-parse failed (e.g. empty repo) — treat as mismatch
    }
    if (headSha === sha) {
      return target;
    }
    console.log(`[scan-showcase] cached ${owner}/${name} HEAD (${headSha.slice(0, 7)}) ≠ requested (${sha.slice(0, 7)}), re-cloning...`);
    await rm(target, { recursive: true, force: true });
  }
  // If the target directory exists without a .git, pre-existing files would
  // remain as untracked content after checkout and pollute scan results.
  // Remove it entirely so the working tree exactly matches the pinned SHA.
  if (existsSync(target)) {
    await rm(target, { recursive: true, force: true });
  }
  console.log(`[scan-showcase] cloning ${owner}/${name}@${sha.slice(0, 7)}...`);
  run('git', ['init', '-q', target]);
  run('git', ['-C', target, 'remote', 'add', 'origin', `https://github.com/${owner}/${name}.git`]);
  run('git', ['-C', target, 'fetch', '-q', '--depth', '1', 'origin', sha]);
  run('git', ['-C', target, 'checkout', '-q', 'FETCH_HEAD']);
  return target;
};

const scanResults = [];

for (const repo of manifest.repos) {
  const { slug, owner, name, language, sha, blurb } = repo;
  if (!/^[a-z0-9-]+$/.test(slug)) {
    throw new Error(`[scan-showcase] invalid slug "${slug}" — slugs must match [a-z0-9-]+`);
  }
  const path = await cloneAtSha(owner, name, sha);

  console.log(`[scan-showcase] scanning ${owner}/${name}...`);
  const t0 = Date.now();
  const result = await new AnalysisEngine().analyzeProject({ path });
  const scanMs = Date.now() - t0;
  const metrics = new SQALEEngine().calculateMetrics(result.issues);

  const bySev = { critical: 0, high: 0, medium: 0, low: 0 };
  for (const i of result.issues) bySev[i.severity] = (bySev[i.severity] || 0) + 1;

  const SEV_RANK = { critical: 0, high: 1, medium: 2, low: 3 };
  const ruleCounts = {};
  for (const i of result.issues) {
    const k = i.rule || i.title;
    if (!ruleCounts[k]) ruleCounts[k] = { rule: k, count: 0, severity: i.severity, sample: i.description };
    ruleCounts[k].count++;
    // Track worst (highest-rank) severity seen for this rule
    if (SEV_RANK[i.severity] < SEV_RANK[ruleCounts[k].severity]) {
      ruleCounts[k].severity = i.severity;
    }
  }
  const topRules = Object.values(ruleCounts).sort((a, b) => b.count - a.count).slice(0, 8);

  // Top 5 high-severity issues for the drill-down turn
  const topHigh = result.issues
    .filter((i) => i.severity === 'high' || i.severity === 'critical')
    .sort((a, b) => {
      const sevOrder = { critical: 0, high: 1 };
      const sevDiff = sevOrder[a.severity] - sevOrder[b.severity];
      if (sevDiff !== 0) return sevDiff;
      // Stable tie-breakers: file then line
      if (a.file !== b.file) return (a.file ?? '').localeCompare(b.file ?? '');
      return (a.line ?? 0) - (b.line ?? 0);
    })
    .slice(0, 5)
    .map((i) => ({
      severity: i.severity,
      rule: i.rule,
      file: i.file?.startsWith(path) ? i.file.slice(path.length + 1) : i.file,
      line: i.line ?? null,
      title: i.title,
    }));

  // Recommendations (heuristic, generated by AnalysisEngine)
  const recommendations = (result.recommendations || []).slice(0, 5);

  // Dependency inventory — call the real handler, capture text report
  let depsReport = null;
  try {
    const res = await handleCheckDependencies({ path, includeDev: false });
    depsReport = res?.content?.[0]?.text ?? null;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    depsReport = `_Dependency scan failed: ${msg}_`;
  }

  // SQALE category breakdown (minutes → human format)
  const sqaleCats = Object.entries(metrics.byCategory || {})
    .filter(([, mins]) => mins > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([cat, mins]) => ({ category: cat, minutes: mins, formatted: formatMinutes(mins) }));

  const data = {
    slug, owner, name, language, sha, blurb,
    scannedAt: new Date().toISOString(),
    scanMs,
    totalFiles: result.project?.totalFiles ?? null,
    analyzedFiles: result.project?.analyzedFiles ?? null,
    totalIssues: result.issues.length,
    bySeverity: bySev,
    sqale: {
      rating: metrics.rating,
      remediationFormatted: metrics.formattedTime,
      remediationMinutes: metrics.totalRemediationTime,
      byCategory: sqaleCats,
    },
    topRules,
    topHigh,
    recommendations,
    depsReport,
  };

  await writeFile(join(examplesDir, `${slug}.json`), JSON.stringify(data, null, 2));
  await writeFile(join(examplesDir, `${slug}.md`), renderRepoPage(data));
  scanResults.push(data);
  console.log(`[scan-showcase]   ${result.issues.length} issues in ${scanMs}ms`);
}

await writeFile(join(examplesDir, 'index.md'), renderIndex(scanResults));
console.log(`[scan-showcase] wrote ${scanResults.length} pages to ${examplesDir}`);

function formatMinutes(mins) {
  if (mins < 60) return `${mins}m`;
  if (mins < 60 * 8) return `${Math.round(mins / 60)}h`;
  const days = Math.floor(mins / (60 * 8));
  const hours = Math.round((mins % (60 * 8)) / 60);
  return hours ? `${days}d ${hours}h` : `${days}d`;
}

// Trim the dep report to the high-signal head — drop trailing footer sections
// (Next Steps, Notes, Recommendations, Tips) so the bubble stays tight.
function trimDepsReport(text) {
  if (!text) return null;
  // Cut at the first known footer heading appearing after line 5 (skips the report title)
  const lines = text.split('\n');
  const cutoff = lines.findIndex((l, i) => i > 5 && /^## (Next steps|Notes|Recommendations|Tips)/i.test(l));
  const sliced = cutoff > 0 ? lines.slice(0, cutoff).join('\n') : text;
  // Cap length so a massive monorepo doesn't bloat the page
  return sliced.length > 1800 ? sliced.slice(0, 1800) + '\n…' : sliced;
}

function renderRepoPage(d) {
  const ghUrl = `https://github.com/${d.owner}/${d.name}`;
  const shaUrl = `${ghUrl}/tree/${d.sha}`;
  const issueSearch = `https://github.com/PierreJanineh/TechDebtMCP/issues?q=is%3Aissue+label%3Ashowcase-fp+${d.slug}`;
  const date = d.scannedAt.slice(0, 10);
  const sev = d.bySeverity;
  const topRulesRows = d.topRules.map((r) => `| \`${r.rule}\` | ${r.severity} | ${r.count} |`).join('\n');

  return `---
title: ${d.owner}/${d.name}
outline: deep
---

# ${d.owner}/${d.name}  ·  ${d.language}

> ${d.blurb}
>
> Source: [\`${d.owner}/${d.name}\`](${ghUrl}) · commit [\`${d.sha.slice(0, 7)}\`](${shaUrl}) · scanned ${date}

<div class="chat-turn user">
  <div class="avatar">You</div>
  <div class="bubble">

Analyze \`${d.owner}/${d.name}\` (${d.language}) at commit \`${d.sha.slice(0, 7)}\` for technical debt. Summarize severity distribution, top rules triggered, and SQALE rating.

  </div>
</div>

<div class="chat-turn assistant">
  <div class="avatar"><img src="/TechDebtMCP/icon-light.png" alt="" class="avatar-light"/><img src="/TechDebtMCP/icon.png" alt="" class="avatar-dark"/></div>
  <div class="bubble">

<div class="role">tech-debt-mcp</div>

Scanned ${d.totalIssues} issues in ${d.scanMs}ms.

**At a glance**

| Issues | SQALE rating | Remediation | Scan time |
|---|---|---|---|
| ${d.totalIssues} | ${d.sqale.rating} | ${d.sqale.remediationFormatted} | ${d.scanMs}ms |

**Severity distribution**

| critical | high | medium | low |
|---|---|---|---|
| ${sev.critical} | ${sev.high} | ${sev.medium} | ${sev.low} |

**Top rules triggered**

| Rule | Severity | Count |
|---|---|---|
${topRulesRows}

Raw scan data: [\`${d.slug}.json\`](./${d.slug}.json)

  </div>
</div>

<div class="chat-turn user">
  <div class="avatar">You</div>
  <div class="bubble">

What kind of debt is this? Show the SQALE breakdown by category.

  </div>
</div>

<div class="chat-turn assistant">
  <div class="avatar"><img src="/TechDebtMCP/icon-light.png" alt="" class="avatar-light"/><img src="/TechDebtMCP/icon.png" alt="" class="avatar-dark"/></div>
  <div class="bubble">

<div class="role">tech-debt-mcp · get_sqale_metrics</div>

Remediation time by debt category — where the work would land if you fixed everything:

| Category | Remediation |
|---|---|
${d.sqale.byCategory.map((c) => `| ${c.category} | ${c.formatted} |`).join('\n') || '| _no debt detected_ | — |'}

The bulk of remediation lives in **${d.sqale.byCategory[0]?.category ?? 'n/a'}** — that's where a debt-reduction sprint would have the highest ROI.

  </div>
</div>

<div class="chat-turn user">
  <div class="avatar">You</div>
  <div class="bubble">

Show me the worst issues — top high-severity findings with file paths.

  </div>
</div>

<div class="chat-turn assistant">
  <div class="avatar"><img src="/TechDebtMCP/icon-light.png" alt="" class="avatar-light"/><img src="/TechDebtMCP/icon.png" alt="" class="avatar-dark"/></div>
  <div class="bubble">

<div class="role">tech-debt-mcp · get_issues_by_severity</div>

${d.topHigh.length === 0 ? '_No high- or critical-severity issues._' : `Top ${d.topHigh.length} ${d.topHigh.some(h => h.severity === 'critical') ? 'critical/' : ''}high-severity findings:

| Severity | Rule | Location |
|---|---|---|
${d.topHigh.map((h) => `| ${h.severity} | \`${h.rule}\` | \`${h.file}${h.line ? `:${h.line}` : ''}\` |`).join('\n')}`}

  </div>
</div>

<div class="chat-turn user">
  <div class="avatar">You</div>
  <div class="bubble">

What dependencies does it use?

  </div>
</div>

<div class="chat-turn assistant">
  <div class="avatar"><img src="/TechDebtMCP/icon-light.png" alt="" class="avatar-light"/><img src="/TechDebtMCP/icon.png" alt="" class="avatar-dark"/></div>
  <div class="bubble">

<div class="role">tech-debt-mcp · check_dependencies</div>

${d.depsReport ? '```text\n' + trimDepsReport(d.depsReport) + '\n```' : '_No package manifests found at the repo root._'}

  </div>
</div>

<div class="chat-turn user">
  <div class="avatar">You</div>
  <div class="bubble">

What should I fix first?

  </div>
</div>

<div class="chat-turn assistant">
  <div class="avatar"><img src="/TechDebtMCP/icon-light.png" alt="" class="avatar-light"/><img src="/TechDebtMCP/icon.png" alt="" class="avatar-dark"/></div>
  <div class="bubble">

<div class="role">tech-debt-mcp · get_recommendations</div>

${d.recommendations.length === 0 ? '_No specific recommendations — codebase is clean enough that no heuristic triggered._' : d.recommendations.map((r, i) => `${i + 1}. **${r.title}** — ${r.description}`).join('\n\n')}

  </div>
</div>

<div class="chat-turn user">
  <div class="avatar">You</div>
  <div class="bubble">

How do I reproduce this locally?

  </div>
</div>

<div class="chat-turn assistant">
  <div class="avatar"><img src="/TechDebtMCP/icon-light.png" alt="" class="avatar-light"/><img src="/TechDebtMCP/icon.png" alt="" class="avatar-dark"/></div>
  <div class="bubble">

<div class="role">tech-debt-mcp</div>

Clone the repo at the pinned commit:

\`\`\`bash
git clone https://github.com/${d.owner}/${d.name}.git
cd ${d.name} && git checkout ${d.sha}
\`\`\`

**Option 1 — Claude Code plugin (recommended)**

\`\`\`
/plugin marketplace add PierreJanineh/TechDebtMCP
/plugin install tech-debt-mcp@techdebtmcp
\`\`\`

Then ask Claude Code: *"Run analyze_project on this directory."*

**Option 2 — MCP server via npx**

Add to your client's MCP config:

\`\`\`json
{
  "mcpServers": {
    "tech-debt": { "command": "npx", "args": ["-y", "tech-debt-mcp@latest"] }
  }
}
\`\`\`

Then call \`analyze_project\` with the absolute path to the clone.

  </div>
</div>

## Spot a false positive?

Open an issue with the \`showcase-fp\` label and link this page. [Existing reports for ${d.owner}/${d.name}](${issueSearch}).

---

*Tech Debt MCP is a static analyzer. It identifies patterns that often indicate debt — not all flagged code is broken, and not all debt will be flagged. Repository authors are not responsible for these findings.*
`;
}

function renderIndex(results) {
  const rows = results.map((d) =>
    `| [${d.owner}/${d.name}](./${d.slug}) | ${d.language} | ${d.totalIssues} | ${d.bySeverity.critical} | ${d.bySeverity.high} | ${d.sqale.rating} |`,
  ).join('\n');
  return `---
title: Example Scans
outline: deep
---

# Example Scans

Real scans of well-maintained open-source libraries, run with the same \`analyze_project\` tool you'd use locally. Each entry pins a specific commit so the numbers are reproducible.

| Repo | Language | Issues | Critical | High | SQALE |
|---|---|---|---|---|---|
${rows}

## What this is — and isn't

- **Reproducible.** Every page pins a commit SHA. Clone at that SHA, run \`tech-debt-mcp\`, get the same numbers.
- **Not a verdict.** "High" severity is a heuristic priority, not a bug. Many findings on healthy codebases are intentional trade-offs (test idioms, language-specific patterns).
- **Not a security audit.** The \`security\` category catches surface patterns; treat as a starting point, not an authoritative review.
- **Repository authors are not responsible** for these findings. False positives are tracked on the [tech-debt-mcp issue tracker](https://github.com/PierreJanineh/TechDebtMCP/issues?q=label%3Ashowcase-fp) and improve over time.

## Want a different repo featured?

[Open an issue](https://github.com/PierreJanineh/TechDebtMCP/issues/new) with the repo URL and why it would be a useful showcase.
`;
}
