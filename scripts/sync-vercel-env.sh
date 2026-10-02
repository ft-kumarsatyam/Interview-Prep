#!/usr/bin/env bash
# Push .env.local keys to a Vercel project (needs: vercel login + vercel link).
# Usage: ./scripts/sync-vercel-env.sh [project-name]
set -euo pipefail
cd "$(dirname "$0")/.."
PROJECT="${1:-interview-prep}"

if [[ ! -f .env.local ]]; then
  echo "Missing .env.local"
  exit 1
fi

REQUIRED=(MONGODB_URI AUTH_SECRET ADMIN_EMAIL ADMIN_PASSWORD_HASH_B64 ADMIN_NAME APP_TIMEZONE CRON_SECRET)
OPTIONAL=(LLM_PROVIDER LLM_API_KEY LLM_MODEL LLM_BASE_URL LEETCODE_USERNAME TELEGRAM_BOT_TOKEN TELEGRAM_CHAT_ID RESEND_API_KEY NOTIFY_EMAIL)

read_key() {
  grep -E "^$1=" .env.local | head -1 | cut -d= -f2- | sed -e 's/^"//' -e 's/"$//' || true
}

missing=()
for key in "${REQUIRED[@]}"; do
  [[ -n "$(read_key "$key")" ]] || missing+=("$key")
done
if (( ${#missing[@]} )); then
  echo "Required keys missing from .env.local: ${missing[*]}"
  exit 1
fi

for key in "${REQUIRED[@]}" "${OPTIONAL[@]}"; do
  val=$(read_key "$key")
  if [[ -n "$val" ]]; then
    printf '%s' "$val" | vercel env add "$key" production --force --project "$PROJECT" >/dev/null
    echo "set   $key"
  else
    echo "skip  $key (empty)"
  fi
done

echo "Done. Redeploy so the new values apply: vercel --prod (or Redeploy in the dashboard)."
