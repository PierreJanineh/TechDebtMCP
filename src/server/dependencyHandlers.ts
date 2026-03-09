/**
 * Dependency analysis and vulnerability report handlers
 */

import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';
import { createDependencyParser, getAllPackageFileNames } from '../analyzers/dependencies/index.js';
import { getRelativePath, readFile, fileExists } from '../utils/fileUtils.js';
import { readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { ParsedDependency, PackageManager } from '../types/index.js';

/**
 * Handle check_dependencies tool call
 */
export async function handleCheckDependencies(args: Record<string, unknown>): Promise<{ content: Array<{ type: string; text: string }> }> {
  const projectPath = args.path as string;
  const includeDev = args.includeDev !== false;
  if (!(await fileExists(projectPath))) throw new McpError(ErrorCode.InvalidParams, `Project path not found: ${projectPath}`);

  const packageFileNames = getAllPackageFileNames();
  const packageFiles: string[] = [];
  await findPackageFiles(projectPath, packageFileNames, packageFiles);

  const { dependencies, failedParses } = await parseAllDependencies(packageFiles, projectPath, includeDev);
  const report = generateDependencyReport(projectPath, packageFiles, dependencies, failedParses);

  return { content: [{ type: 'text', text: report }] };
}

/**
 * Generate an offline vulnerability/dependency report
 */
export async function handleGetVulnerabilityReport(args: Record<string, unknown>): Promise<{ content: Array<{ type: string; text: string }> }> {
  const projectPath = args.path as string;
  const includeDev = args.includeDev === true; // default false for vulnerability reports

  if (!(await fileExists(projectPath))) {
    throw new McpError(ErrorCode.InvalidParams, `Project path not found: ${projectPath}`);
  }

  const packageFileNames = getAllPackageFileNames();
  const packageFiles: string[] = [];
  await findPackageFiles(projectPath, packageFileNames, packageFiles);

  const { dependencies, failedParses } = await parseAllDependencies(packageFiles, projectPath, includeDev);

  const totalDeps = dependencies.reduce((sum, f) => sum + f.dependencies.length, 0);
  const ecosystems = [...new Set(dependencies.map(d => d.ecosystem))];

  let report = `# Vulnerability Report (Offline)\n\n`;
  report += `> **Note:** This is an offline dependency inventory. Actual CVE lookups will be available in Phase 2b via the OSV API.\n\n`;
  report += `**Project:** ${projectPath}\n`;
  report += `**Package files found:** ${packageFiles.length} across ${ecosystems.length} ecosystem(s)\n`;
  report += `**Total dependencies inventoried:** ${totalDeps}\n`;
  report += `**Dev dependencies included:** ${includeDev ? 'Yes' : 'No'}\n\n`;

  if (ecosystems.length === 0) {
    report += `No package manifests detected. Ensure your project root contains supported manifest files.\n`;
    return { content: [{ type: 'text', text: report }] };
  }

  report += `## Dependency Inventory by Ecosystem\n\n`;
  for (const fileInfo of dependencies) {
    report += `### ${fileInfo.ecosystem} — \`${fileInfo.file}\`\n\n`;
    report += `| Package | Version |\n|---------|----------|\n`;
    for (const dep of fileInfo.dependencies) {
      report += `| ${dep.name} | \`${dep.version}\` |\n`;
    }
    report += `\n`;
  }

  if (failedParses.length > 0) {
    report += `## ⚠️ Failed to parse ${failedParses.length} file(s)\n\n`;
    report += failedParses.map(f => `- \`${f.file}\`: ${f.error}`).join('\n') + '\n\n';
  }

  report += `## Next Steps\n\n`;
  report += `- Review the dependency list above for known outdated packages\n`;
  report += `- Cross-reference with [OSV](https://osv.dev) or [Snyk](https://snyk.io) manually for CVE lookup\n`;
  report += `- Online CVE checking will be available in Phase 2b (opt-in, privacy-friendly)\n`;

  return { content: [{ type: 'text', text: report }] };
}

// --- Internal helpers ---

async function findPackageFiles(
  dir: string,
  targetFiles: string[],
  results: string[],
  maxDepth: number = 10,
  currentDepth: number = 0
): Promise<void> {
  if (currentDepth >= maxDepth) return;

  try {
    const entries = await readdir(dir);

    for (const entry of entries) {
      if (['node_modules', '.git', 'dist', 'build', 'target', '.venv', '__pycache__'].includes(entry)) {
        continue;
      }

      const fullPath = join(dir, entry);
      const stats = await stat(fullPath);

      if (stats.isDirectory()) {
        await findPackageFiles(fullPath, targetFiles, results, maxDepth, currentDepth + 1);
      } else if (stats.isFile()) {
        if (targetFiles.includes(entry) || entry.endsWith('.csproj')) {
          results.push(fullPath);
        }
      }
    }
  } catch {
    // Silently skip inaccessible directories; parse failures are surfaced via failedParses
  }
}

/**
 * Parse dependencies from all package files
 */
async function parseAllDependencies(
  packageFiles: string[],
  projectPath: string,
  includeDev: boolean
): Promise<{
  dependencies: Array<{ file: string; ecosystem: PackageManager | string; dependencies: ParsedDependency[] }>;
  failedParses: Array<{ file: string; error: string }>;
}> {
  const dependencies: Array<{ file: string; ecosystem: PackageManager | string; dependencies: ParsedDependency[] }> = [];
  const failedParses: Array<{ file: string; error: string }> = [];

  for (const filePath of packageFiles) {
    const parser = createDependencyParser(filePath);
    if (parser) {
      try {
        const content = await readFile(filePath);
        const deps = await parser.parse(filePath, content);
        const filteredDeps = includeDev ? deps : deps.filter(d => !d.isDev);

        if (filteredDeps.length > 0) {
          dependencies.push({
            file: getRelativePath(projectPath, filePath),
            ecosystem: parser.getEcosystem(),
            dependencies: filteredDeps,
          });
        }
      } catch (error) {
        const rel = getRelativePath(projectPath, filePath);
        failedParses.push({ file: rel, error: error instanceof Error ? error.message : String(error) });
      }
    }
  }

  return { dependencies, failedParses };
}

/**
 * Generate dependency analysis report
 */
function generateDependencyReport(
  projectPath: string,
  packageFiles: string[],
  dependencies: Array<{ file: string; ecosystem: PackageManager | string; dependencies: ParsedDependency[] }>,
  failedParses: Array<{ file: string; error: string }>
): string {
  const totalDeps = dependencies.reduce((sum, f) => sum + f.dependencies.length, 0);
  const ecosystems = [...new Set(dependencies.map(d => d.ecosystem))];

  let report = `# Dependency Analysis\n\n**Project:** ${projectPath}\n**Found:** ${packageFiles.length} package file(s) across ${ecosystems.length} ecosystem(s)\n**Total Dependencies:** ${totalDeps}\n**Ecosystems:** ${ecosystems.join(', ')}\n\n`;

  for (const fileInfo of dependencies) {
    report += `## ${fileInfo.file} (${fileInfo.ecosystem})\n\n`;
    report += `**Dependencies:** ${fileInfo.dependencies.length}\n\n`;

    const prodDeps = fileInfo.dependencies.filter(d => !d.isDev);
    const devDeps = fileInfo.dependencies.filter(d => d.isDev);

    if (prodDeps.length > 0) {
      report += `### Production (${prodDeps.length})\n`;
      report += prodDeps.map(d => `- ${d.name}@${d.version}`).join('\n') + '\n\n';
    }

    if (devDeps.length > 0) {
      report += `### Development (${devDeps.length})\n`;
      report += devDeps.map(d => `- ${d.name}@${d.version}`).join('\n') + '\n\n';
    }
  }

  if (failedParses.length > 0) {
    report += `## ⚠️ Failed to parse ${failedParses.length} file(s)\n\n`;
    report += failedParses.map(f => `- ${f.file}: ${f.error}`).join('\n') + '\n\n';
  }

  return report;
}
