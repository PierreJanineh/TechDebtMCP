/**
 * Unit tests for SwiftUI Phase-1 check helpers (swiftUiChecks.ts).
 * These functions are also exercised indirectly through swiftAnalyzer.test.ts;
 * this file tests each helper in isolation to achieve >80 % coverage.
 */

import {
  checkExcessiveStateVariables,
  checkObservedObjectMisuse,
  checkMissingEnvironmentValidation,
  checkCombineCircularReferences,
  checkMissingTimerCleanup,
  checkMissingTaskCancellation,
  checkMainThreadSafety,
} from '../swiftUiChecks.js';

const FILE = 'test.swift';

function lines(code: string): string[] {
  return code.split('\n');
}

// ---------------------------------------------------------------------------
// checkExcessiveStateVariables
// ---------------------------------------------------------------------------

describe('checkExcessiveStateVariables', () => {
  it('returns no issues when @State count is at the threshold (5)', () => {
    const code = `
struct SmallView: View {
  @State private var a = ""
  @State private var b = ""
  @State private var c = ""
  @State private var d = ""
  @State private var e = ""
  var body: some View { Text("ok") }
}`;
    const issues = checkExcessiveStateVariables(FILE, lines(code));
    expect(issues).toHaveLength(0);
  });

  it('reports an issue when @State count exceeds 5', () => {
    const code = `
struct BigView: View {
  @State private var a = ""
  @State private var b = ""
  @State private var c = ""
  @State private var d = ""
  @State private var e = ""
  @State private var f = ""
  var body: some View { Text("ok") }
}`;
    const issues = checkExcessiveStateVariables(FILE, lines(code));
    expect(issues).toHaveLength(1);
    expect(issues[0].rule).toBe('swiftui-excessive-state');
    expect(issues[0].severity).toBe('medium');
    expect(issues[0].description).toContain('BigView');
  });

  it('tracks @State counts per-view independently', () => {
    const code = `
struct TinyView: View {
  @State private var x = ""
  var body: some View { Text("x") }
}
struct HugeView: View {
  @State private var a = ""
  @State private var b = ""
  @State private var c = ""
  @State private var d = ""
  @State private var e = ""
  @State private var f = ""
  @State private var g = ""
  var body: some View { Text("huge") }
}`;
    const issues = checkExcessiveStateVariables(FILE, lines(code));
    expect(issues).toHaveLength(1);
    expect(issues[0].description).toContain('HugeView');
  });
});

// ---------------------------------------------------------------------------
// checkObservedObjectMisuse
// ---------------------------------------------------------------------------

describe('checkObservedObjectMisuse', () => {
  it('flags @ObservedObject with inline initialization', () => {
    const code = `struct Foo: View {
  @ObservedObject var vm = MyViewModel()
}`;
    const issues = checkObservedObjectMisuse(FILE, lines(code));
    expect(issues).toHaveLength(1);
    expect(issues[0].rule).toBe('swiftui-state-object-misuse');
    expect(issues[0].severity).toBe('high');
  });

  it('does not flag @ObservedObject passed from outside (no = initialiser)', () => {
    const code = `struct Foo: View {
  @ObservedObject var vm: MyViewModel
}`;
    const issues = checkObservedObjectMisuse(FILE, lines(code));
    expect(issues).toHaveLength(0);
  });

  it('ignores commented-out lines', () => {
    const code = `struct Foo: View {
  // @ObservedObject var vm = MyViewModel()
}`;
    const issues = checkObservedObjectMisuse(FILE, lines(code));
    expect(issues).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// checkMissingEnvironmentValidation
// ---------------------------------------------------------------------------

describe('checkMissingEnvironmentValidation', () => {
  it('flags force-unwrap of an @Environment variable', () => {
    const code = `struct DetailView: View {
  @Environment(\\.dismiss) var dismissAction
  var body: some View {
    Button("Close") { dismissAction! }
  }
}`;
    const issues = checkMissingEnvironmentValidation(FILE, lines(code));
    expect(issues).toHaveLength(1);
    expect(issues[0].rule).toBe('swiftui-env-validation');
    expect(issues[0].severity).toBe('high');
  });

  it('does not flag safe usage of @Environment variable', () => {
    const code = `struct DetailView: View {
  @Environment(\\.dismiss) var dismissAction
  var body: some View {
    Button("Close") { dismissAction() }
  }
}`;
    const issues = checkMissingEnvironmentValidation(FILE, lines(code));
    expect(issues).toHaveLength(0);
  });

  it('ignores force-unwrap in comments', () => {
    const code = `struct DetailView: View {
  @Environment(\\.dismiss) var dismissAction
  var body: some View {
    // Button("X") { dismissAction! }
    Text("ok")
  }
}`;
    const issues = checkMissingEnvironmentValidation(FILE, lines(code));
    expect(issues).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// checkCombineCircularReferences
// ---------------------------------------------------------------------------

describe('checkCombineCircularReferences', () => {
  it('flags .sink followed by self reference without [weak self]', () => {
    const code = `func load() {
  publisher
    .sink { completion in
      self.handleCompletion(completion)
    }
    .store(in: &cancellables)
}`;
    const issues = checkCombineCircularReferences(FILE, lines(code));
    expect(issues).toHaveLength(1);
    expect(issues[0].rule).toBe('swiftui-combine-circular-ref');
    expect(issues[0].severity).toBe('high');
  });

  it('does not flag .sink with [weak self] capture list', () => {
    const code = `func load() {
  publisher
    .sink { [weak self] completion in
      self?.handleCompletion(completion)
    }
    .store(in: &cancellables)
}`;
    const issues = checkCombineCircularReferences(FILE, lines(code));
    expect(issues).toHaveLength(0);
  });

  it('does not flag .sink with [unowned self] capture list', () => {
    const code = `func load() {
  publisher
    .sink { [unowned self] completion in
      self.handleCompletion(completion)
    }
    .store(in: &cancellables)
}`;
    const issues = checkCombineCircularReferences(FILE, lines(code));
    expect(issues).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// checkMissingTimerCleanup
// ---------------------------------------------------------------------------

describe('checkMissingTimerCleanup', () => {
  it('flags Timer.scheduledTimer without invalidate in onDisappear', () => {
    const code = `struct TimerView: View {
  var body: some View {
    Text("tick")
      .onAppear {
        Timer.scheduledTimer(withTimeInterval: 1.0, repeats: true) { _ in }
      }
  }
}`;
    const issues = checkMissingTimerCleanup(FILE, lines(code));
    expect(issues).toHaveLength(1);
    expect(issues[0].rule).toBe('swiftui-timer-cleanup');
    expect(issues[0].severity).toBe('medium');
  });

  it('does not flag Timer when onDisappear + invalidate are present nearby', () => {
    const code = `struct TimerView: View {
  var body: some View {
    Text("tick")
      .onAppear {
        Timer.scheduledTimer(withTimeInterval: 1.0, repeats: true) { _ in }
      }
      .onDisappear {
        invalidate()
      }
  }
}`;
    const issues = checkMissingTimerCleanup(FILE, lines(code));
    expect(issues).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// checkMissingTaskCancellation
// ---------------------------------------------------------------------------

describe('checkMissingTaskCancellation', () => {
  it('flags Task{} without stored handle or @MainActor', () => {
    const code = `struct AsyncView: View {
  var body: some View {
    Text("async")
      .onAppear {
        Task {
          await doWork()
        }
      }
  }
}`;
    const issues = checkMissingTaskCancellation(FILE, lines(code));
    expect(issues).toHaveLength(1);
    expect(issues[0].rule).toBe('swiftui-task-cancellation');
    expect(issues[0].severity).toBe('medium');
  });

  it('does not flag Task when handle is stored with let task =', () => {
    const code = `struct AsyncView: View {
  var body: some View {
    Text("async")
      .onAppear {
        let task = Task {
          await doWork()
        }
        _ = task
      }
  }
}`;
    const issues = checkMissingTaskCancellation(FILE, lines(code));
    expect(issues).toHaveLength(0);
  });

  it('does not flag Task when @MainActor appears within 3 lines before Task{', () => {
    // @MainActor must be within 3 lines before Task{ for the check to skip the issue
    const code = `struct AsyncView: View {
  var body: some View {
    Text("async")
      .onAppear {
        // Run on main actor
        @MainActor func work() async { await doWork() }
        Task {
          await work()
        }
      }
  }
}`;
    const issues = checkMissingTaskCancellation(FILE, lines(code));
    expect(issues).toHaveLength(0);
  });

  it('ignores commented-out Task lines', () => {
    const code = `struct AsyncView: View {
  var body: some View {
    Text("async")
      .onAppear {
        // Task {
        //   await doWork()
        // }
      }
  }
}`;
    const issues = checkMissingTaskCancellation(FILE, lines(code));
    expect(issues).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// checkMainThreadSafety
// ---------------------------------------------------------------------------

describe('checkMainThreadSafety', () => {
  it('flags Task{} followed immediately by self. without @MainActor', () => {
    const code = `struct Foo: View {
  @State private var items: [String] = []
  var body: some View {
    Text("x")
      .onAppear {
        Task {
          self.items = await fetch()
        }
      }
  }
}`;
    const issues = checkMainThreadSafety(FILE, lines(code));
    expect(issues).toHaveLength(1);
    expect(issues[0].rule).toBe('swiftui-main-thread-safety');
    expect(issues[0].severity).toBe('high');
  });

  it('does not flag Task{} with @MainActor annotation nearby', () => {
    const code = `struct Foo: View {
  @State private var items: [String] = []
  var body: some View {
    Text("x")
      .onAppear {
        Task { @MainActor in
          self.items = await fetch()
        }
      }
  }
}`;
    const issues = checkMainThreadSafety(FILE, lines(code));
    expect(issues).toHaveLength(0);
  });

  it('does not flag Task{} with DispatchQueue.main usage', () => {
    const code = `struct Foo: View {
  @State private var items: [String] = []
  var body: some View {
    Text("x")
      .onAppear {
        Task {
          DispatchQueue.main.async { self.items = [] }
        }
      }
  }
}`;
    const issues = checkMainThreadSafety(FILE, lines(code));
    expect(issues).toHaveLength(0);
  });
});
