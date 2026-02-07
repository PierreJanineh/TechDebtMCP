import { SupportedLanguage, TechDebtConfig, FileAnalysisResult } from '../types/index.js';
import { BaseAnalyzer } from './baseAnalyzer.js';
import { JavaScriptAnalyzer } from './javascriptAnalyzer.js';
import { TypeScriptAnalyzer } from './typescriptAnalyzer.js';
import { PythonAnalyzer } from './pythonAnalyzer.js';
import { JavaAnalyzer } from './javaAnalyzer.js';
import { SwiftAnalyzer } from './swiftAnalyzer.js';
import { KotlinAnalyzer } from './kotlinAnalyzer.js';
import { ObjectiveCAnalyzer } from './objectivecAnalyzer.js';
import { CppAnalyzer } from './cppAnalyzer.js';
import { CAnalyzer } from './cAnalyzer.js';
import { CSharpAnalyzer } from './csharpAnalyzer.js';
import { detectLanguageFromExtension } from '../config/languages.js';
import { readFile } from '../utils/fileUtils.js';

/**
 * Factory to create appropriate analyzer for a language
 */
export function createAnalyzer(
  language: SupportedLanguage,
  config: TechDebtConfig = {}
): BaseAnalyzer {
  switch (language) {
    case 'javascript':
      return new JavaScriptAnalyzer(config);
    case 'typescript':
      return new TypeScriptAnalyzer(config);
    case 'python':
      return new PythonAnalyzer(config);
    case 'java':
      return new JavaAnalyzer(config);
    case 'swift':
      return new SwiftAnalyzer(config);
    case 'kotlin':
      return new KotlinAnalyzer(config);
    case 'objectivec':
      return new ObjectiveCAnalyzer(config);
    case 'cpp':
      return new CppAnalyzer(config);
    case 'c':
      return new CAnalyzer(config);
    case 'csharp':
      return new CSharpAnalyzer(config);
    // For languages without specific analyzers yet, use a generic approach
    case 'go':
    case 'rust':
    case 'ruby':
    case 'php':
    default:
      // Return a basic analyzer that does common checks
      return new JavaScriptAnalyzer(config); // Fallback with basic checks
  }
}

/**
 * Analyze a single file
 */
export async function analyzeFile(
  filePath: string,
  config: TechDebtConfig = {}
): Promise<FileAnalysisResult> {
  const language = detectLanguageFromExtension(filePath);

  if (!language) {
    return {
      file: filePath,
      language: null,
      issues: [],
      metrics: {
        lines: 0,
        codeLines: 0,
        commentLines: 0,
        blankLines: 0,
      },
    };
  }

  const content = await readFile(filePath);
  const analyzer = createAnalyzer(language, config);

  return analyzer.analyze(filePath, content);
}

/**
 * Analyze file content directly (when content is already available)
 */
export async function analyzeFileContent(
  filePath: string,
  content: string,
  language: SupportedLanguage,
  config: TechDebtConfig = {}
): Promise<FileAnalysisResult> {
  const analyzer = createAnalyzer(language, config);
  return analyzer.analyze(filePath, content);
}

// Re-export all analyzers
export { BaseAnalyzer } from './baseAnalyzer.js';
export { JavaScriptAnalyzer } from './javascriptAnalyzer.js';
export { TypeScriptAnalyzer } from './typescriptAnalyzer.js';
export { PythonAnalyzer } from './pythonAnalyzer.js';
export { JavaAnalyzer } from './javaAnalyzer.js';
export { SwiftAnalyzer } from './swiftAnalyzer.js';
export { KotlinAnalyzer } from './kotlinAnalyzer.js';
export { ObjectiveCAnalyzer } from './objectivecAnalyzer.js';
export { CppAnalyzer } from './cppAnalyzer.js';
export { CAnalyzer } from './cAnalyzer.js';
export { CSharpAnalyzer } from './csharpAnalyzer.js';
