import { TypeScriptAnalyzer } from '../typescriptAnalyzer.js';
import { JavaScriptAnalyzer } from '../javascriptAnalyzer.js';

describe('false positive prevention', () => {
  it('does not flag the word "debugger" inside string literals', async () => {
    const code = `const msg = 'Remove debugger statements';\n`;
    const analyzer = new TypeScriptAnalyzer({});
    const result = await analyzer.analyze('src/core/engine.ts', code);
    const debuggerIssues = result.issues.filter(i => i.rule === 'debugger');
    expect(debuggerIssues).toHaveLength(0);
  });

  it('does not flag "debugger" inside comments', async () => {
    const code = `// binding.pry (debugger calls)\nconst x = 1;\n`;
    const analyzer = new TypeScriptAnalyzer({});
    const result = await analyzer.analyze('src/analyzers/foo.ts', code);
    const debuggerIssues = result.issues.filter(i => i.rule === 'debugger');
    expect(debuggerIssues).toHaveLength(0);
  });

  it('does not flag "debugger" inside regex pattern definitions', async () => {
    const code = `const re = /(?<!["'])debugger\\b/g;\n`;
    const analyzer = new TypeScriptAnalyzer({});
    const result = await analyzer.analyze('src/analyzers/foo.ts', code);
    const debuggerIssues = result.issues.filter(i => i.rule === 'debugger');
    expect(debuggerIssues).toHaveLength(0);
  });

  it('does not flag @ts-ignore inside regex pattern definitions', async () => {
    const code = `const re = /@ts-ignore/g;\n`;
    const analyzer = new TypeScriptAnalyzer({});
    const result = await analyzer.analyze('src/analyzers/foo.ts', code);
    const tsIgnoreIssues = result.issues.filter(i => i.rule === 'ts-ignore');
    expect(tsIgnoreIssues).toHaveLength(0);
  });

  it('still detects genuine standalone debugger statements', async () => {
    const code = `function broken() {\n  debugger;\n  return 1;\n}\n`;
    const analyzer = new TypeScriptAnalyzer({});
    const result = await analyzer.analyze('src/foo.ts', code);
    const debuggerIssues = result.issues.filter(i => i.rule === 'debugger');
    expect(debuggerIssues).toHaveLength(1);
    expect(debuggerIssues[0].line).toBe(2);
  });

  it('detects debugger without semicolon', async () => {
    const code = `function broken() {\n  debugger\n  return 1;\n}\n`;
    const analyzer = new TypeScriptAnalyzer({});
    const result = await analyzer.analyze('src/foo.ts', code);
    const debuggerIssues = result.issues.filter(i => i.rule === 'debugger');
    expect(debuggerIssues).toHaveLength(1);
  });

  it('still detects genuine // @ts-ignore directives', async () => {
    const code = `// @ts-ignore\nconst x: any = 1;\n`;
    const analyzer = new TypeScriptAnalyzer({});
    const result = await analyzer.analyze('src/foo.ts', code);
    const tsIgnoreIssues = result.issues.filter(i => i.rule === 'ts-ignore');
    expect(tsIgnoreIssues).toHaveLength(1);
  });

  it('detects debugger with trailing comment', async () => {
    const code = `function broken() {\n  debugger; // TODO: remove\n  return 1;\n}\n`;
    const analyzer = new TypeScriptAnalyzer({});
    const result = await analyzer.analyze('src/foo.ts', code);
    const debuggerIssues = result.issues.filter(i => i.rule === 'debugger');
    expect(debuggerIssues).toHaveLength(1);
    expect(debuggerIssues[0].line).toBe(2);
  });

  it('detects inline debugger in if statement', async () => {
    const code = `function broken(cond: boolean) {\n  if (cond) debugger;\n  return 1;\n}\n`;
    const analyzer = new TypeScriptAnalyzer({});
    const result = await analyzer.analyze('src/foo.ts', code);
    const debuggerIssues = result.issues.filter(i => i.rule === 'debugger');
    expect(debuggerIssues).toHaveLength(1);
    expect(debuggerIssues[0].line).toBe(2);
  });

  it('does not flag @ts-ignore inside string literals', async () => {
    const code = `const s = "// @ts-ignore";\n`;
    const analyzer = new TypeScriptAnalyzer({});
    const result = await analyzer.analyze('src/foo.ts', code);
    const tsIgnoreIssues = result.issues.filter(i => i.rule === 'ts-ignore');
    expect(tsIgnoreIssues).toHaveLength(0);
  });

  it('does not flag "debugger" on comment-only lines', async () => {
    const code = `// debugger\nconst x = 1;\n`;
    const analyzer = new TypeScriptAnalyzer({});
    const result = await analyzer.analyze('src/foo.ts', code);
    const debuggerIssues = result.issues.filter(i => i.rule === 'debugger');
    expect(debuggerIssues).toHaveLength(0);
  });

  it('does not flag "debugger" in block comments', async () => {
    const code = `/* debugger */\nconst x = 1;\n`;
    const analyzer = new TypeScriptAnalyzer({});
    const result = await analyzer.analyze('src/foo.ts', code);
    const debuggerIssues = result.issues.filter(i => i.rule === 'debugger');
    expect(debuggerIssues).toHaveLength(0);
  });

  it('does not flag "debugger" in multi-line or JSDoc block comments', async () => {
    const code = `/*\n * debugger\n */\n/** debugger */\n* debugger\nconst x = 1;\n`;
    const analyzer = new TypeScriptAnalyzer({});
    const result = await analyzer.analyze('src/foo.ts', code);
    const debuggerIssues = result.issues.filter(i => i.rule === 'debugger');
    expect(debuggerIssues).toHaveLength(0);
  });

  it('does not flag debugger in JS regex pattern definitions', async () => {
    const code = `const re = /(?<!["'])debugger\\b/g;\n`;
    const analyzer = new JavaScriptAnalyzer({});
    const result = await analyzer.analyze('src/analyzers/foo.js', code);
    const debuggerIssues = result.issues.filter(i => i.rule === 'debugger');
    expect(debuggerIssues).toHaveLength(0);
  });
});

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
