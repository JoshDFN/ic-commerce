#!/bin/bash
set -e

echo "Starting IC Commerce..."

# Start dfx in background
echo "Starting dfx replica..."
dfx start --background --clean

# Wait for replica to be ready
echo "Waiting for replica..."
until dfx ping &>/dev/null; do
    sleep 1
done
echo "Replica is ready!"

# Deploy canisters
echo "Deploying canisters..."
dfx deploy

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
