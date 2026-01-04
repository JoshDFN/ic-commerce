#!/bin/bash
set -e

echo "Starting IC Commerce..."

# Remove stale .env (--clean creates new canister IDs)
rm -f .env

# Start dfx in background on internal port
echo "Starting dfx replica..."
dfx start --background --clean --host 127.0.0.1:8943

# Wait for replica to be ready
echo "Waiting for replica..."
until dfx ping &>/dev/null; do
    sleep 1
done
echo "Replica is ready!"

# Pull dependencies (Internet Identity)
echo "Pulling dependencies..."
dfx deps pull
dfx deps init

# Deploy dependencies first
echo "Deploying Internet Identity..."
dfx deps deploy

# Deploy backend first (creates canister IDs and writes .env)
echo "Deploying backend..."
dfx deploy backend

# Deploy frontend (build command auto-runs setup-env.sh)
echo "Deploying frontend..."
dfx deploy frontend

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
echo "============================================"
echo ""

# Start Vite dev server (keeps container running)
exec npm run dev -- --host 0.0.0.0
