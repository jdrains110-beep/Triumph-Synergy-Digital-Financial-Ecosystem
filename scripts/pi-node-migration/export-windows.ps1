param(
  [string]$ContainerName = "testnet2"
)

$ErrorActionPreference = "Stop"

function Safe-Name([string]$pathValue) {
  return (($pathValue -replace '[\\/:*?"<>|]', '_').Trim('_'))
}

$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$outBase = Join-Path $env:USERPROFILE "Desktop\PI-MIGRATION\windows-$env:COMPUTERNAME-$stamp"
New-Item -ItemType Directory -Path $outBase -Force | Out-Null

$inspectRaw = docker inspect $ContainerName
$inspectRaw | Out-File (Join-Path $outBase "inspect.json") -Encoding ascii
$inspect = $inspectRaw | ConvertFrom-Json
$wasRunning = [bool]$inspect[0].State.Running
$mounts = $inspect[0].Mounts

if ($wasRunning) {
  Write-Host "Stopping container $ContainerName..."
  docker stop $ContainerName | Out-Null
}

"container,type,name,destination,source,archive" | Out-File (Join-Path $outBase "manifest.csv") -Encoding ascii

foreach ($m in $mounts) {
  $safe = Safe-Name $m.Destination
  $archive = "$safe.tgz"
  $archivePath = Join-Path $outBase $archive

  Write-Host "Archiving $($m.Destination) [$($m.Type)] from $($m.Source)..."
  tar -czf $archivePath -C $m.Source .

  "$ContainerName,$($m.Type),$($m.Name),$($m.Destination),$($m.Source),$archive" | Add-Content (Join-Path $outBase "manifest.csv")
}

$prefs = Join-Path $env:APPDATA "Pi Network\user-preferences"
if (Test-Path $prefs) {
  Copy-Item $prefs (Join-Path $outBase "user-preferences") -Force
}

# Portable checksum format: <sha256><two spaces><filename>
$hashFile = Join-Path $outBase "SHA256SUMS.txt"
if (Test-Path $hashFile) {
  Remove-Item $hashFile -Force
}

$filesForHash = Get-ChildItem -Path $outBase -File | Where-Object { $_.Name -match '\.tgz$|^inspect\.json$|^user-preferences$' }
foreach ($f in $filesForHash) {
  $h = (Get-FileHash -Algorithm SHA256 -Path $f.FullName).Hash.ToLower()
  "$h  $($f.Name)" | Add-Content $hashFile
}

if ($wasRunning) {
  Write-Host "Starting container $ContainerName..."
  docker start $ContainerName | Out-Null
}

Write-Host "Snapshot created: $outBase"
Write-Host "Includes: all Docker mounts from inspect + inspect.json + SHA256SUMS.txt + user-preferences (if present)."
