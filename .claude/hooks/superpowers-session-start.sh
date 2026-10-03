#!/usr/bin/env bash
# Injects the superpowers "using-superpowers" skill into every session
# (adapted from the superpowers plugin's hooks/session-start).
set -euo pipefail
ROOT="${CLAUDE_PROJECT_DIR:-$(cd "$(dirname "$0")/../.." && pwd)}"
content=$(cat "$ROOT/.claude/skills/using-superpowers/SKILL.md" 2>/dev/null || echo "using-superpowers skill not found")
python3 - "$content" <<'PY'
import json, sys
ctx = ("<EXTREMELY_IMPORTANT>\nYou have superpowers.\n\n**Below is the full content of your "
       "'using-superpowers' skill - your introduction to using skills. For all other skills, "
       "use the 'Skill' tool:**\n\n" + sys.argv[1] + "\n</EXTREMELY_IMPORTANT>")
print(json.dumps({"hookSpecificOutput": {"hookEventName": "SessionStart", "additionalContext": ctx}}))
PY
