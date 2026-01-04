#!/bin/bash
# Post-install script to create VITE_ prefixed env vars from DFX canister variables

ENV_FILE=".env"

if [[ ! -f "$ENV_FILE" ]]; then
    echo "Error: $ENV_FILE not found"
    exit 1
fi

# Remove any existing VITE_ section
sed -i '' '/^# VITE ENVIRONMENT VARIABLES/,/^# END VITE ENVIRONMENT VARIABLES/d' "$ENV_FILE" 2>/dev/null || true

# Extract DFX variables (between the DFX markers, excluding comments and empty lines)
DFX_VARS=$(sed -n '/^# DFX CANISTER ENVIRONMENT VARIABLES/,/^# END DFX CANISTER ENVIRONMENT VARIABLES/p' "$ENV_FILE" | grep -E '^[A-Z_]+=' || true)

if [[ -z "$DFX_VARS" ]]; then
    echo "No DFX variables found to duplicate"
    exit 0
fi

# Append VITE_ prefixed versions
{
    echo ""
    echo "# VITE ENVIRONMENT VARIABLES"
    echo "$DFX_VARS" | while IFS= read -r line; do
        echo "VITE_$line"
    done
    echo "# END VITE ENVIRONMENT VARIABLES"
} >> "$ENV_FILE"

echo "Created VITE_ prefixed environment variables in $ENV_FILE"
