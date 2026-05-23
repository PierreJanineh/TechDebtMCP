#!/usr/bin/env bash
# PreToolUse hook: block local `npm publish` invocations.
#
# Releases publish via the OIDC workflow on tag push (see .github/workflows/
# publish.yml). A local `npm publish` would bypass that and is almost always
# a mistake — `package.json` declares "prepare": "npm run build", so it would
# also re-run the build chain in a non-CI environment.
#
# Exit 2 = hard block. The user can still run `npm publish --dry-run` because
# `--dry-run` is allowlisted below (in any argument position).

set -euo pipefail

# Use python3 to safely parse the JSON tool input — grep/sed breaks on
# values that contain escaped quotes (e.g. bash -lc \"npm publish\").
COMMAND=$(echo "${TOOL_INPUT:-}" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    print(data.get('command', ''))
except Exception:
    pass
" 2>/dev/null || true)

if [ -z "$COMMAND" ]; then
  exit 0
fi

if ! echo "$COMMAND" | grep -qE '(^|[;&|[:space:]])npm[[:space:]]+publish([[:space:]]|$)'; then
  exit 0
fi

# Allow only if every npm publish invocation in the command contains
# --dry-run or --help anywhere in its argument list (not necessarily as the
# first flag). Strip all such allowlisted invocations and re-check: if any
# npm publish remains, it is a bare publish that must be blocked.
#
# The sed pattern strips each npm publish … segment (up to the next command
# separator or end of string) when --dry-run or --help appears anywhere
# in that segment — including after flags that take a value (e.g.
# --access public, --tag next, --otp 123456). The token class [^;&|[:space:]]+
# matches any non-separator, non-space argument.
STRIPPED=$(echo "$COMMAND" | \
  sed -E 's/(^|[;&|[:space:]])npm[[:space:]]+publish([[:space:]]+[^;&|[:space:]]+)*[[:space:]]+(--dry-run|--help)([[:space:]]+[^;&|]*)?([;&|]|$)/\1/g' | \
  sed -E 's/(^|[;&|[:space:]])npm[[:space:]]+publish[[:space:]]+(--dry-run|--help)([[:space:]]|$)/ /g')
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
