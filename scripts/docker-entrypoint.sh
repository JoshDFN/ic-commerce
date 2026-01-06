#!/bin/bash
set -e

# Ensure PATH includes dfx and cargo
export PATH="/home/developer/.local/share/dfx/bin:/home/developer/.cargo/bin:$PATH"

# Graceful shutdown handler - critical for PocketIC state persistence
# See: https://github.com/dfinity/sdk/issues/4264
cleanup() {
    echo ""
    echo "Shutting down gracefully..."
    dfx stop 2>/dev/null || true
    pkill -f "pocket-ic" 2>/dev/null || true
    echo "Shutdown complete."
    exit 0
}
trap cleanup SIGTERM SIGINT SIGHUP

echo "Starting IC Commerce..."

# State locations:
# - dfx stores replica state in ~/.local/share/dfx/network/local/
# - canister IDs are in .dfx/local/canister_ids.json
# - We backup canister IDs to persistent volume since .dfx/local gets recreated
NETWORK_STATE="/home/developer/.local/share/dfx/network/local"
BACKUP_DIR="/app/.dfx-backup"
BACKUP_CANISTER_IDS="$BACKUP_DIR/canister_ids.json"

# Clean up stale PID files from previous container run
# (These cause "dfx is already running" errors)
rm -f "$NETWORK_STATE/pid" "$NETWORK_STATE/pocket-ic-pid" 2>/dev/null || true
rm -f "$NETWORK_STATE/replica-configuration/pid" 2>/dev/null || true

# Clean up any stale PocketIC cache (can cause 400 errors on restart)
rm -rf ~/.cache/dfinity/pocketic 2>/dev/null || true

# Detect if we have existing persisted state
HAS_NETWORK_STATE=false
HAS_CANISTER_IDS=false

if [ -d "$NETWORK_STATE" ] && [ -n "$(ls -A $NETWORK_STATE 2>/dev/null)" ]; then
    HAS_NETWORK_STATE=true
    echo "Found existing network state in $NETWORK_STATE"
fi

if [ -f "$BACKUP_CANISTER_IDS" ]; then
    HAS_CANISTER_IDS=true
    echo "Found backed up canister IDs"
fi

# Function to start dfx and wait for it
start_dfx_with_timeout() {
    local use_clean=$1
    local timeout_secs=30

    if [ "$use_clean" = "true" ]; then
        echo "Starting dfx replica (clean start)..."
        dfx start --background --clean --host 127.0.0.1:8943 2>&1 &
    else
        echo "Starting dfx replica (preserving state)..."
        dfx start --background --host 127.0.0.1:8943 2>&1 &
    fi

    local start_pid=$!
    local counter=0

    # Wait for dfx to either be ready or timeout
    while [ $counter -lt $timeout_secs ]; do
        if dfx ping &>/dev/null 2>&1; then
            echo "Replica is ready!"
            return 0
        fi
        sleep 1
        counter=$((counter + 1))
    done

    # Timeout - kill dfx if still running and return failure
    pkill -f "pocket-ic" 2>/dev/null || true
    dfx stop 2>/dev/null || true
    return 1
}

# Try to start with persistence if state exists
PERSISTENT_MODE=false
if [ "$HAS_NETWORK_STATE" = true ] && [ "$HAS_CANISTER_IDS" = true ]; then
    echo ""
    echo "==> Attempting PERSISTENT MODE: Restoring previous state"
    echo ""

    # Restore canister IDs from backup
    mkdir -p .dfx/local
    cp "$BACKUP_CANISTER_IDS" .dfx/local/canister_ids.json

    # Try to start dfx WITHOUT --clean
    if start_dfx_with_timeout "false"; then
        PERSISTENT_MODE=true
        echo "State restoration successful!"
    else
        echo ""
        echo "WARNING: State restoration failed (PocketIC state corruption detected)"
        echo "         This is a known issue: https://github.com/dfinity/sdk/issues/4264"
        echo "         Falling back to fresh deployment..."
        echo ""

        # Clean up corrupted state
        rm -rf "$NETWORK_STATE"/* 2>/dev/null || true
        rm -rf .dfx/local 2>/dev/null || true
        rm -f .env

        # Start fresh
        start_dfx_with_timeout "true" || {
            echo "ERROR: Failed to start dfx even with clean state!"
            exit 1
        }
    fi
else
    echo ""
    echo "==> FRESH MODE: New deployment"
    echo ""

    # Clean up any stale files
    rm -f .env
    rm -rf .dfx/local 2>/dev/null || true

    # Start dfx with --clean for fresh state
    start_dfx_with_timeout "true" || {
        echo "ERROR: Failed to start dfx!"
        exit 1
    }
fi

if [ "$PERSISTENT_MODE" = true ]; then
    echo "Reusing existing canisters..."
    # Regenerate .env from existing canister IDs
    ./scripts/setup-env.sh
else
    # Fresh deployment
    echo "Pulling dependencies..."
    dfx deps pull
    dfx deps init

    echo "Deploying Internet Identity..."
    dfx deps deploy

    echo "Deploying backend..."
    dfx deploy backend

    echo "Deploying frontend..."
    dfx deploy frontend

    # Backup canister IDs for next container start
    echo "Backing up canister IDs for persistence..."
    mkdir -p "$BACKUP_DIR"
    cp .dfx/local/canister_ids.json "$BACKUP_CANISTER_IDS"
fi

# Start socat to proxy external connections to dfx replica
# dfx binds to 127.0.0.1:8943, socat forwards 0.0.0.0:4943 -> 127.0.0.1:8943
# This allows external access via standard port 4943
echo "Starting network proxy for external access..."
socat TCP-LISTEN:4943,fork,reuseaddr,bind=0.0.0.0 TCP:127.0.0.1:8943 &

# Get frontend URL
FRONTEND_ID=$(dfx canister id frontend)
echo ""
echo "============================================"
echo "  IC Commerce is running!"
echo "============================================"
echo ""
echo "  Storefront:  http://${FRONTEND_ID}.localhost:4943"
echo "  Admin:       http://${FRONTEND_ID}.localhost:4943/admin"
echo ""
echo "  Dev Server:  http://localhost:5173"
echo ""
if [ "$PERSISTENT_MODE" = true ]; then
echo "  Mode:        PERSISTENT (data preserved)"
else
echo "  Mode:        FRESH (new deployment)"
fi
echo ""
echo "============================================"
echo ""

# Start Vite dev server in background and wait for signals
npm run dev -- --host 0.0.0.0 &
VITE_PID=$!

# Wait for Vite to exit or for a signal
wait $VITE_PID
