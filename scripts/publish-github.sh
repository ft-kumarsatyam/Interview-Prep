#!/usr/bin/env bash
# Push PrepOS to GitHub and print next steps for Vercel + Actions secrets.
set -euo pipefail
cd "$(dirname "$0")/.."

if ! gh auth status >/dev/null 2>&1; then
  echo "Run: gh auth login"
  exit 1
fi

OWNER="${GITHUB_OWNER:-ft-kumarsatyam}"
REPO="${GITHUB_REPO:-prepos}"
REMOTE="git@github.com:${OWNER}/${REPO}.git"

git remote remove origin 2>/dev/null || true
git remote add origin "$REMOTE"

if gh auth status >/dev/null 2>&1; then
  if ! gh repo view "$OWNER/$REPO" >/dev/null 2>&1; then
    gh repo create "$OWNER/$REPO" --private --source=. --remote=origin --push
    exit 0
  fi
else
  echo "Note: gh not logged in. Create empty repo first: https://github.com/new?name=${REPO}"
  echo "      Then run this script again to push via SSH."
fi

git push -u origin main
echo "Pushed to https://github.com/$OWNER/$REPO"
