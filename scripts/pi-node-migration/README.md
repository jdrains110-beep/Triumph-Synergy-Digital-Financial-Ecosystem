# Pi Node Snapshot Migration (Windows + Linux + macOS -> macOS)

This folder contains safe scripts to export and restore Pi node Docker-mounted data.

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
bash ./scripts/pi-node-migration/restore-macos.sh /absolute/path/to/snapshot-folder testnet2
```

The script aborts if any destination path from `manifest.csv` does not match a target container mount.

## 5) Verify after restore

- `docker start testnet2`
- `docker ps`
- `docker logs --tail 200 testnet2`

Then confirm ledger advances in Pi Desktop.
