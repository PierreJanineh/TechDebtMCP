#!/usr/bin/env bash
# PostToolUse hook: when src/server/tools.ts is edited, remind the user to also
# update mcpb/manifest.json. The mcpbManifest.test.ts test enforces this in CI,
# but a fast nudge at edit time saves a CI round-trip.
#
# Non-blocking: prints to stderr and exits 0 so the edit succeeds. Use exit 2
# to upgrade to a hard block once the team is comfortable with the warning.

set -euo pipefail

# Use python3 to safely parse the JSON tool input — grep/sed breaks on
# values that contain escaped quotes or other JSON special characters.
FILE_PATH=$(echo "${TOOL_INPUT:-}" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    print(data.get('file_path', ''))
except Exception:
    pass
" 2>/dev/null || true)

if [ -z "$FILE_PATH" ]; then
  exit 0
fi

case "$FILE_PATH" in
  */src/server/tools.ts) ;;
  *) exit 0 ;;
esac

REPO_ROOT=$(git rev-parse --show-toplevel 2>/dev/null || echo "")
if [ -z "$REPO_ROOT" ]; then
  exit 0
fi

MANIFEST="$REPO_ROOT/mcpb/manifest.json"
if [ ! -f "$MANIFEST" ]; then
  exit 0
fi

if git -C "$REPO_ROOT" diff --name-only HEAD -- mcpb/manifest.json 2>/dev/null | grep -q .; then
  exit 0
fi

if git -C "$REPO_ROOT" diff --name-only --cached -- mcpb/manifest.json 2>/dev/null | grep -q .; then
  exit 0
fi

cat >&2 <<'MSG'
⚠️  You edited src/server/tools.ts but mcpb/manifest.json has no pending changes.
   src/server/__tests__/mcpbManifest.test.ts enforces these stay in sync — if
   you added/removed/renamed a tool, update mcpb/manifest.json in this PR.
MSG

exit 0
