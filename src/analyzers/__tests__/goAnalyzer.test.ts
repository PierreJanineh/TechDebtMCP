import { GoAnalyzer } from '../goAnalyzer';

describe('GoAnalyzer', () => {
  const analyzer = new GoAnalyzer();

  it('detects ignored error returns', async () => {
    const code = `
      func main() {
        _ = someFunction()
      }
    `;
    const result = await analyzer.analyze('test.go', code);
    expect(result.issues).toContainEqual(
      expect.objectContaining({
        rule: 'ignored-error',
        severity: 'medium',
      })
    );
  });

  it('detects blank imports', async () => {
    const code = `import _ "github.com/lib/pq"`;
    const result = await analyzer.analyze('test.go', code);
    expect(result.issues).toContainEqual(
      expect.objectContaining({
        rule: 'blank-import',
        severity: 'low',
      })
    );
  });

  it('detects fmt.Print statements', async () => {
    const code = `
      func main() {
        fmt.Println("Debug output")
      }
    `;
    const result = await analyzer.analyze('test.go', code);
    expect(result.issues).toContainEqual(
      expect.objectContaining({
        rule: 'fmt-print',
        severity: 'low',
      })
    );
  });

  it('detects panic() calls', async () => {
    const code = `
      func main() {
        panic("Something went wrong")
      }
    `;
    const result = await analyzer.analyze('test.go', code);
    expect(result.issues).toContainEqual(
      expect.objectContaining({
        rule: 'panic-usage',
        severity: 'high',
      })
    );
  });

  it('detects init() functions', async () => {
    const code = `
      func init() {
        setupConfig()
      }
    `;
    const result = await analyzer.analyze('test.go', code);
    expect(result.issues).toContainEqual(
      expect.objectContaining({
        rule: 'init-function',
        severity: 'medium',
      })
    );
  });

  it('detects global variables', async () => {
    const code = `var globalCounter = 0`;
    const result = await analyzer.analyze('test.go', code);
    expect(result.issues).toContainEqual(
      expect.objectContaining({
        rule: 'global-variable',
        severity: 'medium',
      })
    );
  });

  it('detects nolint comments', async () => {
    const code = `
      func test() {
        // nolint
        x := 5
      }
    `;
    const result = await analyzer.analyze('test.go', code);
    expect(result.issues).toContainEqual(
      expect.objectContaining({
        rule: 'nolint-comment',
        severity: 'medium',
      })
    );
  });

  it('handles code with no issues', async () => {
    const code = `
      package main

      func add(a, b int) int {
        return a + b
      }
    `;
    const result = await analyzer.analyze('test.go', code);
    const goSpecificIssues = result.issues.filter(i =>
      ['ignored-error', 'blank-import', 'fmt-print', 'panic-usage', 'init-function', 'global-variable', 'nolint-comment'].includes(i.rule)
    );
    expect(goSpecificIssues).toHaveLength(0);
  });

  it('detects multiple issues in the same file', async () => {
    const code = `
      package main
      
      import _ "database/sql"
      
      var config string = ""
      
      func main() {
        fmt.Println("Starting")
        panic("error")
      }
    `;
    const result = await analyzer.analyze('test.go', code);
    expect(result.issues.length).toBeGreaterThan(2);
  });
});

