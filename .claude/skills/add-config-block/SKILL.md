---
name: add-config-block
description: Add a new top-level block to .techdebtrc.json — extends TechDebtConfig type, validator, consumer wiring, and dogfood self-scan fixture in one coordinated change.
---

# Add a Config Block

The `.techdebtrc.json` schema has a recurring failure mode (filed under TEC-52 umbrella, instances TEC-49 / 56 / 57 / 58): a key is added to `VALID_CONFIG_KEYS` and validated cleanly, but no code in `analysisEngine.ts` / `baseAnalyzer.ts` ever **reads** it. The validator passes, the user thinks the config works, and the block is silently dead.

This skill enforces the full contract for adding a config block. If any of the 4 steps is skipped, the block is dead config.

## The contract

Adding a config key X means **all four** of the following must land in the same PR:

| Step | File | What |
|------|------|------|
| 1 | `src/types/index.ts` (`TechDebtConfig`) | Add `X?: <type>` to the interface |
| 2 | `src/server/configValidator.ts` | Add `'X'` to `VALID_CONFIG_KEYS` + a `validateXField()` function |
| 3 | `src/core/analysisEngine.ts` or `src/analyzers/baseAnalyzer.ts` | Read `mergedConfig.X` and let it influence output |
| 4 | `tests/fixtures/self-scan/X/` + `src/core/__tests__/selfScan.test.ts` assertion | Fixture project whose output **differs** with and without the block |

Step 4 is the load-bearing one. The self-scan test is what catches the "validated but never consumed" bug class — if the assertion can't tell the difference between "X is set" and "X is omitted," the consumer in step 3 isn't doing anything.

## Procedure

### 1. Brainstorm the semantics first

Before touching code: write down on paper (or in the PR description draft) the **observable effect** of the block. Examples:

- `severity` — "an issue's emitted severity is overridden when its `rule` matches a key in `config.severity`"
- `include` — "files matching no `include` glob are excluded from analysis"
- `languageOverrides` — "language-specific config (e.g. extensions, patterns) is replaced/extended per language"

If you can't state the effect in one sentence, stop. The block is not well-defined yet — that's a brainstorming task, not an implementation task.

### 2. Extend the type

`src/types/index.ts`, in the `TechDebtConfig` interface. Optional (`?`). Use the narrowest plausible type — `Record<string, string[]>` over `Record<string, unknown>` when shape is known.

### 3. Add validation

`src/server/configValidator.ts`:
- Add `'X'` to `VALID_CONFIG_KEYS`.
- Write `validateXField(config, errors, warnings)` following the pattern of the existing `validateRulesField`, `validateSeverityField`, etc.
- Call it from `handleValidateConfig` next to the other validators.
- Keep the function under 50 lines and nesting under 4 levels per `.claude/rules/code-quality.md` — extract a private helper if you need to nest deeper (see `validatePatternRegex` precedent).

### 4. Wire the consumer

Either:
- **`analysisEngine.ts`** — if the block influences file selection or post-processing (like `ignore`).
- **`baseAnalyzer.ts`** — if it influences per-issue analysis (like `rules.maxFileLines`, `ruleExclusions`).
- **A new helper** — if the logic doesn't belong in either. Don't shoehorn.

The consumer **must** be reachable from `analyzeProject`. Trace the call graph mentally — if `mergedConfig.X` is read but the read happens in dead code, the block is still dead.

### 5. Add the self-scan fixture + assertion

Test infrastructure lives at `src/core/__tests__/selfScan.test.ts` with fixtures under `tests/fixtures/self-scan/<block>/`. Pattern (one directory per existing block as reference: `customPatterns/`, `ignore/`, `include/`, `languageOverrides/`, `ruleExclusions/`, `rules/`, `severity/`):

- Create `tests/fixtures/self-scan/X/.techdebtrc.json` containing **only** X, set to a value with an observable effect.
- Create one or more source files under that directory that trigger the observable effect.
- Add an assertion block in `selfScan.test.ts` that the analyze output **with X present** differs from output **with X absent** in the way step 1 described — count, severity, or presence of a specific rule in `issues[]`.

### 6. Update docs

Per `.claude/rules/docs-maintenance.md` — same PR, not deferred:
- `CLAUDE.md` if the block changes a recipe.
- `ARCHITECTURE.md` if it changes data flow.
- `README.md` config-reference block.
- `docs/site/custom-rules.md` or similar if user-facing.

### 7. Verify

```bash
npm install --include=dev --ignore-scripts
npm run typecheck
npm run lint
npm test
npm run build
```

All five must pass. If the self-scan test from step 5 fails when the consumer is removed but passes when it's restored, the contract is enforced.

## Failure-mode reminders

- **"It validates cleanly but nothing happens"** — step 3 is missing or the consumer isn't on the `analyzeProject` call graph.
- **"The test passes with or without the consumer"** — step 5's fixture isn't sensitive enough. The observable effect must be a measurable diff in `issues[]` (count, severity, presence of a specific rule).
- **"The validator rejects valid configs"** — step 2's shape check is too strict. Re-check against the interface in step 2.
