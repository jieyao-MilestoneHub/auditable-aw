#!/bin/bash
set -e

WORKSPACE="/workspace"
DEVCONTAINER="$WORKSPACE/.devcontainer"
CLAUDE_SYSTEM="/etc/claude-code"
PROFILE_FILE="$WORKSPACE/.aaw-profile.json"

echo "[AAW] Starting bootstrap..."

# Create Claude system directory
sudo mkdir -p "$CLAUDE_SYSTEM"

# Check if profile manifest exists
if [ -f "$PROFILE_FILE" ]; then
    echo "[AAW] Found .aaw-profile.json, composing profiles..."

    # Run profile composer (managed format outputs clean JSON)
    cd "$DEVCONTAINER/compose"
    if node compose-settings.js "$WORKSPACE" managed > /tmp/managed.json 2>/dev/null; then
        # Validate and deploy
        if [ -s /tmp/managed.json ] && python3 -c "import json; json.load(open('/tmp/managed.json'))" 2>/dev/null; then
            sudo cp /tmp/managed.json "$CLAUDE_SYSTEM/managed-settings.json"
            sudo chmod 644 "$CLAUDE_SYSTEM/managed-settings.json"
            echo "[AAW] Deployed composed managed-settings.json"
        else
            echo "[AAW] Warning: Invalid composed settings, using defaults"
        fi
    else
        echo "[AAW] Warning: Profile composition failed, using defaults"
    fi
else
    echo "[AAW] No .aaw-profile.json found, using default settings..."
fi

# Fallback: Deploy default managed-settings.json if not already deployed
if [ ! -f "$CLAUDE_SYSTEM/managed-settings.json" ] && [ -f "$DEVCONTAINER/managed-settings.json" ]; then
    sudo cp "$DEVCONTAINER/managed-settings.json" "$CLAUDE_SYSTEM/managed-settings.json"
    sudo chmod 644 "$CLAUDE_SYSTEM/managed-settings.json"
    echo "[AAW] Deployed default managed-settings.json"
fi

# Deploy managed-mcp.json
if [ -f "$DEVCONTAINER/managed-mcp.json" ]; then
    sudo cp "$DEVCONTAINER/managed-mcp.json" "$CLAUDE_SYSTEM/managed-mcp.json"
    sudo chmod 644 "$CLAUDE_SYSTEM/managed-mcp.json"
    echo "[AAW] Deployed managed-mcp.json"
fi

# Create AAW directories
mkdir -p "$WORKSPACE/.aaw/logs"
mkdir -p "$WORKSPACE/.aaw/evidence"

# Build aawctl if exists
if [ -d "$WORKSPACE/tools/aawctl/server" ] && [ -f "$WORKSPACE/tools/aawctl/server/package.json" ]; then
    echo "[AAW] Building aawctl..."
    cd "$WORKSPACE/tools/aawctl/server"
    npm install --silent 2>/dev/null || true
    npm run build --silent 2>/dev/null || true
    cd "$WORKSPACE"
    echo "[AAW] aawctl built"
fi

echo "[AAW] Bootstrap complete"
echo "[AAW] Managed settings: $CLAUDE_SYSTEM/managed-settings.json"
if [ -f "$PROFILE_FILE" ]; then
    echo "[AAW] Profile: $(cat $PROFILE_FILE 2>/dev/null | head -1)"
fi
