param(
  [string]$ContainerName = "testnet2",
  [string]$OutputFolder = "",
  [string]$FallbackPiDataRoot = ""
)

$ErrorActionPreference = "Stop"

function Safe-Name([string]$pathValue) {
  return (($pathValue -replace '[\\/:*?"<>|]', '_').Trim('_'))
}

function Invoke-TarWithRetry {
  param(
    [Parameter(Mandatory = $true)][string]$ArchivePath,
    [Parameter(Mandatory = $true)][string]$SourceBase,
    [Parameter(Mandatory = $true)][string]$SourceEntry
  )

  $maxAttempts = 2
  for ($attempt = 1; $attempt -le $maxAttempts; $attempt++) {
    tar -czf $ArchivePath -C $SourceBase $SourceEntry
    if ($LASTEXITCODE -eq 0) {
      return
    }

    if ($attempt -lt $maxAttempts) {
      Write-Warning "tar failed (attempt $attempt/$maxAttempts) for '$ArchivePath'. Retrying..."
      Start-Sleep -Seconds 2
    }
  }

  throw "Failed to create archive after retries: $ArchivePath"
}

$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$resolvedOutput = $OutputFolder.Trim()
if ([string]::IsNullOrWhiteSpace($resolvedOutput)) {
  $outBase = Join-Path $env:USERPROFILE "Desktop\PI-MIGRATION\windows-$env:COMPUTERNAME-$stamp"
} else {
  $outBase = Join-Path $resolvedOutput "windows-$env:COMPUTERNAME-$stamp"
}
New-Item -ItemType Directory -Path $outBase -Force | Out-Null

$dockerAvailable = $true
cmd /c "docker version >nul 2>nul"
if ($LASTEXITCODE -ne 0) {
  $dockerAvailable = $false
}

"container,type,name,destination,source,archive" | Out-File (Join-Path $outBase "manifest.csv") -Encoding ascii

if ($dockerAvailable) {
  # Ensure target container exists.
  $containerId = (docker ps -a --filter "name=^${ContainerName}$" --format "{{.ID}}" | Select-Object -First 1)
  if ([string]::IsNullOrWhiteSpace($containerId)) {
    throw "Container '$ContainerName' was not found. Verify Pi Desktop node container name and retry."
  }

  $inspectRaw = docker inspect $ContainerName
  $inspectRaw | Out-File (Join-Path $outBase "inspect.json") -Encoding ascii
  $inspect = $inspectRaw | ConvertFrom-Json
  $wasRunning = [bool]$inspect[0].State.Running
  $mounts = $inspect[0].Mounts

  if (-not $mounts -or $mounts.Count -eq 0) {
    throw "No Docker mounts found for '$ContainerName'. Aborting to avoid incomplete snapshot."
  }

  if ($wasRunning) {
    Write-Host "Stopping container $ContainerName..."
    docker stop $ContainerName | Out-Null
  }

  foreach ($m in $mounts) {
    if ([string]::IsNullOrWhiteSpace($m.Source) -or -not (Test-Path $m.Source)) {
      throw "Mount source path is missing or inaccessible for destination '$($m.Destination)': '$($m.Source)'"
    }

    $safe = Safe-Name $m.Destination
    $archive = "$safe.tgz"
    $archivePath = Join-Path $outBase $archive

    Write-Host "Archiving $($m.Destination) [$($m.Type)] from $($m.Source)..."
    Invoke-TarWithRetry -ArchivePath $archivePath -SourceBase $m.Source -SourceEntry "."

    "$ContainerName,$($m.Type),$($m.Name),$($m.Destination),$($m.Source),$archive" | Add-Content (Join-Path $outBase "manifest.csv")
  }

  if ($wasRunning) {
    Write-Host "Starting container $ContainerName..."
    docker start $ContainerName | Out-Null
  }
} else {
  $fallbackRoot = $FallbackPiDataRoot.Trim()
  if ([string]::IsNullOrWhiteSpace($fallbackRoot)) {
    $fallbackRoot = Join-Path $env:APPDATA "Pi Network\docker_volumes\testnet_2"
  }

  if (-not (Test-Path $fallbackRoot)) {
    throw "Docker is unavailable and fallback Pi data root was not found: $fallbackRoot"
  }

  $fallbackMeta = @{
    mode = "fallback"
    reason = "docker-unavailable"
    fallbackRoot = $fallbackRoot
    exportedAt = (Get-Date).ToString("o")
    host = $env:COMPUTERNAME
  } | ConvertTo-Json -Depth 4
  $fallbackMeta | Out-File (Join-Path $outBase "inspect.json") -Encoding ascii

  Write-Warning "Docker engine unavailable. Using fallback export from persisted Pi Desktop volume path: $fallbackRoot"

  $items = Get-ChildItem -Path $fallbackRoot -Force
  foreach ($item in $items) {
    $safe = Safe-Name $item.Name
    $archive = "fallback_$safe.tgz"
    $archivePath = Join-Path $outBase $archive

    if ($item.PSIsContainer) {
      Write-Host "Archiving fallback directory $($item.FullName)..."
      Invoke-TarWithRetry -ArchivePath $archivePath -SourceBase $item.FullName -SourceEntry "."
      "$ContainerName,bind,fallback,$($item.Name),$($item.FullName),$archive" | Add-Content (Join-Path $outBase "manifest.csv")
    } else {
      Write-Host "Archiving fallback file $($item.FullName)..."
      Invoke-TarWithRetry -ArchivePath $archivePath -SourceBase $fallbackRoot -SourceEntry $item.Name
      "$ContainerName,bind,fallback,$($item.Name),$($item.FullName),$archive" | Add-Content (Join-Path $outBase "manifest.csv")
    }
  }
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

$archiveCount = (Get-ChildItem -Path $outBase -Filter *.tgz -File | Measure-Object).Count
if ($archiveCount -lt 1) {
  throw "No archive files were created. Snapshot is incomplete."
}

Write-Host "Snapshot created: $outBase"
if ($dockerAvailable) {
  Write-Host "Includes: all Docker mounts from inspect + inspect.json + SHA256SUMS.txt + user-preferences (if present)."
} else {
  Write-Warning "Created fallback snapshot from Pi Desktop persisted volume path."
  Write-Warning "For fallback snapshots, manual restore mapping on macOS is required."
}
