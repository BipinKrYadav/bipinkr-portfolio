#!/usr/bin/env bash
# Installs Python deps for the geo-seo skills in remote (cloud) sessions.
[ "${CLAUDE_CODE_REMOTE:-}" = "true" ] || exit 0
ROOT="${CLAUDE_PROJECT_DIR:-$(cd "$(dirname "$0")/../.." && pwd)}"
python3 -m pip install -q --ignore-installed blinker -r "$ROOT/.claude/skills/geo/requirements.txt" >/dev/null 2>&1 || true
