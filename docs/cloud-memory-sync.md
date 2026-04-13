# Triumph Cloud Memory Sync

This runbook enables a unified online/offline memory fabric for Triumph Synergy:

- Online: S3-compatible cloud target
- Online: Apple-compatible WebDAV target (iCloud bridge)
- Offline: local Docker backup mirror volume

## What was added

- Cloud-memory sync endpoints:
  - `POST /mem/sync/run`
  - `GET /mem/sync/status`
- Automatic scheduled sync loop in the cloud-memory service
- Snapshot integrity verification (SHA256 + decompress/JSON parse check)
- Prometheus metrics:
  - `mem_sync_runs_total{target,status}`
  - `mem_sync_last_attempt_epoch_seconds{target}`
  - `mem_sync_last_success_epoch_seconds{target}`
  - `mem_sync_snapshot_bytes`
  - `mem_sync_integrity_failures_total`
- Prometheus alerts:
  - `CloudMemorySyncFailure`
  - `CloudMemorySyncStale`

## Docker Compose environment variables

Set these in your environment or `.env` before starting the stack.

```env
# Scheduler
CLOUD_MEMORY_AUTO_SYNC_ENABLED=true
CLOUD_MEMORY_BACKUP_SCHEDULE_S=900

# S3-compatible target
CLOUD_MEMORY_S3_ENABLED=true
CLOUD_MEMORY_S3_BUCKET=triumph-synergy-backup
CLOUD_MEMORY_S3_PREFIX=triumph-cloud-memory
CLOUD_MEMORY_S3_REGION=us-east-1
CLOUD_MEMORY_S3_ENDPOINT=
CLOUD_MEMORY_S3_ACCESS_KEY_ID=
CLOUD_MEMORY_S3_SECRET_ACCESS_KEY=

# Apple WebDAV target (bridge)
APPLE_CLOUD_WEBDAV_ENABLED=false
APPLE_CLOUD_WEBDAV_BASE_URL=
APPLE_CLOUD_WEBDAV_USERNAME=
APPLE_CLOUD_WEBDAV_PASSWORD=
APPLE_CLOUD_WEBDAV_PATH=/triumph-cloud-memory

# HTTP timeout for WebDAV operations
CLOUD_MEMORY_SYNC_HTTP_TIMEOUT_S=20
```

## Start or update services

```powershell
docker compose build cloud-memory

docker compose up -d --no-deps cloud-memory prometheus
```

## Manual sync and verification

```powershell
# Trigger a manual run
curl.exe -s -X POST http://localhost:8095/mem/sync/run -H "Content-Type: application/json" -d "{\"trigger\":\"manual\"}"

# Check latest sync state
curl.exe -s http://localhost:8095/mem/sync/status

# Confirm cloud-memory metrics are scraped
curl.exe -s "http://localhost:9090/api/v1/query?query=up%7Bjob%3D%22triumph-cloud-memory%22%7D"
```

## Notes

- The local and offline mirror files are stored in Docker volume `triumph_cloud_memory_backup`.
- S3 sync is compatible with AWS S3 and S3-compatible object stores (set endpoint when needed).
- Apple sync uses a WebDAV bridge target supplied by the operator. Native iCloud server APIs are not exposed for direct server-side writes.
