#!/usr/bin/env bash
# scripts/first-publish.sh
# One-time bootstrap to push this repo to GitHub and trigger the first release.
#
# Prerequisites:
#   1. Empty repo created at https://github.com/teamx-agency/dynamic-plan
#   2. SSH key or HTTPS PAT configured for the teamx-agency account
#   3. NPM_TOKEN secret configured in repo Settings → Secrets → Actions
#      (npmjs.com → Access Tokens → Publish, scope: dynamic-plan)
#
# Run from the repo root:
#   bash scripts/first-publish.sh

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$ROOT"

if [[ ! -d .git ]]; then
  echo "▶ git init"
  git init -q
  git branch -M main
fi

echo "▶ git add ."
git add -A

echo "▶ git commit (initial)"
git -c user.email="${GIT_EMAIL:-rod@teamx.app}" \
    -c user.name="${GIT_NAME:-rod}" \
    commit -q -m "feat: initial public release of dynamic-plan skill

- /dynamic-plan slash command for Claude Code, Codex, OpenCode, Hermes, Pi
- 30+ Figkit-style wireframe components
- Notion-inspired plan UI (sidebar, progress, decisions, copy-back)
- Mermaid 10 integration for backend diagrams
- Self-contained .html output (no build step)
- CLI: npx dynamic-plan install | compile | serve | info
- GitHub Actions CI + auto-release workflow
- Conventional Commits → auto CHANGELOG" \
    || echo "  (nothing to commit, continuing)"

echo "▶ git remote add origin (skip if exists)"
git remote remove origin 2>/dev/null || true
git remote add origin https://github.com/teamx-agency/dynamic-plan.git

echo "▶ git push -u origin main"
git push -u origin main

echo ""
echo "✓ Repo pushed. Now create the first release:"
echo ""
echo "  bash release.sh minor \"feat: initial public release\""
echo ""
echo "This will:"
echo "  1. Bump 1.0.0 → 1.1.0 in package.json"
echo "  2. Regenerate CHANGELOG.md from the commit log"
echo "  3. Commit + tag v1.1.0 + push"
echo "  4. GitHub Actions will:"
echo "     • Run the test suite"
echo "     • Verify version matches package.json"
echo "     • Run npm pack --dry-run to check .npmignore"
echo "     • Publish to npm with provenance"
echo "     • Create a GitHub release with the CHANGELOG section as notes"
echo ""
echo "After that, your users can install via:"
echo "  npx dynamic-plan install"
