param()
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$services = docker compose config --services
$results = @()

function Invoke-InternalHttp {
  param([string]$Url)
  $raw = & docker run --rm --network triumph-net curlimages/curl:8.10.1 -sS -m 10 -w "HTTP_STATUS:%{http_code}" $Url 2>&1
  $joined = ($raw -join "`n")
  $idx = $joined.LastIndexOf("HTTP_STATUS:")
  if ($idx -ge 0) {
    $body = $joined.Substring(0, $idx)
    $statusText = $joined.Substring($idx + 12).Trim()
    $status = if ($statusText) { [int]$statusText } else { 0 }
  } else {
    $body = $joined
    $status = 0
  }
  [pscustomobject]@{ status = $status; body = $body; raw = $raw }
}

$endpointMap = @{
  "app" = "http://triumph-app:3000/api/health"
  "nginx" = "http://triumph-nginx:80/api/health"
  "market-data" = "http://triumph-market-data:8085/api/market"
  "ml-engine" = "http://triumph-ml-engine:8090/health"
  "credit-engine" = "http://triumph-credit-engine:8091/health"
  "pi-bridge-connector" = "http://triumph-pi-bridge-connector:8092/pi-node/status"
  "central-node" = "http://triumph-central-node:11626/info"
  "dual-value-engine" = "http://triumph-dual-value-engine:8093/health"
  "quantum-shield" = "http://triumph-quantum-shield:8094/health"
  "cloud-memory" = "http://triumph-cloud-memory:8095/health"
  "tokenization-engine" = "http://triumph-tokenization-engine:8089/health"
  "transaction-engine" = "http://triumph-transaction-engine:8080/health"
  "smart-contracts" = "http://triumph-smart-contracts:8082/health"
  "vault" = "http://triumph-vault:8081/health"
  "dex" = "http://triumph-dex:8088/health"
  "compliance" = "http://triumph-compliance:8087/health"
  "scp-upgrader" = "http://triumph-scp-upgrader:8083/health"
  "blockchain-oracle" = "http://triumph-blockchain-oracle:8086/health"
  "payment-processor" = "http://triumph-payment-processor:8084/health"
  "prometheus" = "http://triumph-prometheus:9090/-/healthy"
  "grafana" = "http://triumph-grafana:3000/api/health"
  "postgres-exporter" = "http://triumph-postgres-exporter:9187/metrics"
  "redis-exporter" = "http://triumph-redis-exporter:9121/metrics"
}

foreach ($svc in $services) {
  $cname = "triumph-$svc"
  $status = docker inspect -f "{{.State.Status}}" $cname 2>$null
  $health = docker inspect -f "{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}" $cname 2>$null
  $restartCountRaw = docker inspect -f "{{.RestartCount}}" $cname 2>$null
  $restartCount = if ($restartCountRaw) { [int]$restartCountRaw } else { 0 }
  $runningFor = docker ps --filter "name=^$cname$" --format "{{.RunningFor}}"
  $logText = cmd /c "docker logs --since 15m --tail 30 $cname 2>&1"
  $logTail = $logText -split "`r?`n"
  $errHits = ($logTail | Select-String -Pattern "error|failed|exception|timeout|connection refused|unreachable|degraded|panic" -CaseSensitive:$false | Measure-Object).Count

  $httpStatus = "n/a"
  $semanticOk = $true
  $semanticNote = ""

  if ($endpointMap.ContainsKey($svc)) {
    $resp = Invoke-InternalHttp -Url $endpointMap[$svc]
    $httpStatus = "$($resp.status)"

    if ($resp.status -lt 200 -or $resp.status -ge 400) {
      $semanticOk = $false
      $semanticNote = "endpoint_http_$($resp.status)"
    } else {
      try {
        $j = $resp.body | ConvertFrom-Json
        if ($svc -eq "pi-bridge-connector" -and $j.reachable -ne $true) {
          $semanticOk = $false
          $semanticNote = "pi_reachable_false"
        }
        if ($svc -eq "quantum-shield" -and ($j.services_healthy -lt $j.services_monitored)) {
          $semanticOk = $false
          $semanticNote = "quantum_partial_$($j.services_healthy)_of_$($j.services_monitored)"
        }
        if ($svc -eq "dual-value-engine" -and ($j.ml_reachable -ne $true -or $j.market_reachable -ne $true -or $j.bridge_reachable -ne $true)) {
          $semanticOk = $false
          $semanticNote = "dual_dependency_missing"
        }
      } catch {
        if ($svc -notin @("postgres-exporter", "redis-exporter", "prometheus")) {
          $semanticNote = "non_json_ok"
        }
      }
    }
  }

  $results += [pscustomobject]@{
    service = $svc
    container = $cname
    state = $status
    health = $health
    restarts = $restartCount
    runningFor = $runningFor
    endpointStatus = $httpStatus
    semanticOk = $semanticOk
    semanticNote = $semanticNote
    errorHits15m = [int]$errHits
  }
}

$out = "$env:TEMP\triumph_deep_dive.json"
$results | ConvertTo-Json -Depth 5 | Out-File -FilePath $out -Encoding utf8
Write-Output $out
