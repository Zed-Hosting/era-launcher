#!/bin/bash
# ERA Auction House + SkyrimTogetherServer startup wrapper
# ─────────────────────────────────────────────────────────
# Usage in Pterodactyl egg startup command:
#   bash /home/container/ah-sidecar/startup.sh
#
# Place this file inside the ah-sidecar/ folder you upload to
# the server container. It starts the AH sidecar in the background,
# then launches the game server in the foreground so Pterodactyl
# can track it. When the container stops, the sidecar is killed too.

set -e

CONTAINER=/home/container
SIDECAR_DIR="$CONTAINER/ah-sidecar"

# Load .env if present (so DB_* vars are available to both processes)
if [ -f "$SIDECAR_DIR/.env" ]; then
  export $(grep -v '^#' "$SIDECAR_DIR/.env" | xargs)
fi

echo "[startup] Starting ERA Auction House sidecar..."
node "$SIDECAR_DIR/src/index.js" &
AH_PID=$!
echo "[startup] Sidecar running (PID $AH_PID)"

# Kill sidecar cleanly when this script exits
trap "echo '[startup] Shutting down sidecar...'; kill $AH_PID 2>/dev/null; wait $AH_PID 2>/dev/null" EXIT

echo "[startup] Starting SkyrimTogetherServer..."
cd "$CONTAINER"
./SkyrimTogetherServer "$@"
