#!/usr/bin/env bash
# dynamic-plan/serve-mdx.sh
# Serve the generated .mdx + .html directory on a local port and open the browser.
# Usage:
#   serve-mdx.sh <plan-dir> [port]
# Defaults: port 8765, auto-detects index.html or plan.mdx in <plan-dir>.

set -euo pipefail

DIR="${1:-.}"
PORT="${2:-8765}"

if [[ ! -d "$DIR" ]]; then
  echo "✗ Directory not found: $DIR" >&2
  exit 1
fi

# Pick entrypoint
INDEX=""
if [[ -f "$DIR/index.html" ]]; then
  INDEX="index.html"
elif [[ -f "$DIR/plan.html" ]]; then
  INDEX="plan.html"
elif [[ -f "$DIR/plan.mdx" ]]; then
  INDEX="plan.mdx"
else
  echo "✗ No index.html, plan.html, or plan.mdx found in $DIR" >&2
  exit 1
fi

URL="http://127.0.0.1:${PORT}/${INDEX}"

# Kill any prior instance on this port
EXISTING_PID=$(lsof -ti tcp:${PORT} 2>/dev/null || true)
if [[ -n "$EXISTING_PID" ]]; then
  echo "↻ Killing prior server on :${PORT} (pid $EXISTING_PID)"
  kill $EXISTING_PID 2>/dev/null || true
  sleep 0.5
fi

echo "▶ Serving $DIR on $URL"
cd "$DIR"
nohup python3 -m http.server "$PORT" --bind 127.0.0.1 >/tmp/dynamic-plan-server.log 2>&1 &
SERVER_PID=$!
echo $SERVER_PID > /tmp/dynamic-plan-server.pid
sleep 0.7

# Open in browser (macOS first, then Linux, then Windows)
if command -v open >/dev/null 2>&1; then
  open "$URL"
elif command -v xdg-open >/dev/null 2>&1; then
  xdg-open "$URL"
elif command -v start >/dev/null 2>&1; then
  start "$URL"
fi

echo "✓ Server pid=$SERVER_PID  URL=$URL"
echo "  Logs:   /tmp/dynamic-plan-server.log"
echo "  Stop:   kill \$(cat /tmp/dynamic-plan-server.pid)"