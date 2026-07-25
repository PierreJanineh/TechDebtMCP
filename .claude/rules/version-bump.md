---
description: Bump every version-pinned manifest in lockstep with package.json
paths:
  - "package.json"
  - "mcpb/manifest.json"
  - "plugin/.claude-plugin/plugin.json"
  - ".claude-plugin/marketplace.json"
  - "server.json"
---

# Version Bump Checklist

`package.json.version` is the source of truth. At release time, **every** file
below must be set to the exact same version (no ranges, no `^`/`~`). Bump them
in the same commit — never let one lag, or a release ships mismatched metadata.
(`server.json` once drifted to `2.0.2` while the package was at `2.1.0` because it
was the one file not machine-enforced — that gap is now closed; see TEC-77 / #249.)

## Version-pinned files

| File | Version field(s) | Enforced by |
|------|------------------|-------------|
| `package.json` | `version` | — (source of truth) |
| `mcpb/manifest.json` | `version` | `scripts/build-mcpb.mjs:assertVersionsMatch()` + `src/server/__tests__/mcpbManifest.test.ts` |
| `plugin/.claude-plugin/plugin.json` | `version` | `assertVersionsMatch()` + `src/server/__tests__/pluginManifest.test.ts` |
| `.claude-plugin/marketplace.json` | top-level `version` **and** the plugin entry's `version` | `assertVersionsMatch()` + `pluginManifest.test.ts` |
| `server.json` | top-level `version` **and** `packages[0].version` | `assertVersionsMatch()` + `src/server/__tests__/serverManifest.test.ts` |

## Rules

- All five files are machine-enforced: `npm run mcpb:pack` (via `assertVersionsMatch()`)
  and the manifest tests fail CI on any mismatch. You cannot tag a release with them
  out of sync. `server.json` carries the version in **two** fields (`version` and
  `packages[0].version`); both are checked.
- `server.json` invariants beyond the version are locked by
  `src/server/__tests__/serverManifest.test.ts`: the `description` stays within the
  registry schema's 100-char cap, `packages[0].identifier` matches the npm name, and
  the reverse-DNS `name` matches `package.json.mcpName`.
- `CHANGELOG.md` gets a new version entry in the same release commit (see
  `.claude/rules/docs-maintenance.md`).
