---
description: Update documentation files after every implementation PR
---

**After every implementation PR**, update the following files to reflect the changes:

| File | What to update |
|------|----------------|
| `CLAUDE.md` | Architecture tree, request flow, recipes (if new patterns introduced) |
| `ARCHITECTURE.md` | Project structure, component descriptions, dependency graph, data flow diagrams |
| `README.md` | Features list, tool/resource documentation, usage examples, Self-Scan Results block |
| `ROADMAP.md` | Phase status, current status section, "Last Updated" date |
| `CHANGELOG.md` | Add version entry when tagging a release |
| `CONTRIBUTING.md` | Configuration Impact block tracks the same self-scan metrics as `TECH_DEBT_SCAN.md` — keep in sync |
| `TECH_DEBT_SCAN.md` | Refresh after any `tech-debt-mcp-local` scan that changes Health / Debt Score / Issues / Remediation. Canonical source of truth for self-scan metrics — the three derivative blocks in `README.md` / `ARCHITECTURE.md` / `CONTRIBUTING.md` must match whatever this file says, and must be updated in the same commit |

`.github/copilot-instructions.md` is only used for Copilot PR reviews — update its architecture diagram only if the high-level structure changes.

Do not defer docs to a separate PR — include them in the implementation PR.
