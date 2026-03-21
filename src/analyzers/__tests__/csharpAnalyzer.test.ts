import { CSharpAnalyzer } from '../csharpAnalyzer.js';

describe('CSharpAnalyzer', () => {
  const analyzer = new CSharpAnalyzer();

  describe('Console/Debug output', () => {
    it('detects Console.WriteLine usage', async () => {
      const code = `Console.WriteLine("debug");`;
      const result = await analyzer.analyze('test.cs', code);
      expect(result.issues).toContainEqual(
        expect.objectContaining({ rule: 'console-writeline', severity: 'low' })
      );
    });

    it('detects Debug.Write usage', async () => {
      const code = `Debug.Write("msg");`;
      const result = await analyzer.analyze('test.cs', code);
      expect(result.issues).toContainEqual(
        expect.objectContaining({ rule: 'debug-writeline', severity: 'low' })
      );
    });
  });

  describe('pragma warning disable', () => {
    it('detects blanket pragma warning disable', async () => {
      const code = `#pragma warning disable`;
      const result = await analyzer.analyze('test.cs', code);
      expect(result.issues).toContainEqual(
        expect.objectContaining({ rule: 'pragma-disable', severity: 'medium' })
      );
    });

    it('does not flag pragma warning disable with specific code', async () => {
      const code = `#pragma warning disable 1234`;
      const result = await analyzer.analyze('test.cs', code);
      expect(result.issues.some(i => i.rule === 'pragma-disable')).toBe(false);
    });
  });

  describe('[Obsolete] attribute', () => {
    it('detects [Obsolete] without message', async () => {
      const code = `[Obsolete]\npublic void OldMethod() {}`;
      const result = await analyzer.analyze('test.cs', code);
      expect(result.issues).toContainEqual(
        expect.objectContaining({ rule: 'obsolete-no-message', severity: 'low' })
      );
    });

    it('does not flag [Obsolete] with message', async () => {
      const code = `[Obsolete("Use NewMethod instead")]\npublic void OldMethod() {}`;
      const result = await analyzer.analyze('test.cs', code);
      expect(result.issues.some(i => i.rule === 'obsolete-no-message')).toBe(false);
    });
  });

  describe('[SuppressMessage] annotation', () => {
    it('detects [SuppressMessage] annotation', async () => {
      const code = `[SuppressMessage("Category", "Rule")]`;
      const result = await analyzer.analyze('test.cs', code);
      expect(result.issues).toContainEqual(
        expect.objectContaining({ rule: 'suppress-message', severity: 'medium' })
      );
    });
  });

  describe('empty catch block', () => {
    it('detects empty catch block', async () => {
      const code = `
try {
  DoSomething();
} catch (Exception ex) {
}
      `;
      const result = await analyzer.analyze('test.cs', code);
      expect(result.issues).toContainEqual(
        expect.objectContaining({ rule: 'empty-catch', severity: 'high' })
      );
    });

    it('does not flag catch block with content', async () => {
      const code = `
try {
  DoSomething();
} catch (Exception ex) {
  logger.LogError(ex, "Error");
}
      `;
      const result = await analyzer.analyze('test.cs', code);
      expect(result.issues.some(i => i.rule === 'empty-catch')).toBe(false);
    });

    it('flags catch block containing only a comment', async () => {
      const code = `
try {
  DoSomething();
} catch (Exception ex) {
  // intentionally ignored
}
      `;
      const result = await analyzer.analyze('test.cs', code);
      expect(result.issues).toContainEqual(
        expect.objectContaining({ rule: 'empty-catch' })
      );
    });

    it('detects single-line empty catch block', async () => {
      const code = `
try {
  DoSomething();
} catch (Exception ex) {}
      `;
      const result = await analyzer.analyze('test.cs', code);
      expect(result.issues).toContainEqual(
        expect.objectContaining({ rule: 'empty-catch' })
      );
    });

    it('does not flag single-line catch block with content', async () => {
      const code = `
try {
  DoSomething();
} catch (Exception ex) { logger.LogError(ex); }
      `;
      const result = await analyzer.analyze('test.cs', code);
      expect(result.issues.some(i => i.rule === 'empty-catch')).toBe(false);
    });

    it('does not produce false negative due to code after single-line empty catch', async () => {
      const code = `
try {
  DoSomething();
} catch (Exception ex) {}
logger.LogInfo("after");
      `;
      const result = await analyzer.analyze('test.cs', code);
      expect(result.issues).toContainEqual(
        expect.objectContaining({ rule: 'empty-catch' })
      );
    });

    it('does not flag single-line catch whose body is a block comment followed by real code', async () => {
      const code = `
try {
  DoSomething();
} catch (Exception ex) { /* suppress */ logger.LogError(ex); }
      `;
      const result = await analyzer.analyze('test.cs', code);
      expect(result.issues.some(i => i.rule === 'empty-catch')).toBe(false);
    });

    it('flags single-line catch whose body contains only a block comment', async () => {
      const code = `
try {
  DoSomething();
} catch (Exception ex) { /* intentionally ignored */ }
      `;
      const result = await analyzer.analyze('test.cs', code);
      expect(result.issues).toContainEqual(
        expect.objectContaining({ rule: 'empty-catch' })
      );
    });

    it('does not flag multi-line catch block with content on the opening brace line', async () => {
      const code = `
try {
  DoSomething();
} catch (Exception ex) { logger.LogError(ex);
}
      `;
      const result = await analyzer.analyze('test.cs', code);
      expect(result.issues.some(i => i.rule === 'empty-catch')).toBe(false);
    });

    it('does not produce false negative for empty catch followed by finally on same closing line', async () => {
      const code = `
try {
  DoSomething();
} catch (Exception ex) {
} finally {
  Cleanup();
}
      `;
      const result = await analyzer.analyze('test.cs', code);
      expect(result.issues).toContainEqual(
        expect.objectContaining({ rule: 'empty-catch' })
      );
    });
  });

  describe('dynamic type', () => {
    it('detects dynamic type usage', async () => {
      const code = `dynamic result = GetValue();`;
      const result = await analyzer.analyze('test.cs', code);
      expect(result.issues).toContainEqual(
        expect.objectContaining({ rule: 'dynamic-type', severity: 'medium' })
      );
    });
  });

  describe('async void', () => {
    it('detects async void method', async () => {
      const code = `public async void LoadData() { await Task.Delay(1); }`;
      const result = await analyzer.analyze('test.cs', code);
      expect(result.issues).toContainEqual(
        expect.objectContaining({ rule: 'async-void', severity: 'high' })
      );
    });

    it('does not flag async void event handler with EventArgs', async () => {
      const code = `private async void Button_Click(object sender, EventArgs e) { await Task.Delay(1); }`;
      const result = await analyzer.analyze('test.cs', code);
      expect(result.issues.some(i => i.rule === 'async-void')).toBe(false);
    });

    it('does not flag async void handler with sender parameter', async () => {
      const code = `private async void OnEvent(object sender, CustomArgs e) { await Task.Delay(1); }`;
      const result = await analyzer.analyze('test.cs', code);
      expect(result.issues.some(i => i.rule === 'async-void')).toBe(false);
    });
  });

  describe('Thread.Sleep', () => {
    it('detects Thread.Sleep usage', async () => {
      const code = `Thread.Sleep(1000);`;
      const result = await analyzer.analyze('test.cs', code);
      expect(result.issues).toContainEqual(
        expect.objectContaining({ rule: 'thread-sleep', severity: 'medium' })
      );
    });
  });

  describe('sync over async', () => {
    it('detects .Result usage', async () => {
      const code = `var value = GetValueAsync().Result;`;
      const result = await analyzer.analyze('test.cs', code);
      expect(result.issues).toContainEqual(
        expect.objectContaining({ rule: 'sync-over-async', severity: 'high' })
      );
    });

    it('detects .Wait() usage', async () => {
      const code = `GetValueAsync().Wait();`;
      const result = await analyzer.analyze('test.cs', code);
      expect(result.issues).toContainEqual(
        expect.objectContaining({ rule: 'sync-over-async', severity: 'high' })
      );
    });
  });

  describe('generic exception catch', () => {
    it('detects catch of generic Exception', async () => {
      const code = `catch (Exception ex) { throw; }`;
      const result = await analyzer.analyze('test.cs', code);
      expect(result.issues).toContainEqual(
        expect.objectContaining({ rule: 'catch-generic-exception', severity: 'medium' })
      );
    });
  });

  describe('GC.Collect', () => {
    it('detects GC.Collect call', async () => {
      const code = `GC.Collect();`;
      const result = await analyzer.analyze('test.cs', code);
      expect(result.issues).toContainEqual(
        expect.objectContaining({ rule: 'gc-collect', severity: 'medium' })
      );
    });
  });

  describe('IDisposable and Dispose pattern', () => {
    it('detects incomplete Dispose pattern', async () => {
      const code = `
public class MyService : IDisposable {
  public void Dispose() {
    _resource.Dispose();
  }
}
      `;
      const result = await analyzer.analyze('test.cs', code);
      expect(result.issues).toContainEqual(
        expect.objectContaining({ rule: 'dispose-pattern', severity: 'medium' })
      );
    });

    it('does not flag class with full Dispose pattern', async () => {
      const code = `
public class MyService : IDisposable {
  public void Dispose() {
    Dispose(true);
    GC.SuppressFinalize(this);
  }
  protected virtual void Dispose(bool disposing) {
    if (disposing) { _resource.Dispose(); }
  }
}
      `;
      const result = await analyzer.analyze('test.cs', code);
      expect(result.issues.some(i => i.rule === 'dispose-pattern')).toBe(false);
    });

    it('detects StreamReader not in using statement', async () => {
      const code = `var reader = new StreamReader(path);`;
      const result = await analyzer.analyze('test.cs', code);
      expect(result.issues).toContainEqual(
        expect.objectContaining({ rule: 'dispose-not-called', severity: 'high' })
      );
    });

    it('does not flag StreamReader in using statement', async () => {
      const code = `using var reader = new StreamReader(path);`;
      const result = await analyzer.analyze('test.cs', code);
      expect(result.issues.some(i => i.rule === 'dispose-not-called')).toBe(false);
    });

    it('does not flag StreamReader in using() block', async () => {
      const code = `using(var reader = new StreamReader(path)) { }`;
      const result = await analyzer.analyze('test.cs', code);
      expect(result.issues.some(i => i.rule === 'dispose-not-called')).toBe(false);
    });
  });
});
