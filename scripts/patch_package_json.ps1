# PowerShell wrapper to run the patch script
Set-Location -LiteralPath (Join-Path $PSScriptRoot '..')
if (-not (Test-Path .\package.json)) {
  Write-Error 'package.json not found in repository root. Run this script from the repo scripts folder.'
  exit 1
}
node .\scripts\patch_package_json.js
