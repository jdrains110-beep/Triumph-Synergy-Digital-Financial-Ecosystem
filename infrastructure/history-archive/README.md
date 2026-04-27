# Triumph Synergy — Pi Testnet History Archive

`stellar-core` validators must publish a public, append-only history archive
so other nodes can catch up from us. SEP-1 references this in the `HISTORY`
field per validator. This directory contains the infrastructure for hosting
that archive on S3-compatible storage (AWS S3, Cloudflare R2, Backblaze B2,
GCS — anything S3-compatible).

## Layout (what `stellar-core` will write)

```
s3://triumph-synergy-history/
  .well-known/stellar-history.json     <- pointer to current state
  history/
    00/00/00/history-00000000.json
    ...
  ledger/
    00/00/00/ledger-00000000.xdr.gz
    ...
  bucket/
    <hash>.xdr.gz
    ...
  scp/
    00/00/00/scp-00000000.xdr.gz
    ...
  results/
    00/00/00/results-00000000.xdr.gz
    ...
  transactions/
    00/00/00/transactions-00000000.xdr.gz
    ...
```

## One-time setup

### A. Create the bucket (Cloudflare R2 example — cheapest egress)

```bash
# requires wrangler CLI + R2 enabled on your Cloudflare account
wrangler r2 bucket create triumph-synergy-history

# get an R2 access key + secret from Cloudflare dashboard:
#   R2 -> Manage R2 API Tokens -> Create API token (Object Read & Write)
# save them as env vars:
export AWS_ACCESS_KEY_ID=<r2_access_key>
export AWS_SECRET_ACCESS_KEY=<r2_secret>
export AWS_DEFAULT_REGION=auto
export S3_ENDPOINT=https://<account_id>.r2.cloudflarestorage.com
```

For AWS S3 use a normal IAM user with `s3:PutObject`, `s3:GetObject` on the
bucket, and `S3_ENDPOINT` set to the regional endpoint
(e.g. `https://s3.us-east-1.amazonaws.com`).

### B. Make the bucket public-read

R2:
```bash
# in Cloudflare dashboard: R2 -> bucket -> Settings -> Public Access -> Enable
# attach a custom domain: history.triumph-synergy.vercel.app
```

S3:
```json
// bucket policy
{
  "Version": "2012-10-17",
  "Statement": [{
    "Sid": "PublicRead",
    "Effect": "Allow",
    "Principal": "*",
    "Action": "s3:GetObject",
    "Resource": "arn:aws:s3:::triumph-synergy-history/*"
  }]
}
```

### C. Initialize the archive

The Pi Network stellar-core image does not ship `aws-cli`; we run the
initialization step from the host or a one-off `amazon/aws-cli` container.
This creates `.well-known/stellar-history.json` so peers can discover us.

```bash
docker run --rm \
  -e AWS_ACCESS_KEY_ID -e AWS_SECRET_ACCESS_KEY \
  -e AWS_DEFAULT_REGION=auto \
  -e S3_ENDPOINT \
  -v "$PWD/infrastructure/history-archive:/work" \
  -w /work \
  amazon/aws-cli \
  --endpoint-url "$S3_ENDPOINT" \
  s3 cp stellar-history.seed.json \
  s3://triumph-synergy-history/.well-known/stellar-history.json \
  --acl public-read --content-type application/json
```

### D. Wire `stellar-core.cfg` to publish

Add this block to:
`~/Library/Application Support/Pi Network/docker_volumes/testnet_2/stellar/core/etc/stellar-core.cfg`

```ini
# History archive — read + write our own published archive
[HISTORY.local]
get="curl -sf https://history.triumph-synergy.vercel.app/{0} -o {1}"
put="aws --endpoint-url https://<account_id>.r2.cloudflarestorage.com s3 cp {0} s3://triumph-synergy-history/{1} --acl public-read"
mkdir="aws --endpoint-url https://<account_id>.r2.cloudflarestorage.com s3api put-object --bucket triumph-synergy-history --key {0}/ --acl public-read"
```

The `aws` binary must be on `$PATH` inside the testnet2 container, OR you can
write a tiny shim that shells out to `docker run amazon/aws-cli ...`. Easiest:
add `pip install awscli` to a startup hook, or build a custom Pi Core image.

### E. Restart and verify

```bash
docker restart testnet2
sleep 60
docker exec testnet2 sh -c 'tail -30 /tmp/stellar-core.log | grep -iE "history|publish"'
curl -s https://history.triumph-synergy.vercel.app/.well-known/stellar-history.json | python3 -m json.tool
```

## Custom domain — `history.triumph-synergy.vercel.app`

`*.vercel.app` subdomains can't point at R2/S3. Instead, use one of:

1. Buy a domain (e.g. `triumphsynergy.io`), add `history` CNAME -> R2 public URL.
   Update `stellar.toml` HISTORY field to the new domain.
2. Use the raw R2 public URL: `https://pub-<id>.r2.dev/`.
3. Front R2 with a Cloudflare Worker on a real domain.

Until then, `stellar.toml` should list whichever URL is actually live.
