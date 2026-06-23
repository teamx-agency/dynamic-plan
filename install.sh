#!/usr/bin/env bash
# dynamic-plan/install.sh
# Cross-platform installer. Detects platform + available agent homes and
# syncs the skill + slash command to each. Safe to re-run (overwrites).
#
# Usage:
#   bash install.sh                # install everywhere
#   bash install.sh --uninstall    # remove from everywhere
#
# Override install location with DYNAMIC_PLAN_HOME=/some/path

set -euo pipefail

# ---------- locate this script's directory ----------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SRC="$SCRIPT_DIR"

if [[ ! -f "$SRC/SKILL.md" || ! -f "$SRC/assets/components.js" ]]; then
  echo "✗ Master copy not found at $SRC" >&2
  echo "  Expected SKILL.md and assets/components.js in the same dir as this script." >&2
  exit 1
fi

# ---------- handle uninstall ----------
if [[ "${1:-}" == "--uninstall" ]]; then
  echo "Uninstalling dynamic-plan from all platforms…"
  rm -rf "$HOME/.claude/skills/dynamic-plan" "$HOME/.codex/skills/dynamic-plan" \
         "$HOME/.hermes/skills/dynamic-plan" "$HOME/.pi/agent/skills/dynamic-plan" \
         "$HOME/.agents/skills/dynamic-plan" 2>/dev/null || true
  rm -f  "$HOME/.claude/commands/dynamic-plan.md" \
         "$HOME/.codex/commands/dynamic-plan.md" \
         "$HOME/.hermes/commands/dynamic-plan.md" \
         "$HOME/.config/opencode/command/dynamic-plan.md" 2>/dev/null || true
  echo "✓ Uninstalled"
  exit 0
fi

# ---------- platform detection ----------
case "$(uname -s 2>/dev/null || echo Windows)" in
  Linux*)   PLATFORM=linux   ;;
  Darwin*)  PLATFORM=macos   ;;
  MINGW*|MSYS*|CYGWIN*)
    if [[ -n "${WSL_DISTRO_NAME:-}" ]]; then
      PLATFORM=wsl
    else
      echo "✗ Native Windows is not supported. Use WSL (Windows Subsystem for Linux)." >&2
      exit 1
    fi
    ;;
  *) PLATFORM=unknown ;;
esac

echo "▶ Detected platform: $PLATFORM"
echo "  HOME = $HOME"
echo ""

# Ensure target dirs exist
mkdir -p "$HOME/.claude/skills"      "$HOME/.codex/skills" \
         "$HOME/.hermes/skills"      "$HOME/.pi/agent/skills" \
         "$HOME/.agents/skills"      \
         "$HOME/.claude/commands"    "$HOME/.codex/commands" \
         "$HOME/.hermes/commands"    "$HOME/.config/opencode/command"

# Helper: copy a folder (rm then cp -R for idempotency)
sync() {
  local dst="$1"
  rm -rf "$dst"
  cp -R "$SRC" "$dst"
  echo "✓ $dst"
}

# Master copy lives at ~/.agents/skills/dynamic-plan/ (most widely accessible).
sync "$HOME/.agents/skills/dynamic-plan"

# Platform-specific skill folders
sync "$HOME/.claude/skills/dynamic-plan"
sync "$HOME/.codex/skills/dynamic-plan"
sync "$HOME/.hermes/skills/dynamic-plan"
sync "$HOME/.pi/agent/skills/dynamic-plan"

# Slash command files (so /dynamic-plan works as a typed command)
cat > "$HOME/.claude/commands/dynamic-plan.md" <<'EOF'
---
description: Generate an interactive .mdx plan (Figkit-style wireframes, Mermaid diagrams, decision forms, copy-back) for the given goal. Opens in the browser.
category: planning
---

# /dynamic-plan

Invoke the dynamic-plan skill. Treat the rest of the user input as the goal
and follow the skill's workflow exactly:

1. Parse goal + detect stack.
2. Generate the .mdx plan in `.dynamic-plan/<slug>-<timestamp>/plan.mdx`.
3. Compile to `.html` via `node ~/.agents/skills/dynamic-plan/scripts/compile-mdx.mjs`.
4. Serve with `bash ~/.agents/skills/dynamic-plan/scripts/serve-mdx.sh`.
5. Print URL + summary.

See `~/.agents/skills/dynamic-plan/SKILL.md` for the full contract and
`~/.agents/skills/dynamic-plan/references/wireframe-components.md` for the
Figkit-style component library.
EOF
echo "✓ $HOME/.claude/commands/dynamic-plan.md"

cat > "$HOME/.codex/commands/dynamic-plan.md" <<'EOF'
---
description: Generate an interactive .mdx plan (Figkit-style wireframes, Mermaid diagrams, decision forms, copy-back) for the given goal. Opens in the browser.
---

# /dynamic-plan

Invoke the dynamic-plan skill. Treat the rest of the user input as the goal
and follow the skill's workflow in `~/.agents/skills/dynamic-plan/SKILL.md`:

1. Parse goal + detect stack.
2. Generate the .mdx plan in `.dynamic-plan/<slug>-<timestamp>/plan.mdx`.
3. Compile to `.html` via `node ~/.agents/skills/dynamic-plan/scripts/compile-mdx.mjs`.
4. Serve with `bash ~/.agents/skills/dynamic-plan/scripts/serve-mdx.sh`.
5. Print URL + summary.
EOF
echo "✓ $HOME/.codex/commands/dynamic-plan.md"

cat > "$HOME/.hermes/commands/dynamic-plan.md" <<'EOF'
---
description: Generate an interactive .mdx plan (Figkit-style wireframes, Mermaid diagrams, decision forms, copy-back) for the given goal. Opens in the browser.
---

# /dynamic-plan

Invoke the dynamic-plan skill (see `~/.agents/skills/dynamic-plan/SKILL.md`):

1. Parse goal + detect stack.
2. Generate the .mdx plan in `.dynamic-plan/<slug>-<timestamp>/plan.mdx`.
3. Compile to `.html` via `node ~/.agents/skills/dynamic-plan/scripts/compile-mdx.mjs`.
4. Serve with `bash ~/.agents/skills/dynamic-plan/scripts/serve-mdx.sh`.
5. Print URL + summary.
EOF
echo "✓ $HOME/.hermes/commands/dynamic-plan.md"

cat > "$HOME/.config/opencode/command/dynamic-plan.md" <<'EOF'
---
description: Generate an interactive .mdx plan (Figkit-style wireframes, Mermaid diagrams, decision forms, copy-back) for the given goal. Opens in the browser.
---

# /dynamic-plan

You are invoking the dynamic-plan skill. The user's goal is: $ARGUMENTS

Follow the workflow in `~/.agents/skills/dynamic-plan/SKILL.md`:

1. Parse goal + detect stack.
2. Generate the .mdx plan in `.dynamic-plan/<slug>-<timestamp>/plan.mdx`.
3. Compile to `.html` via `node ~/.agents/skills/dynamic-plan/scripts/compile-mdx.mjs`.
4. Serve with `bash ~/.agents/skills/dynamic-plan/scripts/serve-mdx.sh`.
5. Print URL + summary.
EOF
echo "✓ $HOME/.config/opencode/command/dynamic-plan.md"

# Make scripts executable (in case they were copied without +x)
chmod +x "$HOME/.agents/skills/dynamic-plan/scripts/"*.sh 2>/dev/null || true
chmod +x "$HOME/.agents/skills/dynamic-plan/scripts/"*.mjs 2>/dev/null || true

echo ""
echo "✅ dynamic-plan installed for: Claude Code, Codex, Hermes, OpenCode, Pi"
echo "Master copy: $HOME/.agents/skills/dynamic-plan"
echo ""
echo "Try it:"
echo "  cd ~/your-project"
echo "  /dynamic-plan Add a CSV bulk import feature to the dashboard"
echo ""
echo "Verify install:"
echo "  npx dynamic-plan info"