# Pi Node Snapshot Migration (Windows + Linux + macOS -> macOS)

This folder contains safe scripts to export and restore Pi node Docker-mounted data.

Completeness model for Pi Desktop node transfer:

- Exports every mount listed by `docker inspect <container>.Mounts`.
- Stores `inspect.json` so mount inventory is auditable.
- Writes `manifest.csv` with mount metadata and archive mapping.
- Writes `SHA256SUMS.txt` for archive integrity verification.
- Includes Pi Desktop `user-preferences` when present.

Important rules:

- Do not merge databases from different machines.
- Export each source machine as its own snapshot.
- Restore exactly one snapshot at a time on target macOS.
- Keep all other snapshots as cold backups.

## Files

- `export-windows.ps1`: Export Docker mount paths from a source Windows machine.
- `export-linux.sh`: Export Docker mount paths from a source Linux/macOS machine.
- `restore-macos.sh`: Restore one chosen snapshot on target macOS with strict mapping checks.

## 1) Export on Windows source

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\pi-node-migration\export-windows.ps1 -ContainerName testnet2
```

Or with positional args (container + output folder):

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\pi-node-migration\export-windows.ps1 testnet2 C:\path\to\output-folder
```

Output is created in:

```text
%USERPROFILE%\Desktop\PI-MIGRATION\windows-<HOST>-<TIMESTAMP>
```

## 2) Export on Linux or old macOS source

```bash
bash ./scripts/pi-node-migration/export-linux.sh testnet2
```

Output is created in:

```text
$HOME/PI-MIGRATION/<platform>-<host>-<timestamp>
```

## 3) Transfer snapshots to target macOS

Copy the whole source snapshot folders to target macOS.

## 4) Restore one snapshot on target macOS

1. Install Docker Desktop and Pi Node.
2. Start Pi Node once so it creates `testnet2` and mounts.
3. Stop Pi Node and container.
4. Run restore script from repo root:

```bash
bash ./scripts/pi-node-migration/restore-macos.sh /absolute/path/to/snapshot-folder testnet2 true
```

Third argument:

- `true`: restore Pi Desktop `user-preferences` to macOS app-data path (with backup).
- `false`: skip preference restore.

The script aborts if any destination path from `manifest.csv` does not match a target container mount.
If `SHA256SUMS.txt` exists, restore verifies checksums before extraction.

## 5) Verify after restore

- `docker start testnet2`
- `docker ps`
- `docker logs --tail 200 testnet2`

Then confirm ledger advances in Pi Desktop.

## Why this covers Horizon and node data

Pi Desktop node services (stellar-core, Horizon, PostgreSQL, history and related runtime data) are inside the Docker container mounts. Exporting all mounts from `docker inspect` captures the full persisted node state used by Pi Desktop for that container.
