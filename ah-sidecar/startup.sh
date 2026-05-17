#!/bin/sh
# ERA Auction House + SkyrimTogetherServer startup wrapper
# ─────────────────────────────────────────────────────────
# Pterodactyl egg startup command:
#   sh /home/container/ah-sidecar/startup.sh
#
# Uses /bin/sh (POSIX) — works in Alpine/minimal Docker images.

CONTAINER=/home/container
SIDECAR_DIR="$CONTAINER/ah-sidecar"

# Load .env if present (dot-source is POSIX compatible)
if [ -f "$SIDECAR_DIR/.env" ]; then
  set -a
  # shellcheck disable=SC1090
  . "$SIDECAR_DIR/.env"
  set +a
fi

echo "[startup] Starting ERA Auction House sidecar..."
node "$SIDECAR_DIR/src/index.js" &
AH_PID=$!
echo "[startup] Sidecar running (PID $AH_PID)"

# Kill sidecar cleanly when this script exits
trap 'echo "[startup] Shutting down sidecar..."; kill "$AH_PID" 2>/dev/null; wait "$AH_PID" 2>/dev/null' EXIT INT TERM

echo "[startup] Starting SkyrimTogetherServer..."
cd "$CONTAINER"
./SkyrimTogetherServer "$@"
