import { RustAnalyzer } from '../rustAnalyzer';

describe('RustAnalyzer', () => {
  const analyzer = new RustAnalyzer();

  it('detects unwrap() calls', async () => {
    const code = `
      fn main() {
        let value = some_option.unwrap();
      }
    `;
    const result = await analyzer.analyze('test.rs', code);
    expect(result.issues).toContainEqual(
      expect.objectContaining({
        rule: 'unwrap-usage',
        severity: 'high',
      })
    );
  });

  it('detects expect() calls', async () => {
    const code = `
      fn main() {
        let value = some_result.expect("Failed");
      }
    `;
    const result = await analyzer.analyze('test.rs', code);
    expect(result.issues).toContainEqual(
      expect.objectContaining({
        rule: 'expect-usage',
        severity: 'medium',
      })
    );
  });

  it('detects unsafe blocks', async () => {
    const code = `
      unsafe {
        let ptr = raw_pointer as *const u32;
      }
    `;
    const result = await analyzer.analyze('test.rs', code);
    expect(result.issues).toContainEqual(
      expect.objectContaining({
        rule: 'unsafe-block',
        severity: 'high',
      })
    );
  });

  it('detects allow attributes', async () => {
    const code = `
      #[allow(dead_code)]
      fn unused_function() {}
    `;
    const result = await analyzer.analyze('test.rs', code);
    expect(result.issues).toContainEqual(
      expect.objectContaining({
        rule: 'allow-attribute',
        severity: 'medium',
      })
    );
  });

  it('detects clippy allow directives', async () => {
    const code = `
      #[allow(clippy::while_let_on_iterator)]
      fn example() {}
    `;
    const result = await analyzer.analyze('test.rs', code);
    expect(result.issues).toContainEqual(
      expect.objectContaining({
        rule: 'clippy-allow',
        severity: 'medium',
      })
    );
  });

  it('detects panic! macro', async () => {
    const code = `
      fn main() {
        panic!("Something went wrong");
      }
    `;
    const result = await analyzer.analyze('test.rs', code);
    expect(result.issues).toContainEqual(
      expect.objectContaining({
        rule: 'panic-macro',
        severity: 'high',
      })
    );
  });

  it('detects println! macro', async () => {
    const code = `
      fn main() {
        println!("Debug info");
      }
    `;
    const result = await analyzer.analyze('test.rs', code);
    expect(result.issues).toContainEqual(
      expect.objectContaining({
        rule: 'println-macro',
        severity: 'low',
      })
    );
  });

  it('detects dbg! macro', async () => {
    const code = `
      fn main() {
        let x = dbg!(5 + 6);
      }
    `;
    const result = await analyzer.analyze('test.rs', code);
    expect(result.issues).toContainEqual(
      expect.objectContaining({
        rule: 'dbg-macro',
        severity: 'medium',
      })
    );
  });

  it('detects todo! macro', async () => {
    const code = `
      fn unimplemented_feature() {
        todo!("Implement this");
      }
    `;
    const result = await analyzer.analyze('test.rs', code);
    expect(result.issues).toContainEqual(
      expect.objectContaining({
        rule: 'todo-macro',
        severity: 'high',
      })
    );
  });

  it('detects unimplemented! macro', async () => {
    const code = `
      fn unsupported() {
        unimplemented!();
      }
    `;
    const result = await analyzer.analyze('test.rs', code);
    expect(result.issues).toContainEqual(
      expect.objectContaining({
        rule: 'unimplemented-macro',
        severity: 'high',
      })
    );
  });

  it('handles clean Rust code', async () => {
    const code = `
      fn add(a: i32, b: i32) -> i32 {
        a + b
      }
    `;
    const result = await analyzer.analyze('test.rs', code);
    const rustSpecificIssues = result.issues.filter(i => 
      ['unwrap-usage', 'expect-usage', 'unsafe-block', 'panic-macro', 'todo-macro'].includes(i.rule)
    );
    expect(rustSpecificIssues).toHaveLength(0);
  });
});

