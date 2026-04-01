# Script to add all environment variables to Vercel
Write-Host "Adding environment variables to Vercel..." -ForegroundColor Cyan

# Read from .env.local
$envContent = Get-Content .env.local

# Extract values
$postgresUrl = ($envContent | Select-String -Pattern "^POSTGRES_URL=" | Select-Object -First 1).ToString() -replace '^POSTGRES_URL=', '' -replace '"', ''
$supabaseServiceRole = ($envContent | Select-String -Pattern "^SUPABASE_SERVICE_ROLE_KEY=" | Select-Object -First 1).ToString() -replace '^SUPABASE_SERVICE_ROLE_KEY=', '' -replace '"', ''
$authSecret = Get-Content ".auth-secret-temp.txt"

# Add variables using temporary files to avoid escaping issues
Write-Host "`nAdding POSTGRES_URL..." -ForegroundColor Yellow
$postgresUrl | Out-File -FilePath ".temp-postgres.txt" -NoNewline -Encoding UTF8
Get-Content ".temp-postgres.txt" | vercel env add POSTGRES_URL production --force

Write-Host "`nVerifying additions..." -ForegroundColor Green
vercel env ls production | Select-String -Pattern "POSTGRES_URL|AUTH_SECRET|NEXTAUTH_SECRET|PI_API_KEY"

# Cleanup
Remove-Item ".temp-postgres.txt" -ErrorAction SilentlyContinue

Write-Host "`n✅ Environment variables configured!" -ForegroundColor Green
Write-Host "Run 'vercel --prod' to deploy with new configuration" -ForegroundColor Cyan
