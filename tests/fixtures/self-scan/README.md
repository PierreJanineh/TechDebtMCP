# Self-scan fixtures

One sub-directory per `VALID_CONFIG_KEYS` entry in `src/server/configValidator.ts`. Each fixture is a self-contained mini-project whose `.techdebtrc.json` exercises exactly **one** config key, plus the minimum source files needed to observe whether that key takes effect when `AnalysisEngine.analyzeProject()` runs against it.

Consumed by `src/core/__tests__/selfScan.test.ts`. See TEC-55 for the methodology.
