#!/usr/bin/env bash
# Push .env.local required keys to a Vercel project (needs: vercel login + link).
set -euo pipefail
cd "$(dirname "$0")/.."
PROJECT="${1:-prepos}"

if [[ ! -f .env.local ]]; then
  echo "Missing .env.local"
  exit 1
fi

for key in MONGODB_URI AUTH_SECRET ADMIN_EMAIL ADMIN_PASSWORD_HASH_B64 ADMIN_NAME APP_TIMEZONE CRON_SECRET; do
  val=$(grep -E "^${key}=" .env.local | head -1 | cut -d= -f2- | tr -d '"')
  if [[ -n "$val" ]]; then
    printf '%s' "$val" | vercel env add "$key" production --force --project "$PROJECT"
  fi
done

echo "Done. Redeploy from Vercel dashboard or: vercel --prod"
