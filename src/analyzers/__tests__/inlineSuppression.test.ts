import { TypeScriptAnalyzer } from '../typescriptAnalyzer.js';
import { JavaScriptAnalyzer } from '../javascriptAnalyzer.js';
import { PythonAnalyzer } from '../pythonAnalyzer.js';

describe('inline suppression (techdebt-ignore-next-line)', () => {
  describe('blanket suppression', () => {
    it('suppresses a checkPattern issue when comment precedes the line', async () => {
      const code = [
        'function test() {',
        '  // techdebt-ignore-next-line',
        '  debugger;',
        '  return 1;',
        '}',
      ].join('\n');

      const analyzer = new TypeScriptAnalyzer({});
      const result = await analyzer.analyze('src/foo.ts', code);
      const debuggerIssues = result.issues.filter(i => i.rule === 'debugger');
      expect(debuggerIssues).toHaveLength(0);
    });

    it('suppresses a TODO comment when comment precedes the line', async () => {
      const code = [
        '// techdebt-ignore-next-line',
        '// TODO: this should not be reported',
        'const x = 1;',
      ].join('\n');

      const analyzer = new TypeScriptAnalyzer({});
      const result = await analyzer.analyze('src/foo.ts', code);
      const todoIssues = result.issues.filter(i => i.rule === 'todo-comment');
      expect(todoIssues).toHaveLength(0);
    });

    it('only suppresses the immediately following line', async () => {
      const code = [
        '// techdebt-ignore-next-line',
        'const clean = 1;',
        'debugger;',
      ].join('\n');

      const analyzer = new TypeScriptAnalyzer({});
      const result = await analyzer.analyze('src/foo.ts', code);
      const debuggerIssues = result.issues.filter(i => i.rule === 'debugger');
      expect(debuggerIssues).toHaveLength(1);
    });

    it('does not suppress when there is no preceding comment', async () => {
      const code = [
        'function test() {',
        '  debugger;',
        '}',
      ].join('\n');

      const analyzer = new TypeScriptAnalyzer({});
      const result = await analyzer.analyze('src/foo.ts', code);
      const debuggerIssues = result.issues.filter(i => i.rule === 'debugger');
      expect(debuggerIssues).toHaveLength(1);
    });
  });

  describe('rule-specific suppression', () => {
    it('suppresses only the specified rule', async () => {
      const code = [
        'function test() {',
        '  // techdebt-ignore-next-line debugger',
        '  debugger;',
        '  console.log("test");',
        '}',
      ].join('\n');

      const analyzer = new TypeScriptAnalyzer({});
      const result = await analyzer.analyze('src/foo.ts', code);
      const debuggerIssues = result.issues.filter(i => i.rule === 'debugger');
      const consoleIssues = result.issues.filter(i => i.rule === 'console-log');
      expect(debuggerIssues).toHaveLength(0);
      expect(consoleIssues).toHaveLength(1);
    });

    it('does not suppress a different rule', async () => {
      const code = [
        'function test() {',
        '  // techdebt-ignore-next-line console-log',
        '  debugger;',
        '}',
      ].join('\n');

      const analyzer = new TypeScriptAnalyzer({});
      const result = await analyzer.analyze('src/foo.ts', code);
      const debuggerIssues = result.issues.filter(i => i.rule === 'debugger');
      expect(debuggerIssues).toHaveLength(1);
    });
  });

  describe('multiple suppression comments', () => {
    it('suppresses multiple lines with separate comments', async () => {
      const code = [
        'function test() {',
        '  // techdebt-ignore-next-line',
        '  debugger;',
        '  // techdebt-ignore-next-line',
        '  console.log("test");',
        '}',
      ].join('\n');

      const analyzer = new TypeScriptAnalyzer({});
      const result = await analyzer.analyze('src/foo.ts', code);
      const debuggerIssues = result.issues.filter(i => i.rule === 'debugger');
      const consoleIssues = result.issues.filter(i => i.rule === 'console-log');
      expect(debuggerIssues).toHaveLength(0);
      expect(consoleIssues).toHaveLength(0);
    });
  });

  describe('first line handling', () => {
    it('does not suppress the first line (no preceding line)', async () => {
      const code = 'debugger;\nconst x = 1;';

      const analyzer = new TypeScriptAnalyzer({});
      const result = await analyzer.analyze('src/foo.ts', code);
      const debuggerIssues = result.issues.filter(i => i.rule === 'debugger');
      expect(debuggerIssues).toHaveLength(1);
    });
  });

  describe('works across languages', () => {
    it('works with JavaScript analyzer', async () => {
      const code = [
        '// techdebt-ignore-next-line',
        'debugger;',
      ].join('\n');

      const analyzer = new JavaScriptAnalyzer({});
      const result = await analyzer.analyze('src/foo.js', code);
      const debuggerIssues = result.issues.filter(i => i.rule === 'debugger');
      expect(debuggerIssues).toHaveLength(0);
    });

    it('works with Python analyzer using # comment syntax in source', async () => {
      // The suppression comment uses Python's # syntax to match the language's
      // single-line comment style and LANGUAGE_CONFIGS.python.commentPatterns.single.
      const code = [
        '# techdebt-ignore-next-line',
        'print("debug output")',
      ].join('\n');

      const analyzer = new PythonAnalyzer({});
      const result = await analyzer.analyze('src/foo.py', code);
      const printIssues = result.issues.filter(i => i.rule === 'print-statement');
      expect(printIssues).toHaveLength(0);
    });
  });

  describe('whitespace tolerance', () => {
    it('handles extra spaces in suppression comment', async () => {
      const code = [
        '//   techdebt-ignore-next-line',
        'debugger;',
      ].join('\n');

      const analyzer = new TypeScriptAnalyzer({});
      const result = await analyzer.analyze('src/foo.ts', code);
      const debuggerIssues = result.issues.filter(i => i.rule === 'debugger');
      expect(debuggerIssues).toHaveLength(0);
    });

    it('handles indented suppression comment', async () => {
      const code = [
        'function test() {',
        '    // techdebt-ignore-next-line',
        '    debugger;',
        '}',
      ].join('\n');

      const analyzer = new TypeScriptAnalyzer({});
      const result = await analyzer.analyze('src/foo.ts', code);
      const debuggerIssues = result.issues.filter(i => i.rule === 'debugger');
      expect(debuggerIssues).toHaveLength(0);
    });
  });

  describe('block suppression (techdebt-ignore-start/end)', () => {
    it('suppresses all issues within a blanket block', async () => {
      const code = [
        '// techdebt-ignore-start',
        'debugger;',
        'console.log("test");',
        '// techdebt-ignore-end',
        'debugger;',
      ].join('\n');

      const analyzer = new TypeScriptAnalyzer({});
      const result = await analyzer.analyze('src/foo.ts', code);
      const debuggerIssues = result.issues.filter(i => i.rule === 'debugger');
      const consoleIssues = result.issues.filter(i => i.rule === 'console-log');
      // Only the debugger after the block-end should be flagged
      expect(debuggerIssues).toHaveLength(1);
      expect(debuggerIssues[0].line).toBe(5);
      expect(consoleIssues).toHaveLength(0);
    });

    it('suppresses only the specified rule in a rule-specific block', async () => {
      const code = [
        '// techdebt-ignore-start debugger',
        'debugger;',
        'console.log("test");',
        '// techdebt-ignore-end debugger',
      ].join('\n');

      const analyzer = new TypeScriptAnalyzer({});
      const result = await analyzer.analyze('src/foo.ts', code);
      const debuggerIssues = result.issues.filter(i => i.rule === 'debugger');
      const consoleIssues = result.issues.filter(i => i.rule === 'console-log');
      expect(debuggerIssues).toHaveLength(0);
      expect(consoleIssues).toHaveLength(1);
    });

    it('handles nested blocks', async () => {
      const code = [
        '// techdebt-ignore-start debugger',
        'debugger;',
        '// techdebt-ignore-start console-log',
        'console.log("test");',
        '// techdebt-ignore-end console-log',
        'debugger;',
        'console.log("still flagged");',
        '// techdebt-ignore-end debugger',
      ].join('\n');

      const analyzer = new TypeScriptAnalyzer({});
      const result = await analyzer.analyze('src/foo.ts', code);
      const debuggerIssues = result.issues.filter(i => i.rule === 'debugger');
      const consoleIssues = result.issues.filter(i => i.rule === 'console-log');
      expect(debuggerIssues).toHaveLength(0);
      // Line 7 console.log is still within debugger block but not console-log block
      expect(consoleIssues).toHaveLength(1);
      expect(consoleIssues[0].line).toBe(7);
    });

    it('suppresses TODO comments within a block', async () => {
      const code = [
        '// techdebt-ignore-start todo-comment',
        '// TODO: this should not be reported',
        '// techdebt-ignore-end todo-comment',
        '// TODO: this should be reported',
      ].join('\n');

      const analyzer = new TypeScriptAnalyzer({});
      const result = await analyzer.analyze('src/foo.ts', code);
      const todoIssues = result.issues.filter(i => i.rule === 'todo-comment');
      expect(todoIssues).toHaveLength(1);
      expect(todoIssues[0].line).toBe(4);
    });

    it('does not suppress outside the block', async () => {
      const code = [
        'debugger;',
        '// techdebt-ignore-start',
        'debugger;',
        '// techdebt-ignore-end',
        'debugger;',
      ].join('\n');

      const analyzer = new TypeScriptAnalyzer({});
      const result = await analyzer.analyze('src/foo.ts', code);
      const debuggerIssues = result.issues.filter(i => i.rule === 'debugger');
      expect(debuggerIssues).toHaveLength(2);
      expect(debuggerIssues[0].line).toBe(1);
      expect(debuggerIssues[1].line).toBe(5);
    });
  });

  describe('non-null-assertion block suppression (checkNonNullAssertions bespoke path)', () => {
    it('suppresses non-null assertions within a rule-specific block', async () => {
      const code = [
        'const a = foo!.bar;',
        '// techdebt-ignore-start non-null-assertion',
        'const b = foo!.bar;',
        'const c = baz!.qux;',
        '// techdebt-ignore-end non-null-assertion',
        'const d = foo!.bar;',
      ].join('\n');

      const analyzer = new TypeScriptAnalyzer({});
      const result = await analyzer.analyze('src/foo.ts', code);
      const nonNullIssues = result.issues.filter(i => i.rule === 'non-null-assertion');
      // Lines 1 and 6 are outside the block — both should be reported
      expect(nonNullIssues).toHaveLength(2);
      expect(nonNullIssues[0].line).toBe(1);
      expect(nonNullIssues[1].line).toBe(6);
    });

    it('suppresses all non-null assertions within a blanket block', async () => {
      const code = [
        '// techdebt-ignore-start',
        'const x = foo!.bar;',
        'const y = baz!.qux;',
        '// techdebt-ignore-end',
        'const z = foo!.bar;',
      ].join('\n');

      const analyzer = new TypeScriptAnalyzer({});
      const result = await analyzer.analyze('src/foo.ts', code);
      const nonNullIssues = result.issues.filter(i => i.rule === 'non-null-assertion');
      // Only line 5 is outside the block
      expect(nonNullIssues).toHaveLength(1);
      expect(nonNullIssues[0].line).toBe(5);
    });

    it('does not suppress non-null assertions outside the block', async () => {
      const code = [
        'const a = foo!.bar;',
        '// techdebt-ignore-start non-null-assertion',
        '// techdebt-ignore-end non-null-assertion',
        'const b = baz!.qux;',
      ].join('\n');

      const analyzer = new TypeScriptAnalyzer({});
      const result = await analyzer.analyze('src/foo.ts', code);
      const nonNullIssues = result.issues.filter(i => i.rule === 'non-null-assertion');
      expect(nonNullIssues).toHaveLength(2);
      expect(nonNullIssues[0].line).toBe(1);
      expect(nonNullIssues[1].line).toBe(4);
    });
  });
});
