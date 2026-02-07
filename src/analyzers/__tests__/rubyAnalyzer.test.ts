import { RubyAnalyzer } from '../rubyAnalyzer.js';

describe('RubyAnalyzer', () => {
  const analyzer = new RubyAnalyzer();

  it('detects puts statements', async () => {
    const code = `
      def main
        puts "Debug output"
      end
    `;
    const result = await analyzer.analyze('test.rb', code);
    expect(result.issues).toContainEqual(
      expect.objectContaining({
        rule: 'puts-statement',
        severity: 'low',
      })
    );
  });

  it('detects binding.pry', async () => {
    const code = `
      def debug_function
        binding.pry
      end
    `;
    const result = await analyzer.analyze('test.rb', code);
    expect(result.issues).toContainEqual(
      expect.objectContaining({
        rule: 'binding-pry',
        severity: 'high',
      })
    );
  });

  it('detects rubocop:disable comments', async () => {
    const code = `
      # rubocop:disable Style/StringLiterals
      x = "test"
    `;
    const result = await analyzer.analyze('test.rb', code);
    expect(result.issues).toContainEqual(
      expect.objectContaining({
        rule: 'rubocop-disable',
        severity: 'medium',
      })
    );
  });

  it('detects eval() usage', async () => {
    const code = `
      code = "puts 'hello'"
      eval(code)
    `;
    const result = await analyzer.analyze('test.rb', code);
    expect(result.issues).toContainEqual(
      expect.objectContaining({
        rule: 'eval-usage',
        severity: 'critical',
      })
    );
  });

  it('detects global variables', async () => {
    const code = `
      $global_var = 42
    `;
    const result = await analyzer.analyze('test.rb', code);
    expect(result.issues).toContainEqual(
      expect.objectContaining({
        rule: 'global-variable',
        severity: 'medium',
      })
    );
  });

  it('detects class variables', async () => {
    const code = `
      class MyClass
        @@count = 0
      end
    `;
    const result = await analyzer.analyze('test.rb', code);
    expect(result.issues).toContainEqual(
      expect.objectContaining({
        rule: 'class-variable',
        severity: 'medium',
      })
    );
  });

  it('detects rescue Exception', async () => {
    const code = `
      begin
        risky_operation()
      rescue Exception
        puts "Error"
      end
    `;
    const result = await analyzer.analyze('test.rb', code);
    expect(result.issues).toContainEqual(
      expect.objectContaining({
        rule: 'rescue-exception',
        severity: 'high',
      })
    );
  });

  it('handles clean Ruby code', async () => {
    const code = `
      def add(a, b)
        a + b
      end
      
      add(5, 3)
    `;
    const result = await analyzer.analyze('test.rb', code);
    const rubySpecificIssues = result.issues.filter(i =>
      ['puts-statement', 'binding-pry', 'eval-usage', 'global-variable', 'rescue-exception'].includes(i.rule)
    );
    expect(rubySpecificIssues).toHaveLength(0);
  });

  it('detects multiple issues in same file', async () => {
    const code = `
      $global = 1
      @@class_var = 2
      
      puts "Debug"
      binding.pry
      
      begin
        do_something
      rescue Exception
        puts "Error"
      end
    `;
    const result = await analyzer.analyze('test.rb', code);
    expect(result.issues.length).toBeGreaterThan(3);
  });
});

