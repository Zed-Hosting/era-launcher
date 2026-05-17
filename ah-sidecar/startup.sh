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

# Helper: test that a binary actually executes (catches glibc-on-musl "not found")
_node_works() { "$1" --version >/dev/null 2>&1; }

# Detect musl libc (Alpine) vs glibc
_is_musl() { ldd --version 2>&1 | grep -qi musl; }

# 1. Check common system locations first
for candidate in "$NODE_BIN" node /usr/local/bin/node /usr/bin/node /opt/node/bin/node "$NODE_CACHE"; do
  [ -z "$candidate" ] && continue
  if [ -x "$candidate" ] && _node_works "$candidate"; then
    NODE_CMD="$candidate"
    break
  fi
done

# 2. Download Node.js if not found
if [ -z "$NODE_CMD" ] && [ ! -x "$NODE_CACHE" ]; then
  NODE_VERSION="20.19.1"
  case "$(uname -m)" in
    x86_64)  ARCH="x64"   ;;
    aarch64) ARCH="arm64" ;;
    armv7l)  ARCH="armv7l";;
    *)       ARCH="x64"   ;;
  esac

  if _is_musl; then
    # Alpine/musl: use unofficial musl build — no glibc needed, no root needed
    NODE_TAR="node-v${NODE_VERSION}-linux-${ARCH}-musl.tar.gz"
    NODE_URL="https://unofficial-builds.nodejs.org/download/release/v${NODE_VERSION}/${NODE_TAR}"
    echo "[startup] Alpine (musl) detected — downloading Node.js musl build v${NODE_VERSION}..."
  else
    NODE_TAR="node-v${NODE_VERSION}-linux-${ARCH}.tar.gz"
    NODE_URL="https://nodejs.org/dist/v${NODE_VERSION}/${NODE_TAR}"
    echo "[startup] Downloading Node.js v${NODE_VERSION}..."
  fi

  mkdir -p "$NODE_DIR"
  if command -v wget >/dev/null 2>&1; then
    wget -qO- "$NODE_URL" | tar -xz -C "$NODE_DIR" --strip-components=1
  elif command -v curl >/dev/null 2>&1; then
    curl -fsSL "$NODE_URL" | tar -xz -C "$NODE_DIR" --strip-components=1
  else
    echo "[startup] WARNING: neither wget nor curl found — AH sidecar will not start."
  fi
fi

if [ -z "$NODE_CMD" ] && [ -x "$NODE_CACHE" ]; then
  if _node_works "$NODE_CACHE"; then
    NODE_CMD="$NODE_CACHE"
  else
    echo "[startup] WARNING: Node.js binary failed to execute — AH sidecar will not start."
  fi
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
# Patch STServer.ini to inject era-ah resource AFTER Pterodactyl overwrites it
INI_FILE="$CONTAINER/config/STServer.ini"
RESOURCE_NAME="era-ah"

# Ensure resource folder exists under container CWD (server runs with CWD=/home/container)
mkdir -p "$CONTAINER/resources/$RESOURCE_NAME"

# Copy lua files into resource folder
if [ -d "$SIDECAR_DIR/lua" ]; then
  cp "$SIDECAR_DIR/lua/"* "$CONTAINER/resources/$RESOURCE_NAME/" 2>/dev/null || true
fi

# Download json.lua if missing
JSON_LUA="$CONTAINER/resources/$RESOURCE_NAME/json.lua"
if [ ! -f "$JSON_LUA" ]; then
  echo "[startup] Downloading json.lua..."
  if command -v wget >/dev/null 2>&1; then
    wget -qO "$JSON_LUA" "https://raw.githubusercontent.com/rxi/json.lua/master/json.lua"
  elif command -v curl >/dev/null 2>&1; then
    curl -fsSL -o "$JSON_LUA" "https://raw.githubusercontent.com/rxi/json.lua/master/json.lua"
  fi
fi

# Write resource manifest
cat > "$CONTAINER/resources/$RESOURCE_NAME/manifest.json" <<'EOF'
{"FolderName":"era-ah","EntryPoint":"ah.lua"}
EOF

if [ -f "$INI_FILE" ]; then
  # Add "Resources = true" to the header block if missing
  if ! grep -q "^Resources" "$INI_FILE" 2>/dev/null; then
    sed -i "1s/^/Resources = true\n/" "$INI_FILE"
    echo "[startup] Added 'Resources = true' to ini header"
  fi

  # Add [Resources] section if missing
  if ! grep -q "^\[Resources\]" "$INI_FILE" 2>/dev/null; then
    printf '\n[Resources]\nResources=%s\n' "$RESOURCE_NAME" >> "$INI_FILE"
    echo "[startup] Added [Resources] section with ${RESOURCE_NAME}"
  elif ! grep -q "$RESOURCE_NAME" "$INI_FILE" 2>/dev/null; then
    sed -i "/^\[Resources\]/a Resources=${RESOURCE_NAME}" "$INI_FILE"
    echo "[startup] Injected ${RESOURCE_NAME} into existing [Resources] section"
  else
    echo "[startup] ${RESOURCE_NAME} already present in STServer.ini"
  fi
else
  echo "[startup] WARNING: STServer.ini not found at $INI_FILE"
fi
echo "[startup] Starting server: $STR_START_CMD"
cd "$CONTAINER"
exec $STR_START_CMD
