#!/usr/bin/env bash
# PreToolUse hook: block local `npm publish` invocations.
#
# Releases publish via the OIDC workflow on tag push (see .github/workflows/
# publish.yml). A local `npm publish` would bypass that and is almost always
# a mistake — `package.json` declares "prepare": "npm run build", so it would
# also re-run the build chain in a non-CI environment.
#
# Exit 2 = hard block. The user can still run `npm publish --dry-run` because
# `--dry-run` is allowlisted below.

set -euo pipefail

COMMAND=$(echo "${TOOL_INPUT:-}" | grep -o '"command"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | sed 's/.*"command"[[:space:]]*:[[:space:]]*"//;s/"$//' || true)

if [ -z "$COMMAND" ]; then
  exit 0
fi

if ! echo "$COMMAND" | grep -qE '(^|[;&|[:space:]])npm[[:space:]]+publish([[:space:]]|$)'; then
  exit 0
fi

# Allow only if every npm publish invocation in the command is followed by
# --dry-run or --help (i.e. no bare publish slips through after a separator).
# Strip all allowlisted invocations and re-check: if any npm publish remains,
# it is a bare publish that must be blocked.
STRIPPED=$(echo "$COMMAND" | sed -E 's/(^|[;&|[:space:]])npm[[:space:]]+publish[[:space:]]+(--dry-run|--help)([[:space:]]|$)/ /g')
if ! echo "$STRIPPED" | grep -qE '(^|[;&|[:space:]])npm[[:space:]]+publish([[:space:]]|$)'; then
  exit 0
fi

cat >&2 <<'MSG'
BLOCK: Do not run `npm publish` locally.

Releases for this package go through the OIDC workflow in
.github/workflows/publish.yml, triggered by a tag push. Local publish would
bypass tag/version validation and would also fire the `prepare` hook, which
re-runs `npm run build` outside CI.

If you genuinely need to dry-run the publish, append `--dry-run`.
If a release is broken, fix it on the tag/workflow side — do not work around.
MSG

exit 2
