import { TypeScriptAnalyzer } from '../typescriptAnalyzer.js';
import { JavaScriptAnalyzer } from '../javascriptAnalyzer.js';

describe('ruleExclusions', () => {
  const codeWithDebugger = `
function broken() {
  debugger;
  return 1;
}
`;

  const codeWithTsIgnore = `
// @ts-ignore
const x: any = 1;
`;

  it('excludes debugger issues for matching file patterns', async () => {
    const config = {
      ruleExclusions: {
        debugger: ['**/src/analyzers/**'],
      },
    };
    const analyzer = new TypeScriptAnalyzer(config);
    const result = await analyzer.analyze('src/analyzers/typescriptAnalyzer.ts', codeWithDebugger);
    const debuggerIssues = result.issues.filter(i => i.rule === 'debugger');
    expect(debuggerIssues).toHaveLength(0);
  });

  it('keeps debugger issues for non-matching file patterns', async () => {
    const config = {
      ruleExclusions: {
        debugger: ['**/src/analyzers/**'],
      },
    };
    const analyzer = new TypeScriptAnalyzer(config);
    const result = await analyzer.analyze('src/handlers/myHandler.ts', codeWithDebugger);
    const debuggerIssues = result.issues.filter(i => i.rule === 'debugger');
    expect(debuggerIssues.length).toBeGreaterThan(0);
  });

  it('excludes ts-ignore issues for matching file patterns', async () => {
    const config = {
      ruleExclusions: {
        'ts-ignore': ['**/src/analyzers/**'],
      },
    };
    const analyzer = new TypeScriptAnalyzer(config);
    const result = await analyzer.analyze('src/analyzers/typescriptAnalyzer.ts', codeWithTsIgnore);
    const tsIgnoreIssues = result.issues.filter(i => i.rule === 'ts-ignore');
    expect(tsIgnoreIssues).toHaveLength(0);
  });

  it('preserves other issues when only specific rules are excluded', async () => {
    const config = {
      ruleExclusions: {
        debugger: ['**/*.ts'],
      },
    };
    const analyzer = new TypeScriptAnalyzer(config);
    const code = `
function broken() {
  debugger;
  console.log("test");
  return 1;
}
`;
    const result = await analyzer.analyze('src/foo.ts', code);
    const debuggerIssues = result.issues.filter(i => i.rule === 'debugger');
    const consoleIssues = result.issues.filter(i => i.rule === 'console-log');
    expect(debuggerIssues).toHaveLength(0);
    expect(consoleIssues.length).toBeGreaterThan(0);
  });

  it('applies no filtering when ruleExclusions is not set', async () => {
    const analyzer = new TypeScriptAnalyzer({});
    const result = await analyzer.analyze('src/analyzers/typescriptAnalyzer.ts', codeWithDebugger);
    const debuggerIssues = result.issues.filter(i => i.rule === 'debugger');
    expect(debuggerIssues.length).toBeGreaterThan(0);
  });

  it('works with JavaScript analyzer too', async () => {
    const config = {
      ruleExclusions: {
        debugger: ['**/src/analyzers/**'],
      },
    };
    const analyzer = new JavaScriptAnalyzer(config);
    const result = await analyzer.analyze('src/analyzers/javascriptAnalyzer.js', codeWithDebugger);
    const debuggerIssues = result.issues.filter(i => i.rule === 'debugger');
    expect(debuggerIssues).toHaveLength(0);
  });

  it('matches paths with backslash separators (Windows)', async () => {
    const config = {
      ruleExclusions: {
        debugger: ['**/src/analyzers/**'],
      },
    };
    const analyzer = new TypeScriptAnalyzer(config);
    const result = await analyzer.analyze('src\\analyzers\\typescriptAnalyzer.ts', codeWithDebugger);
    const debuggerIssues = result.issues.filter(i => i.rule === 'debugger');
    expect(debuggerIssues).toHaveLength(0);
  });

  it('supports multiple glob patterns per rule', async () => {
    const config = {
      ruleExclusions: {
        debugger: ['**/src/analyzers/**', '**/src/core/**'],
      },
    };
    const analyzer = new TypeScriptAnalyzer(config);

    const result1 = await analyzer.analyze('src/analyzers/foo.ts', codeWithDebugger);
    expect(result1.issues.filter(i => i.rule === 'debugger')).toHaveLength(0);

    const result2 = await analyzer.analyze('src/core/bar.ts', codeWithDebugger);
    expect(result2.issues.filter(i => i.rule === 'debugger')).toHaveLength(0);

    const result3 = await analyzer.analyze('src/server/baz.ts', codeWithDebugger);
    expect(result3.issues.filter(i => i.rule === 'debugger').length).toBeGreaterThan(0);
  });
});
