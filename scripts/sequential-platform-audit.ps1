param(
  [string]$Network = "triumph-net",
  [int]$TimeoutSec = 10,
  [switch]$AsJson
)

$ErrorActionPreference = "Stop"

$checks = @(
  @{ Name = "redis";               Url = "triumph-redis";                                  Protocol = "container-health" },
  @{ Name = "postgres";            Url = "triumph-postgres";                               Protocol = "container-health" },
  @{ Name = "prometheus";          Url = "http://triumph-prometheus:9090/-/healthy";      Protocol = "http" },
  @{ Name = "grafana";             Url = "http://triumph-grafana:3000/api/health";        Protocol = "http" },
  @{ Name = "redis-exporter";      Url = "http://triumph-redis-exporter:9121/metrics";    Protocol = "http" },
  @{ Name = "postgres-exporter";   Url = "http://triumph-postgres-exporter:9187/metrics"; Protocol = "http" },
  @{ Name = "cloud-memory";        Url = "http://triumph-cloud-memory:8095/health";       Protocol = "http" },
  @{ Name = "payment-processor";   Url = "http://triumph-payment-processor:8084/health";  Protocol = "http" },
  @{ Name = "market-data";         Url = "http://triumph-market-data:8085/health";        Protocol = "http" },
  @{ Name = "market-data-live";    Url = "http://triumph-market-data:8085/api/market";    Protocol = "http" },
  @{ Name = "ml-engine";           Url = "http://triumph-ml-engine:8090/health";          Protocol = "http" },
  @{ Name = "quantum-shield";      Url = "http://triumph-quantum-shield:8094/health";     Protocol = "http" },
  @{ Name = "central-node";        Url = "http://triumph-central-node:11626/info";        Protocol = "http" },
  @{ Name = "dual-value-engine";   Url = "http://triumph-dual-value-engine:8093/health";  Protocol = "http" },
  @{ Name = "credit-engine";       Url = "http://triumph-credit-engine:8091/health";      Protocol = "http" },
  @{ Name = "tokenization-engine"; Url = "http://triumph-tokenization-engine:8089/health";Protocol = "http" },
  @{ Name = "transaction-engine";  Url = "http://triumph-transaction-engine:8080/health"; Protocol = "http" },
  @{ Name = "smart-contracts";     Url = "http://triumph-smart-contracts:8082/health";    Protocol = "http" },
  @{ Name = "vault";               Url = "http://triumph-vault:8081/health";              Protocol = "http" },
  @{ Name = "dex";                 Url = "http://triumph-dex:8088/health";                Protocol = "http" },
  @{ Name = "compliance";          Url = "http://triumph-compliance:8087/health";         Protocol = "http" },
  @{ Name = "scp-upgrader";        Url = "http://triumph-scp-upgrader:8083/health";       Protocol = "http" },
  @{ Name = "blockchain-oracle";   Url = "http://triumph-blockchain-oracle:8086/health";  Protocol = "http" },
  @{ Name = "pi-bridge";           Url = "http://triumph-pi-bridge-connector:8092/health";Protocol = "http" },
  @{ Name = "pi-bridge-live";      Url = "http://triumph-pi-bridge-connector:8092/pi-node/status"; Protocol = "http" },
  @{ Name = "app";                 Url = "http://triumph-app:3000/api/health";            Protocol = "http" },
  @{ Name = "nginx";               Url = "http://triumph-nginx:80/api/health";            Protocol = "http" }
)

$results = New-Object System.Collections.Generic.List[object]

function Invoke-HttpProbe {
  param(
    [string]$Url,
    [string]$Network,
    [int]$TimeoutSec
  )

  $escaped = $Url.Replace('"', '\"')
  $cmd = "docker run --rm --network $Network curlimages/curl:8.10.1 -sS -m $TimeoutSec -w `"`nHTTP_STATUS:%{http_code}`n`" `"$escaped`""
  $output = Invoke-Expression $cmd 2>&1
  $statusLine = ($output | Select-String "HTTP_STATUS:" | Select-Object -Last 1).Line
  $statusCode = if ($statusLine) { [int]($statusLine -replace "HTTP_STATUS:", "") } else { 0 }
  $body = ($output | Where-Object { $_ -notmatch "HTTP_STATUS:" }) -join "`n"

  return [pscustomobject]@{
    StatusCode = $statusCode
    Body = $body
  }
}

foreach ($c in $checks) {
  $ok = $false
  $statusCode = 0
  $summary = ""
  $errorText = $null

  try {
    if ($c.Protocol -eq "http") {
      $probe = Invoke-HttpProbe -Url $c.Url -Network $Network -TimeoutSec $TimeoutSec
      $statusCode = $probe.StatusCode
      $ok = $statusCode -ge 200 -and $statusCode -lt 400
      $bodyOneLine = ($probe.Body -replace "\r?\n", " " -replace "\s+", " ").Trim()
      if ($bodyOneLine.Length -gt 160) {
        $bodyOneLine = $bodyOneLine.Substring(0, 160) + "..."
      }
      $summary = $bodyOneLine

      if ($ok -and $c.Name -in @("pi-bridge-live", "quantum-shield", "dual-value-engine")) {
        try {
          $json = $probe.Body | ConvertFrom-Json
          if ($c.Name -eq "pi-bridge-live" -and $json.reachable -ne $true) {
            $ok = $false
            $summary = "reachable=false last_error=$($json.last_error)"
          }
          if ($c.Name -eq "quantum-shield" -and $json.services_healthy -lt $json.services_monitored) {
            $ok = $false
            $summary = "services_healthy=$($json.services_healthy)/$($json.services_monitored)"
          }
          if ($c.Name -eq "dual-value-engine" -and ($json.ml_reachable -ne $true -or $json.market_reachable -ne $true -or $json.bridge_reachable -ne $true)) {
            $ok = $false
            $summary = "dependency_reachability ml=$($json.ml_reachable) market=$($json.market_reachable) bridge=$($json.bridge_reachable)"
          }
        } catch {
          $ok = $false
          $summary = "semantic_parse_failed"
        }
      }
    } elseif ($c.Protocol -eq "container-health") {
      $container = $c.Url
      $status = docker inspect -f "{{.State.Status}}" $container 2>$null
      $health = docker inspect -f "{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}" $container 2>$null
      $ok = $status -eq "running" -and ($health -eq "healthy" -or $health -eq "none")
      $statusCode = if ($ok) { 200 } else { 503 }
      $summary = "container=$container status=$status health=$health"
    }
  } catch {
    $ok = $false
    $errorText = ($_.Exception.Message -replace "\r?\n", " ").Trim()
  }

  $results.Add([pscustomobject]@{
    name = $c.Name
    url = $c.Url
    statusCode = $statusCode
    ok = $ok
    summary = $summary
    error = $errorText
    checkedAt = (Get-Date).ToString("o")
  }) | Out-Null

  if ($ok) {
    Write-Host ("OK   {0,-24} [{1}] {2}" -f $c.Name, $statusCode, $summary)
  } else {
    $failureDetail = if ([string]::IsNullOrWhiteSpace($errorText)) { $summary } else { $errorText }
    Write-Host ("FAIL {0,-24} [{1}] {2}" -f $c.Name, $statusCode, $failureDetail)
  }
}

$total = $results.Count
$passed = ($results | Where-Object { $_.ok }).Count
$failed = $total - $passed
Write-Host ""
Write-Host "RESULT: $passed passed / $failed failed / $total total"

if ($AsJson) {
  $results | ConvertTo-Json -Depth 5
}

if ($failed -gt 0) {
  exit 1
}
