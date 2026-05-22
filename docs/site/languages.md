---
title: Language Coverage
outline: deep
---

# Language Coverage

Tech Debt MCP analyzes **14 languages** for code-quality issues and **10 package ecosystems** for offline dependency inventory.

## Code analyzers

| Language    | Analyzer                        | Notes                                                                |
| ----------- | ------------------------------- | -------------------------------------------------------------------- |
| TypeScript  | `typescriptAnalyzer.ts`          | Strict-mode awareness, `any`/`@ts-ignore`/`as any` detection.        |
| JavaScript  | `javascriptAnalyzer.ts`          | Shared base with TS; ES module + CJS support.                        |
| Python      | `pythonAnalyzer.ts`              | PEP 8 hints, `print()` left in code, broad `except` blocks.          |
| Java        | `javaAnalyzer.ts`                | TODO/FIXME, exception swallowing, magic numbers.                     |
| Kotlin      | `kotlinAnalyzer.ts`              | Nullability hints, `!!` operator misuse.                             |
| Swift       | `swiftAnalyzer.ts` (+ SwiftUI Phase 1/2 checks) | Force-unwraps, `print()`, SwiftUI-specific patterns.    |
| Objective-C | `objectivecAnalyzer.ts`          | Memory-management hints, `NSLog` leakage.                            |
| Go          | `goAnalyzer.ts`                  | Empty error returns, `fmt.Println` in production paths.              |
| Rust        | `rustAnalyzer.ts`                | `unwrap()`/`expect()` overuse, `dbg!` left in code.                  |
| Ruby        | `rubyAnalyzer.ts`                | `puts` in production code, `rescue Exception` antipattern.           |
| PHP         | `phpAnalyzer.ts`                 | `var_dump`/`die` debugging leftovers.                                |
| C#          | `csharpAnalyzer.ts`              | `Console.WriteLine`, empty `catch` blocks.                           |
| C++         | `cppAnalyzer.ts`                 | `printf` in production paths, `goto` usage.                          |
| C           | `cAnalyzer.ts`                   | Same family as C++; tuned for K&R idioms.                            |

Every analyzer extends `BaseAnalyzer` and emits issues via `checkPattern` — see [`ARCHITECTURE.md`](/architecture) for the full flow.

## Dependency parsers

| Ecosystem  | Parser                  | Manifest files                                                  |
| ---------- | ----------------------- | --------------------------------------------------------------- |
| npm        | `npmParser.ts`          | `package.json`, `package-lock.json`                             |
| pip        | `pipParser.ts`          | `requirements.txt`, `Pipfile`, `pyproject.toml` (Poetry)        |
| Cargo      | `cargoParser.ts`        | `Cargo.toml`                                                    |
| Gradle     | `gradleParser.ts`       | `build.gradle`, `build.gradle.kts`                              |
| NuGet      | `nugetParser.ts`        | `*.csproj`, `packages.config`                                   |
| Go modules | `goModParser.ts`        | `go.mod`                                                        |
| Composer   | `composerParser.ts`     | `composer.json`                                                 |
| Bundler    | `bundlerParser.ts`      | `Gemfile`                                                       |
| SwiftPM    | `swiftPackageParser.ts` | `Package.swift`                                                 |
| C/C++      | `cppParser.ts`          | `vcpkg.json`                                                    |

All ecosystems flow through the same `check_dependencies` and `get_vulnerability_report` tools — see the [tool reference](/tools/).

## Adding a language

See `CLAUDE.md` → _Adding a New Language Analyzer_ for the 5-step recipe.
