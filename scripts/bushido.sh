#!/bin/bash
# BushidoOS CLI wrapper — runs the TypeScript CLI via tsx
# Usage: bushido <command> [args]

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Load .env.local if it exists (for API keys)
if [ -f "$PROJECT_DIR/.env.local" ]; then
    set -a
    source "$PROJECT_DIR/.env.local"
    set +a
fi

# Run the CLI via tsx
exec npx tsx "$SCRIPT_DIR/cli.ts" "$@"
