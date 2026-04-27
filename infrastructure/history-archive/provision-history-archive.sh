#!/usr/bin/env bash
# provision-history-archive.sh — one-shot bucket bootstrap for the Pi Testnet
# stellar-core history archive. Works against any S3-compatible service
# (Cloudflare R2, AWS S3, Backblaze B2, MinIO).
#
# Required env (export before running):
#   AWS_ACCESS_KEY_ID       Access key (R2 token's Access Key ID, or AWS key)
#   AWS_SECRET_ACCESS_KEY   Secret access key
#   S3_ENDPOINT             Full https endpoint (omit for native AWS S3)
#                           e.g. https://<acct>.r2.cloudflarestorage.com
#
# Optional env:
#   BUCKET           default: triumph-synergy-history
#   AWS_REGION       default: auto (R2). Use a real region for AWS S3.
#   PUBLIC_URL       default: https://pub-<id>.r2.dev/  (echoed for reference)
#
# Usage:
#   export AWS_ACCESS_KEY_ID=...
#   export AWS_SECRET_ACCESS_KEY=...
#   export S3_ENDPOINT=https://<acct>.r2.cloudflarestorage.com
#   bash infrastructure/history-archive/provision-history-archive.sh
set -euo pipefail

BUCKET="${BUCKET:-triumph-synergy-history}"
REGION="${AWS_REGION:-auto}"
HERE="$(cd "$(dirname "$0")" && pwd)"
SEED="$HERE/stellar-history.seed.json"

: "${AWS_ACCESS_KEY_ID:?missing AWS_ACCESS_KEY_ID}"
: "${AWS_SECRET_ACCESS_KEY:?missing AWS_SECRET_ACCESS_KEY}"

if [ ! -f "$SEED" ]; then
  echo "ERROR: missing seed manifest at $SEED" >&2
  exit 1
fi

ENDPOINT_FLAG=()
if [ -n "${S3_ENDPOINT:-}" ]; then
  ENDPOINT_FLAG=(--endpoint-url "$S3_ENDPOINT")
fi

run_aws() {
  docker run --rm \
    -e AWS_ACCESS_KEY_ID \
    -e AWS_SECRET_ACCESS_KEY \
    -e AWS_DEFAULT_REGION="$REGION" \
    -v "$HERE:/work:ro" \
    amazon/aws-cli "${ENDPOINT_FLAG[@]}" "$@"
}

echo "==> Ensuring bucket exists: $BUCKET"
if ! run_aws s3api head-bucket --bucket "$BUCKET" 2>/dev/null; then
  echo "  creating bucket"
  run_aws s3api create-bucket --bucket "$BUCKET" \
    $( [ "$REGION" != "auto" ] && [ "$REGION" != "us-east-1" ] && echo "--create-bucket-configuration LocationConstraint=$REGION" )
else
  echo "  bucket already exists"
fi

echo "==> Uploading seed manifest -> .well-known/stellar-history.json"
run_aws s3 cp /work/stellar-history.seed.json \
  "s3://$BUCKET/.well-known/stellar-history.json" \
  --content-type application/json --acl public-read || \
run_aws s3 cp /work/stellar-history.seed.json \
  "s3://$BUCKET/.well-known/stellar-history.json" \
  --content-type application/json
# (R2 ignores --acl; public-read needs to be configured at bucket level.)

echo "==> Listing bucket root (sanity check)"
run_aws s3 ls "s3://$BUCKET/" --recursive | head -20

cat <<EOF

==> DONE
Next steps:
  1. In the Cloudflare R2 dashboard (or S3 bucket policy), enable public read
     on bucket: $BUCKET
  2. Note the public base URL (R2 public-dev URL or your custom domain).
  3. Update public/.well-known/stellar.toml HISTORY field to that URL.
  4. Wire stellar-core.cfg [HISTORY.local] put/get/mkdir per
     infrastructure/history-archive/README.md section D.
  5. docker restart testnet2 and tail logs for "Publishing checkpoint".
EOF
