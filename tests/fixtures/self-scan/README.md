# Self-scan fixtures

One sub-directory per `VALID_CONFIG_KEYS` entry in `src/server/configValidator.ts`. Each fixture is a self-contained mini-project whose `.techdebtrc.json` exercises exactly **one** config key, plus the minimum source files needed to observe whether that key takes effect when `AnalysisEngine.analyzeProject()` runs against it.

Consumed by `src/core/__tests__/selfScan.test.ts`. See TEC-55 for the methodology.

**Expected-failure note:** The `customPatterns` fixture drives an intentionally failing test assertion until TEC-49 lands. Until that PR is merged, running `npm test -- selfScan` will show 1 failing / 7 passing. This is a deliberate executable contract, not a bug — the CI state is documented in the PR that introduced these fixtures.
