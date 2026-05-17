#!/bin/sh
# ERA Auction House + SkyrimTogetherServer startup wrapper
# ─────────────────────────────────────────────────────────
# Pterodactyl egg startup command:
#   sh /home/container/ah-sidecar/startup.sh

CONTAINER=/home/container
SIDECAR_DIR="$CONTAINER/ah-sidecar"

# Default STR binary — override via .env or STR_START_CMD egg variable
: "${STR_START_CMD:=/home/server/SkyrimTogetherServer}"

# ── Load .env ──────────────────────────────────────────────────────────────
if [ -f "$SIDECAR_DIR/.env" ]; then
  set -a
  . "$SIDECAR_DIR/.env"
  set +a
fi

# ── Locate or download Node.js ─────────────────────────────────────────────
NODE_DIR="$CONTAINER/.node"
NODE_CACHE="$NODE_DIR/bin/node"
NODE_CMD=""

# Check existing installs first
for candidate in "$NODE_BIN" node /usr/local/bin/node /usr/bin/node /opt/node/bin/node "$NODE_CACHE"; do
  [ -z "$candidate" ] && continue
  if [ -x "$candidate" ]; then
    NODE_CMD="$candidate"
    break
  fi
done

# Not found — download Node.js LTS prebuilt binary (~50 MB, cached after first run)
if [ -z "$NODE_CMD" ]; then
  NODE_VERSION="20.19.1"
  case "$(uname -m)" in
    x86_64)  ARCH="x64"   ;;
    aarch64) ARCH="arm64" ;;
    armv7l)  ARCH="armv7l";;
    *)       ARCH="x64"   ;;
  esac
  NODE_TAR="node-v${NODE_VERSION}-linux-${ARCH}.tar.gz"
  NODE_URL="https://nodejs.org/dist/v${NODE_VERSION}/${NODE_TAR}"

  if [ ! -x "$NODE_CACHE" ]; then
    echo "[startup] Node.js not found — downloading v${NODE_VERSION} (one-time)..."
    mkdir -p "$NODE_DIR"
    if command -v wget >/dev/null 2>&1; then
      wget -qO- "$NODE_URL" | tar -xz -C "$NODE_DIR" --strip-components=1
    elif command -v curl >/dev/null 2>&1; then
      curl -fsSL "$NODE_URL" | tar -xz -C "$NODE_DIR" --strip-components=1
    else
      echo "[startup] WARNING: neither wget nor curl found — AH sidecar will not start."
    fi
  fi

  [ -x "$NODE_CACHE" ] && NODE_CMD="$NODE_CACHE"
fi

# ── Start AH sidecar ──────────────────────────────────────────────────────
if [ -n "$NODE_CMD" ]; then
  echo "[startup] Starting AH sidecar ($NODE_CMD)..."
  "$NODE_CMD" "$SIDECAR_DIR/src/index.js" &
  AH_PID=$!
  echo "[startup] Sidecar running (PID $AH_PID)"
  trap 'echo "[startup] Stopping sidecar..."; kill "$AH_PID" 2>/dev/null; wait "$AH_PID" 2>/dev/null' EXIT INT TERM
else
  echo "[startup] WARNING: Could not find or download Node.js — AH sidecar will not start."
  echo "[startup] Set NODE_BIN in $SIDECAR_DIR/.env to the full path of node."
fi

# ── Start the game server ─────────────────────────────────────────────────
echo "[startup] Starting server: $STR_START_CMD"
cd "$CONTAINER"
exec $STR_START_CMD
