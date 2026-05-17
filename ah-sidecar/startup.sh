#!/bin/sh
# ERA Auction House + SkyrimTogetherServer startup wrapper
# ─────────────────────────────────────────────────────────
# Pterodactyl egg startup command:
#   sh /home/container/ah-sidecar/startup.sh
#
# Required Pterodactyl egg variables:
#   STR_START_CMD  — the original server start command from your egg,
#                    e.g.  ./SkyrimTogetherServer  or  wine Server.exe
#   NODE_BIN       — (optional) full path to node if not in PATH,
#                    e.g.  /usr/local/bin/node

CONTAINER=/home/container
SIDECAR_DIR="$CONTAINER/ah-sidecar"

# ── Load .env ──────────────────────────────────────────────────────────────
if [ -f "$SIDECAR_DIR/.env" ]; then
  set -a
  . "$SIDECAR_DIR/.env"
  set +a
fi

# ── Locate node ────────────────────────────────────────────────────────────
NODE_CMD=""
for candidate in "$NODE_BIN" node /usr/local/bin/node /usr/bin/node /opt/node/bin/node /nix/var/nix/profiles/default/bin/node; do
  [ -z "$candidate" ] && continue
  if command -v "$candidate" >/dev/null 2>&1; then
    NODE_CMD="$candidate"
    break
  elif [ -x "$candidate" ]; then
    NODE_CMD="$candidate"
    break
  fi
done

# ── Start AH sidecar (best-effort — server still starts if node missing) ───
if [ -n "$NODE_CMD" ]; then
  echo "[startup] Starting AH sidecar ($NODE_CMD)..."
  "$NODE_CMD" "$SIDECAR_DIR/src/index.js" &
  AH_PID=$!
  echo "[startup] Sidecar running (PID $AH_PID)"
  trap 'echo "[startup] Stopping sidecar..."; kill "$AH_PID" 2>/dev/null; wait "$AH_PID" 2>/dev/null' EXIT INT TERM
else
  echo "[startup] WARNING: node not found — AH sidecar will not start."
  echo "[startup] Set the NODE_BIN egg variable to the full path of node."
fi

# ── Start the game server ──────────────────────────────────────────────────
if [ -z "$STR_START_CMD" ]; then
  echo "[startup] ERROR: STR_START_CMD egg variable is not set."
  echo "[startup] Set it to your original server startup command,"
  echo "[startup] e.g.:  ./SkyrimTogetherServer  or  wine SkyrimTogetherServer.exe"
  exit 1
fi

echo "[startup] Starting server: $STR_START_CMD"
cd "$CONTAINER"
exec $STR_START_CMD
