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

Write-Host "Stopping container $ContainerName..."
docker stop $ContainerName | Out-Null

$inspect = docker inspect $ContainerName | ConvertFrom-Json
$mounts = $inspect[0].Mounts

"container,destination,source,archive" | Out-File (Join-Path $outBase "manifest.csv") -Encoding ascii

foreach ($m in $mounts) {
  $safe = Safe-Name $m.Destination
  $archive = "$safe.tgz"
  $archivePath = Join-Path $outBase $archive

  Write-Host "Archiving $($m.Destination) from $($m.Source)..."
  tar -czf $archivePath -C $m.Source .

  "$ContainerName,$($m.Destination),$($m.Source),$archive" | Add-Content (Join-Path $outBase "manifest.csv")
}

$prefs = Join-Path $env:APPDATA "Pi Network\user-preferences"
if (Test-Path $prefs) {
  Copy-Item $prefs (Join-Path $outBase "user-preferences") -Force
}

Write-Host "Starting container $ContainerName..."
docker start $ContainerName | Out-Null

Write-Host "Snapshot created: $outBase"
