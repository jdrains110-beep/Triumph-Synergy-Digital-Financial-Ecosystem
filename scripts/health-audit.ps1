param()
$tests = @(
  @("nginx/app",        "http://localhost/api/health"),
  @("pi-bridge",        "http://localhost/services/pi-bridge/health"),
  @("pi-bridge/node",   "http://localhost/services/pi-bridge/pi-node/status"),
  @("market-data",      "http://localhost/services/market-data/health"),
  @("oracle",           "http://localhost/services/oracle/health"),
  @("compliance",       "http://localhost/services/compliance/health"),
  @("dex",              "http://localhost/services/dex/health"),
  @("transactions",     "http://localhost/services/transactions/health"),
  @("payments",         "http://localhost/services/payments/health"),
  @("vault",            "http://localhost/services/vault/health"),
  @("contracts",        "http://localhost/services/contracts/health"),
  @("scp",              "http://localhost/services/scp/health"),
  @("ml-engine",        "http://localhost/services/ml/health"),
  @("credit-engine",    "http://localhost/services/credit/health"),
  @("tokenization",     "http://localhost/services/tokenization/health"),
  @("prometheus",       "http://localhost:9090/-/healthy"),
  @("grafana",          "http://localhost:3001/api/health"),
  @("hq-broadcast",     "http://localhost/api/hq-broadcast?view=summary"),
  @("tokenization-hq",  "http://localhost/api/tokenization/hq"),
  @("credit-hq-score",  "http://localhost/services/credit/api/credit/hq-deed-score")
)
$ok = 0; $err = 0
foreach ($t in $tests) {
  $name = $t[0]; $url = $t[1]
  try {
    $r = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 6 -ErrorAction Stop
    $body = ($r.Content -replace '\r?\n',' ' -replace '\s+',' ').Trim()
    if ($body.Length -gt 100) { $body = $body.Substring(0,100) + "..." }
    Write-Host "OK  $($name.PadRight(20)) [$($r.StatusCode)] $body"
    $ok++
  } catch {
    $msg = ($_.Exception.Message -replace '\r?\n',' ').Trim()
    Write-Host "ERR $($name.PadRight(20)) $msg"
    $err++
  }
}
Write-Host ""
Write-Host "RESULT: $ok OK / $err ERR out of $($tests.Count) services"
