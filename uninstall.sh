#!/usr/bin/env bash
# dynamic-plan/uninstall.sh
# Standalone uninstall (same as `bash install.sh --uninstall`).

set -euo pipefail

echo "Uninstalling dynamic-plan from all platforms…"
rm -rf "$HOME/.claude/skills/dynamic-plan"    2>/dev/null || true
rm -rf "$HOME/.codex/skills/dynamic-plan"     2>/dev/null || true
rm -rf "$HOME/.hermes/skills/dynamic-plan"    2>/dev/null || true
rm -rf "$HOME/.pi/agent/skills/dynamic-plan"  2>/dev/null || true
rm -rf "$HOME/.agents/skills/dynamic-plan"    2>/dev/null || true
rm -f  "$HOME/.claude/commands/dynamic-plan.md"     2>/dev/null || true
rm -f  "$HOME/.codex/commands/dynamic-plan.md"      2>/dev/null || true
rm -f  "$HOME/.hermes/commands/dynamic-plan.md"     2>/dev/null || true
rm -f  "$HOME/.config/opencode/command/dynamic-plan.md" 2>/dev/null || true

echo "✓ dynamic-plan has been removed from Claude Code, Codex, OpenCode, Hermes, and Pi."