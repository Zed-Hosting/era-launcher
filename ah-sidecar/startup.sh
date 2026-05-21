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

# ── Self-update sidecar source from GitHub ────────────────────────────────
# Refreshes every JS file under ah-sidecar/src on each container start so the
# REST API, command handlers, and DB schema stay in sync with the launcher
# without requiring manual file uploads after each release.
GIT_RAW_SRC="https://raw.githubusercontent.com/Zed-Hosting/era-launcher/main/ah-sidecar/src"
CACHEBUST_NOW="?t=$(date +%s)"
SIDECAR_FILES="api.js commands.js db.js format.js index.js items.js queue.js"
mkdir -p "$SIDECAR_DIR/src"
for f in $SIDECAR_FILES; do
  tmp="$SIDECAR_DIR/src/$f.tmp.$$"
  ok=0
  if command -v curl >/dev/null 2>&1; then
    curl -fsSL --retry 2 --max-time 20 -o "$tmp" "$GIT_RAW_SRC/$f$CACHEBUST_NOW" && ok=1
  elif command -v wget >/dev/null 2>&1; then
    wget -qO "$tmp" "$GIT_RAW_SRC/$f$CACHEBUST_NOW" && ok=1
  fi
  if [ "$ok" = "1" ] && [ -s "$tmp" ]; then
    mv "$tmp" "$SIDECAR_DIR/src/$f"
    echo "[startup] refreshed sidecar src/$f"
  else
    rm -f "$tmp"
    echo "[startup] WARNING: failed to refresh sidecar src/$f (keeping existing)"
  fi
done

# Also refresh data/items.json (FormID lookup table used for auto-delivery).
# Same fetch-with-validate pattern as the src files. Without this file the
# sidecar logs "items.json missing or invalid — item auto-delivery disabled."
GIT_RAW_DATA="https://raw.githubusercontent.com/Zed-Hosting/era-launcher/main/ah-sidecar/data"
SIDECAR_DATA_FILES="items.json"
mkdir -p "$SIDECAR_DIR/data"
for f in $SIDECAR_DATA_FILES; do
  tmp="$SIDECAR_DIR/data/$f.tmp.$$"
  ok=0
  if command -v curl >/dev/null 2>&1; then
    curl -fsSL --retry 2 --max-time 20 -o "$tmp" "$GIT_RAW_DATA/$f$CACHEBUST_NOW" && ok=1
  elif command -v wget >/dev/null 2>&1; then
    wget -qO "$tmp" "$GIT_RAW_DATA/$f$CACHEBUST_NOW" && ok=1
  fi
  if [ "$ok" = "1" ] && [ -s "$tmp" ]; then
    mv "$tmp" "$SIDECAR_DIR/data/$f"
    echo "[startup] refreshed sidecar data/$f"
  else
    rm -f "$tmp"
    echo "[startup] WARNING: failed to refresh sidecar data/$f (keeping existing)"
  fi
done

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
# STR auto-discovers resources from ./resources/<name>/<name>.manifest
# No STServer.ini patching needed for resources.
RESOURCE_NAME="era-ah"
RESOURCE_DIR="$CONTAINER/resources/$RESOURCE_NAME"

mkdir -p "$RESOURCE_DIR"

# Always download latest lua files from GitHub (ensures server has current version)
# Cache-bust with a timestamp so Cloudflare/GitHub raw never serve a stale copy.
GIT_RAW="https://raw.githubusercontent.com/Zed-Hosting/era-launcher/main/ah-sidecar/lua"
CACHEBUST="?t=$(date +%s)"

# Fetch into a temp file, validate, then move. On any failure fall back to the
# sidecar's bundled copy in $SIDECAR_DIR/lua so a manual paste there is honored.
fetch_lua() {
  # $1 = remote filename relative to $GIT_RAW (or full URL for json.lua)
  # $2 = destination path
  # $3 = required substring to consider the download valid (e.g. AH_LUA_VERSION)
  url="$1"; dest="$2"; marker="$3"
  tmp="$dest.tmp.$$"
  rm -f "$tmp"
  ok=0
  if command -v curl >/dev/null 2>&1; then
    curl -fsSL --retry 2 --max-time 20 -o "$tmp" "$url" && ok=1
  elif command -v wget >/dev/null 2>&1; then
    wget -qO "$tmp" "$url" && ok=1
  fi
  if [ "$ok" = "1" ] && [ -s "$tmp" ] && { [ -z "$marker" ] || grep -q "$marker" "$tmp"; }; then
    mv "$tmp" "$dest"
    echo "[startup] downloaded $(basename "$dest") from GitHub"
    return 0
  fi
  rm -f "$tmp"
  # Fallback: copy from sidecar bundled lua dir
  local_src="$SIDECAR_DIR/lua/$(basename "$dest")"
  if [ -f "$local_src" ]; then
    cp "$local_src" "$dest"
    echo "[startup] WARNING: GitHub fetch failed for $(basename "$dest") — using bundled $local_src"
    return 0
  fi
  echo "[startup] ERROR: could not fetch $(basename "$dest") from GitHub and no local fallback at $local_src"
  return 1
}

echo "[startup] Downloading latest ah.lua from GitHub..."
fetch_lua "$GIT_RAW/ah.lua$CACHEBUST"                                             "$RESOURCE_DIR/ah.lua"   "AH_LUA_VERSION"
fetch_lua "https://raw.githubusercontent.com/rxi/json.lua/master/json.lua$CACHEBUST" "$RESOURCE_DIR/json.lua" "function json"

# Echo the version actually installed so the Pterodactyl log makes drift obvious
if [ -f "$RESOURCE_DIR/ah.lua" ]; then
  v=$(grep -m1 'AH_LUA_VERSION' "$RESOURCE_DIR/ah.lua" | sed -E 's/.*"([^"]+)".*/\1/')
  echo "[startup] active ah.lua version: ${v:-unknown}  (path: $RESOURCE_DIR/ah.lua)"
fi

# Write the manifest in the format STR actually expects
cat > "$RESOURCE_DIR/era-ah.manifest" <<'EOF'
[Resource]
name = "era-ah"
version = 1.0.0
apiset = 1.0.0
description = "ERA Auction House bridge"
entrypoint = "ah.lua"
EOF

echo "[startup] Resource files ready in $RESOURCE_DIR"
echo "[startup] Starting server: $STR_START_CMD"
cd "$CONTAINER"
exec $STR_START_CMD
