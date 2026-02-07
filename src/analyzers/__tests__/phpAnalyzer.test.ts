import { PhpAnalyzer } from '../phpAnalyzer';

describe('PhpAnalyzer', () => {
  const analyzer = new PhpAnalyzer();

  it('detects var_dump() calls', async () => {
    const code = `
      <?php
      var_dump($variable);
    `;
    const result = await analyzer.analyze('test.php', code);
    expect(result.issues).toContainEqual(
      expect.objectContaining({
        rule: 'var-dump',
        severity: 'medium',
      })
    );
  });

  it('detects print_r() calls', async () => {
    const code = `
      <?php
      print_r($array);
    `;
    const result = await analyzer.analyze('test.php', code);
    expect(result.issues).toContainEqual(
      expect.objectContaining({
        rule: 'print-r',
        severity: 'medium',
      })
    );
  });

  it('detects die() calls', async () => {
    const code = `
      <?php
      die("Fatal error");
    `;
    const result = await analyzer.analyze('test.php', code);
    expect(result.issues).toContainEqual(
      expect.objectContaining({
        rule: 'die-exit',
        severity: 'high',
      })
    );
  });

  it('detects exit() calls', async () => {
    const code = `
      <?php
      exit(1);
    `;
    const result = await analyzer.analyze('test.php', code);
    expect(result.issues).toContainEqual(
      expect.objectContaining({
        rule: 'die-exit',
        severity: 'high',
      })
    );
  });

  it('detects eval() usage', async () => {
    const code = `
      <?php
      $code = 'echo "hello";';
      eval($code);
    `;
    const result = await analyzer.analyze('test.php', code);
    expect(result.issues).toContainEqual(
      expect.objectContaining({
        rule: 'eval-usage',
        severity: 'critical',
      })
    );
  });

  it('detects error suppression operator', async () => {
    const code = `
      <?php
      $result = @fopen('file.txt', 'r');
      @trigger_error("warning");
    `;
    const result = await analyzer.analyze('test.php', code);
    expect(result.issues).toContainEqual(
      expect.objectContaining({
        rule: 'error-suppression',
        severity: 'medium',
      })
    );
  });

  it('detects global keyword', async () => {
    const code = `
      <?php
      function test() {
        global $globalVar;
      }
    `;
    const result = await analyzer.analyze('test.php', code);
    expect(result.issues).toContainEqual(
      expect.objectContaining({
        rule: 'global-usage',
        severity: 'medium',
      })
    );
  });

  it('detects extract() function', async () => {
    const code = `
      <?php
      extract($array);
    `;
    const result = await analyzer.analyze('test.php', code);
    expect(result.issues).toContainEqual(
      expect.objectContaining({
        rule: 'extract-usage',
        severity: 'high',
      })
    );
  });

  it('detects @phpcs:ignore comments', async () => {
    const code = `
      <?php
      // @phpcs:ignore Generic.Formatting.DisallowMultipleStatements.SameLine
      $x = 1; $y = 2;
    `;
    const result = await analyzer.analyze('test.php', code);
    expect(result.issues).toContainEqual(
      expect.objectContaining({
        rule: 'phpcs-ignore',
        severity: 'medium',
      })
    );
  });

  it('handles clean PHP code', async () => {
    const code = `
      <?php
      function add($a, $b) {
        return $a + $b;
      }
      
      echo add(5, 3);
    `;
    const result = await analyzer.analyze('test.php', code);
    const phpSpecificIssues = result.issues.filter(i =>
      ['var-dump', 'print-r', 'die-exit', 'eval-usage', 'global-usage', 'extract-usage'].includes(i.rule)
    );
    expect(phpSpecificIssues).toHaveLength(0);
  });

  it('detects multiple issues in same file', async () => {
    const code = `
      <?php
      function debug() {
        var_dump($data);
        print_r($array);
        @fopen('file', 'r');
        die("Error");
      }
      
      global $counter;
      extract($_POST);
    `;
    const result = await analyzer.analyze('test.php', code);
    expect(result.issues.length).toBeGreaterThan(4);
  });
});

