#!/usr/bin/env bash
# Pre-commit secret scanner — blocks commits that contain credential patterns.
# Install:  ln -sf ../../scripts/pre-commit-secret-scan.sh .git/hooks/pre-commit
set -euo pipefail

# Patterns considered sensitive
PATTERNS=(
  'github_pat_[A-Za-z0-9_]{20,}'
  'ghp_[A-Za-z0-9]{30,}'
  'gho_[A-Za-z0-9]{30,}'
  'ghu_[A-Za-z0-9]{30,}'
  'ghs_[A-Za-z0-9]{30,}'
  'ghr_[A-Za-z0-9]{30,}'
  'AKIA[0-9A-Z]{16}'                          # AWS access key
  'aws_secret_access_key[[:space:]]*=[[:space:]]*[A-Za-z0-9/+=]{40}'
  '-----BEGIN (RSA|OPENSSH|EC|DSA|PGP) PRIVATE KEY-----'
  'sk-[A-Za-z0-9]{32,}'                       # OpenAI/etc
)

FAIL=0
# Get list of staged files (added/modified/copied), excluding deletions
FILES=$(git diff --cached --name-only --diff-filter=ACM)

for f in $FILES; do
  # Skip the secret folder & .env (gitignored anyway, but just in case)
  case "$f" in
    secrets/*|.env|.env.*) continue ;;
    *.lock|*.png|*.jpg|*.jpeg|*.gif|*.pdf|*.zip|*.tar|*.gz) continue ;;
  esac
  [ -f "$f" ] || continue
  for pat in "${PATTERNS[@]}"; do
    if grep -E -n "$pat" "$f" >/dev/null 2>&1; then
      echo "❌ SECRET DETECTED in $f"
      grep -E -n "$pat" "$f" | head -3 | sed 's/^/   /'
      FAIL=1
    fi
  done
done

if [ "$FAIL" -ne 0 ]; then
  echo
  echo "🛑 Commit blocked: remove the secrets above (or unstage the file)."
  echo "   Override only if you are SURE:  git commit --no-verify"
  exit 1
fi
exit 0
