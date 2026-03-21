/**
 * Dependency analysis and vulnerability report handlers
 */

import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';
import { createDependencyParser, getAllPackageFileNames } from '../analyzers/dependencies/index.js';
import { getRelativePath, readFile, fileExists } from '../utils/fileUtils.js';
import { readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { ParsedDependency, PackageManager } from '../types/index.js';

/** Type guard: checks that a value is a plain, non-null, non-array object. */
function isRecord(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }
  const proto = Object.getPrototypeOf(value as object) as unknown;
  return proto === Object.prototype || proto === null;
}

/**
 * Assert that args is a plain non-null, non-array object, throwing McpError(InvalidParams) if not.
 */
function requireRecord(args: unknown): Record<string, unknown> {
  if (!isRecord(args)) {
    throw new McpError(
      ErrorCode.InvalidParams,
      'Tool arguments must be a plain object',
    );
  }
  return args;
}

/**
 * Handle check_dependencies tool call
 */
export async function handleCheckDependencies(args: unknown): Promise<{ content: Array<{ type: string; text: string }> }> {
  const a = requireRecord(args);
  if (typeof a.path !== 'string') {
    throw new McpError(ErrorCode.InvalidParams, 'Missing or invalid required parameter: path (must be a string)');
  }
  const projectPath = a.path;
  const includeDev = a.includeDev !== false;
  await validateDirectoryPath(projectPath);

  const packageFileNames = getAllPackageFileNames();
  const packageFiles: string[] = [];
  const scanErrors: string[] = [];
  await findPackageFiles(projectPath, packageFileNames, packageFiles, scanErrors);

  const { dependencies, failedParses } = await parseAllDependencies(packageFiles, projectPath, includeDev);
  const report = generateDependencyReport(projectPath, packageFiles, dependencies, failedParses, scanErrors);

  return { content: [{ type: 'text', text: report }] };
}

/**
 * Generate an offline vulnerability/dependency report
 */
export async function handleGetVulnerabilityReport(args: unknown): Promise<{ content: Array<{ type: string; text: string }> }> {
  const a = requireRecord(args);
  if (typeof a.path !== 'string') {
    throw new McpError(ErrorCode.InvalidParams, 'Missing or invalid required parameter: path (must be a string)');
  }
  const projectPath = a.path;
  const includeDev = a.includeDev === true; // default false for vulnerability reports
  await validateDirectoryPath(projectPath);

  const packageFileNames = getAllPackageFileNames();
  const packageFiles: string[] = [];
  const scanErrors: string[] = [];
  await findPackageFiles(projectPath, packageFileNames, packageFiles, scanErrors);

  const { dependencies, failedParses } = await parseAllDependencies(packageFiles, projectPath, includeDev);

  // Filter out manifests with zero dependencies after dev-filtering
  const nonEmptyDeps = dependencies.filter(d => d.dependencies.length > 0);
  const totalDeps = nonEmptyDeps.reduce((sum, f) => sum + f.dependencies.length, 0);
  const ecosystems = [...new Set(nonEmptyDeps.map(d => d.ecosystem))];

  let report = `# Vulnerability Report (Offline)\n\n`;
  report += `> **Note:** This is an offline dependency inventory. Actual CVE lookups will be available in Phase 2b via the OSV API.\n\n`;
  report += `**Project:** ${projectPath}\n`;
  report += `**Package files found:** ${packageFiles.length} across ${ecosystems.length} ecosystem(s)\n`;
  report += `**Total dependencies inventoried:** ${totalDeps}\n`;
  report += `**Dev dependencies included:** ${includeDev ? 'Yes' : 'No'}\n\n`;

  if (packageFiles.length === 0) {
    report += `No package manifests detected. Ensure your project root contains supported manifest files.\n`;
    if (scanErrors.length > 0) {
      report += `\n## ⚠️ Filesystem scan errors (${scanErrors.length})\n\n`;
      report += scanErrors.map(e => `- ${e}`).join('\n') + '\n';
    }
    return { content: [{ type: 'text', text: report }] };
  }

  if (nonEmptyDeps.length > 0) {
    report += `## Dependency Inventory by Ecosystem\n\n`;
    for (const fileInfo of nonEmptyDeps) {
      report += `### ${fileInfo.ecosystem} — \`${fileInfo.file}\`\n\n`;
      report += `| Package | Version |\n|---------|----------|\n`;
      for (const dep of fileInfo.dependencies) {
        report += `| ${dep.name} | \`${dep.version}\` |\n`;
      }
      report += `\n`;
    }
  }

  if (failedParses.length > 0) {
    report += `## ⚠️ Failed to parse ${failedParses.length} file(s)\n\n`;
    report += failedParses.map(f => `- \`${f.file}\`: ${f.error}`).join('\n') + '\n\n';
  }

  if (scanErrors.length > 0) {
    report += `## ⚠️ Filesystem scan errors (${scanErrors.length})\n\n`;
    report += scanErrors.map(e => `- ${e}`).join('\n') + '\n\n';
  }

  report += `## Next Steps\n\n`;
  report += `- Review the dependency list above for known outdated packages\n`;
  report += `- Cross-reference with [OSV](https://osv.dev) or [Snyk](https://snyk.io) manually for CVE lookup\n`;
  report += `- Online CVE checking will be available in Phase 2b (opt-in, privacy-friendly)\n`;

  return { content: [{ type: 'text', text: report }] };
}

// --- Internal helpers ---

/**
 * Validate that the given path exists and is a directory.
 * @param projectPath Path to validate
 * @throws McpError if the path does not exist or is not a directory
 */
async function validateDirectoryPath(projectPath: string): Promise<void> {
  if (!(await fileExists(projectPath))) {
    throw new McpError(ErrorCode.InvalidParams, `Project path not found: ${projectPath}`);
  }
  const stats = await stat(projectPath);
  if (!stats.isDirectory()) {
    throw new McpError(ErrorCode.InvalidParams, `Path is not a directory: ${projectPath}`);
  }
}

/** Directories that should be skipped during recursive file discovery. */
const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'build', 'target', '.venv', '__pycache__']);

/**
 * Recursively discover package manifest files in a directory tree.
 * Skips common non-source directories (node_modules, .git, dist, etc.) and
 * limits traversal depth to avoid runaway recursion in deep trees.
 * @param dir Root directory to begin searching from
 * @param targetFiles Array of package file names to look for
 * @param results Accumulator array for discovered file paths (mutated in place)
 * @param scanErrors Accumulator array for filesystem errors encountered during traversal
 * @param maxDepth Maximum directory nesting depth before stopping recursion
 * @param currentDepth Current recursion depth (used internally)
 */
async function findPackageFiles(
  dir: string,
  targetFiles: string[],
  results: string[],
  scanErrors: string[] = [],
  maxDepth: number = 10,
  currentDepth: number = 0
): Promise<void> {
  if (currentDepth >= maxDepth) return;

  try {
    const entries = await readdir(dir);

    for (const entry of entries) {
      if (SKIP_DIRS.has(entry)) {
        continue;
      }

      const fullPath = join(dir, entry);
      const stats = await stat(fullPath);

      if (stats.isDirectory()) {
        await findPackageFiles(fullPath, targetFiles, results, scanErrors, maxDepth, currentDepth + 1);
      } else if (stats.isFile()) {
        if (targetFiles.includes(entry) || entry.endsWith('.csproj')) {
          results.push(fullPath);
        }
      }
    }
  } catch (error) {
    scanErrors.push(`${dir}: ${error instanceof Error ? error.message : String(error)}`);
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

        dependencies.push({
          file: getRelativePath(projectPath, filePath),
          ecosystem: parser.getEcosystem(),
          dependencies: filteredDeps,
        });
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
  failedParses: Array<{ file: string; error: string }>,
  scanErrors: string[] = []
): string {
  const nonEmptyDeps = dependencies.filter(d => d.dependencies.length > 0);
  const totalDeps = nonEmptyDeps.reduce((sum, f) => sum + f.dependencies.length, 0);
  const ecosystems = [...new Set(nonEmptyDeps.map(d => d.ecosystem))];

  let report = `# Dependency Analysis\n\n**Project:** ${projectPath}\n**Found:** ${packageFiles.length} package file(s) across ${ecosystems.length} ecosystem(s)\n**Total Dependencies:** ${totalDeps}\n**Ecosystems:** ${ecosystems.join(', ')}\n\n`;

  for (const fileInfo of nonEmptyDeps) {
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

  if (scanErrors.length > 0) {
    report += `## ⚠️ Filesystem scan errors (${scanErrors.length})\n\n`;
    report += scanErrors.map(e => `- ${e}`).join('\n') + '\n\n';
  }

  return report;
}
