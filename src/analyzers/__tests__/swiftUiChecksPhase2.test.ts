/**
 * Unit tests for SwiftUI Phase-2 check helpers (swiftUiChecksPhase2.ts).
 * Each helper is exercised in isolation to achieve >80 % direct coverage.
 */

import {
  checkMissingIdModifier,
  checkExpensiveViewBodyCalculations,
  checkAnyViewMisuse,
  checkNavigationLinkIssues,
  checkGeometryReaderMisuse,
  checkRetainCyclesInClosures,
  checkDeepViewNesting,
} from '../swiftUiChecksPhase2.js';

const FILE = 'test.swift';

function lines(code: string): string[] {
  return code.split('\n');
}

// ---------------------------------------------------------------------------
// checkMissingIdModifier
// ---------------------------------------------------------------------------

describe('checkMissingIdModifier', () => {
  it('flags ForEach over "items" without .id() or id: parameter', () => {
    const code = `struct Foo: View {
  var body: some View {
    ForEach(items) { item in
      Text(item.name)
    }
  }
}`;
    const issues = checkMissingIdModifier(FILE, lines(code));
    expect(issues).toHaveLength(1);
    expect(issues[0].rule).toBe('swiftui-missing-id');
    expect(issues[0].severity).toBe('medium');
  });

  it('does not flag ForEach with explicit id: parameter', () => {
    const code = `struct Foo: View {
  var body: some View {
    ForEach(items, id: \\.self) { item in
      Text(item.name)
    }
  }
}`;
    const issues = checkMissingIdModifier(FILE, lines(code));
    expect(issues).toHaveLength(0);
  });

  it('does not flag ForEach with .id() modifier', () => {
    const code = `struct Foo: View {
  var body: some View {
    ForEach(items) { item in
      Text(item.name).id(item.id)
    }
  }
}`;
    const issues = checkMissingIdModifier(FILE, lines(code));
    expect(issues).toHaveLength(0);
  });

  it('does not flag ForEach over unrelated variable names', () => {
    const code = `struct Foo: View {
  var body: some View {
    ForEach(numbers) { n in
      Text("\\(n)")
    }
  }
}`;
    // "numbers" contains neither "items" nor "data" as a substring
    const issues = checkMissingIdModifier(FILE, lines(code));
    expect(issues).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// checkExpensiveViewBodyCalculations
// ---------------------------------------------------------------------------

describe('checkExpensiveViewBodyCalculations', () => {
  it('flags .reduce() inside var body', () => {
    const code = `struct SumView: View {
  let nums: [Int]
  var body: some View {
    Text("sum: \\(nums.reduce(0, +))")
  }
}`;
    const issues = checkExpensiveViewBodyCalculations(FILE, lines(code));
    expect(issues.length).toBeGreaterThanOrEqual(1);
    expect(issues[0].rule).toBe('swiftui-expensive-calculation');
    expect(issues[0].severity).toBe('medium');
    expect(issues[0].category).toBe('performance');
  });

  it('flags .sorted inside var body', () => {
    const code = `struct SortedView: View {
  let items: [String]
  var body: some View {
    List(items.sorted(), id: \\.self) { Text($0) }
  }
}`;
    const issues = checkExpensiveViewBodyCalculations(FILE, lines(code));
    expect(issues.length).toBeGreaterThanOrEqual(1);
    expect(issues[0].rule).toBe('swiftui-expensive-calculation');
  });

  it('does not flag .sorted outside var body', () => {
    const code = `struct SortedView: View {
  var sortedItems: [String] { items.sorted() }
  let items: [String]
  var body: some View {
    List(sortedItems, id: \\.self) { Text($0) }
  }
}`;
    const issues = checkExpensiveViewBodyCalculations(FILE, lines(code));
    expect(issues).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// checkAnyViewMisuse
// ---------------------------------------------------------------------------

describe('checkAnyViewMisuse', () => {
  it('flags AnyView( usage', () => {
    const code = `func makeView() -> some View {
  AnyView(Text("hello"))
}`;
    const issues = checkAnyViewMisuse(FILE, lines(code));
    expect(issues).toHaveLength(1);
    expect(issues[0].rule).toBe('swiftui-anyview-misuse');
    expect(issues[0].severity).toBe('medium');
  });

  it('ignores AnyView in a comment', () => {
    const code = `// Use AnyView( only when necessary
struct Foo: View {
  var body: some View { Text("ok") }
}`;
    const issues = checkAnyViewMisuse(FILE, lines(code));
    expect(issues).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// checkNavigationLinkIssues
// ---------------------------------------------------------------------------

describe('checkNavigationLinkIssues', () => {
  it('flags NavigationLink with destination: but no isActive/tag/selection', () => {
    const code = `struct Foo: View {
  var body: some View {
    NavigationLink(
      destination: DetailView()
    ) {
      Text("Go")
    }
  }
}`;
    const issues = checkNavigationLinkIssues(FILE, lines(code));
    expect(issues).toHaveLength(1);
    expect(issues[0].rule).toBe('swiftui-navigationlink-deprecated');
    expect(issues[0].severity).toBe('medium');
  });

  it('does not flag NavigationLink with isActive:', () => {
    const code = `struct Foo: View {
  @State var active = false
  var body: some View {
    NavigationLink(destination: DetailView(), isActive: $active) {
      Text("Go")
    }
  }
}`;
    const issues = checkNavigationLinkIssues(FILE, lines(code));
    expect(issues).toHaveLength(0);
  });

  it('does not flag NavigationLink without destination: keyword', () => {
    const code = `struct Foo: View {
  var body: some View {
    NavigationLink("Go", value: someValue)
  }
}`;
    const issues = checkNavigationLinkIssues(FILE, lines(code));
    expect(issues).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// checkGeometryReaderMisuse
// ---------------------------------------------------------------------------

describe('checkGeometryReaderMisuse', () => {
  it('flags GeometryReader immediately after var body without .frame()', () => {
    const code = `struct Foo: View {
  var body: some View {
    GeometryReader { geo in
      Text("size: \\(geo.size.width)")
    }
  }
}`;
    const issues = checkGeometryReaderMisuse(FILE, lines(code));
    expect(issues.length).toBeGreaterThanOrEqual(1);
    expect(issues[0].rule).toBe('swiftui-geometryreader-root');
    expect(issues[0].severity).toBe('medium');
    expect(issues[0].category).toBe('performance');
  });

  it('does not flag GeometryReader paired with .frame()', () => {
    const code = `struct Foo: View {
  var body: some View {
    GeometryReader { geo in
      Text("hi").frame(width: geo.size.width)
    }
  }
}`;
    const issues = checkGeometryReaderMisuse(FILE, lines(code));
    expect(issues).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// checkRetainCyclesInClosures
// ---------------------------------------------------------------------------

describe('checkRetainCyclesInClosures', () => {
  it('flags .onChange capturing self without [weak self] in a class', () => {
    const code = `class MyVC: UIViewController {
  func setup() {
    view.onChange(of: value) { _ in
      self.update()
    }
  }
}`;
    const issues = checkRetainCyclesInClosures(FILE, lines(code));
    expect(issues).toHaveLength(1);
    expect(issues[0].rule).toBe('swiftui-retain-cycle-closure');
    expect(issues[0].severity).toBe('high');
  });

  it('does not flag .onChange with [weak self]', () => {
    const code = `class MyVC: UIViewController {
  func setup() {
    view.onChange(of: value) { [weak self] _ in
      self?.update()
    }
  }
}`;
    const issues = checkRetainCyclesInClosures(FILE, lines(code));
    expect(issues).toHaveLength(0);
  });

  it('skips struct-based SwiftUI views (value types cannot have retain cycles)', () => {
    const code = `struct ContentView: View {
  var body: some View {
    Text("hi")
      .onChange(of: someValue) { _ in
        self.doSomething()
      }
  }
  func doSomething() {}
}`;
    const issues = checkRetainCyclesInClosures(FILE, lines(code));
    expect(issues).toHaveLength(0);
  });

  it('flags .onReceive capturing self in a class', () => {
    const code = `class Presenter: NSObject {
  func bind() {
    publisher.onReceive(pub) { _ in
      self.reload()
    }
  }
}`;
    const issues = checkRetainCyclesInClosures(FILE, lines(code));
    expect(issues).toHaveLength(1);
    expect(issues[0].rule).toBe('swiftui-retain-cycle-closure');
  });
});

// ---------------------------------------------------------------------------
// checkDeepViewNesting
// ---------------------------------------------------------------------------

describe('checkDeepViewNesting', () => {
  it('flags view body with nesting depth exceeding 6', () => {
    // Build a body with > 6 levels of { nesting
    const code = `struct DeeplyNested: View {
  var body: some View {
    VStack {
      HStack {
        VStack {
          HStack {
            VStack {
              HStack {
                VStack {
                  Text("deep")
                }
              }
            }
          }
        }
      }
    }
  }
}`;
    const issues = checkDeepViewNesting(FILE, lines(code));
    expect(issues).toHaveLength(1);
    expect(issues[0].rule).toBe('swiftui-deep-nesting');
    expect(issues[0].severity).toBe('medium');
    expect(issues[0].category).toBe('maintainability');
  });

  it('does not flag a flat view body', () => {
    const code = `struct ShallowView: View {
  var body: some View {
    VStack {
      Text("a")
      Text("b")
    }
  }
}`;
    const issues = checkDeepViewNesting(FILE, lines(code));
    expect(issues).toHaveLength(0);
  });
});
