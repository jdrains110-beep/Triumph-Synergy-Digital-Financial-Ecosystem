#!/usr/bin/env bash
# Helper to run database migrations in CI or locally with proper env vars.
set -euo pipefail

if [ -z "${POSTGRES_URL:-}" ]; then
  echo "POSTGRES_URL is not set. Set POSTGRES_URL to run migrations."
  exit 1
fi

echo "Running DB migrations against $POSTGRES_URL"
export RUN_MIGRATIONS=true
pnpm db:migrate

echo "Migrations complete."
