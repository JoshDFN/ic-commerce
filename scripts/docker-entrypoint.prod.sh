#!/bin/bash
# Production entrypoint - uses prebuilt backend WASM, builds frontend at deploy time
set -e

echo "Starting IC Commerce (Production)..."

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

# Deploy backend (uses prebuilt WASM, skips build step)
echo "Deploying backend..."
dfx canister create backend
dfx canister install backend --wasm target/wasm32-wasip1/release/backend_ic.wasm

# Build and deploy frontend
echo "Building and deploying frontend..."
dfx canister create frontend

# Run setup-env to create VITE_ variables before build
./scripts/setup-env.sh

# Build and install frontend (using prod config without backend dependency)
dfx build frontend
dfx canister install frontend

# Start socat to proxy external connections to dfx replica
echo "Starting network proxy for external access..."
socat TCP-LISTEN:4943,fork,reuseaddr,bind=0.0.0.0 TCP:127.0.0.1:8943 &

# Get frontend URL
FRONTEND_ID=$(dfx canister id frontend)
echo ""
echo "============================================"
echo "  IC Commerce is running! (Production)"
echo "============================================"
echo ""
echo "  Storefront:  http://${FRONTEND_ID}.localhost:4943"
echo "  Admin:       http://${FRONTEND_ID}.localhost:4943/admin"
echo ""
echo "============================================"
echo ""

# Keep container running
echo "Container ready. Press Ctrl+C to stop."
tail -f /dev/null
