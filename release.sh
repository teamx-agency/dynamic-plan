#!/usr/bin/env bash
# dynamic-plan/release.sh
# Convenience wrapper around the Node release script.
# Usage:
#   bash release.sh patch "fix: handle empty <DecisionForm>"
#   bash release.sh minor "feat: mobile screen preset"
#   bash release.sh major "feat!: rename <Card> props for v2"
#   bash release.sh 1.2.0

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
exec node "$SCRIPT_DIR/scripts/release.mjs" "$@"