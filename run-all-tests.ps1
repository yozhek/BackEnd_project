$services = @(
  "product-service",
  "bidding-service",
  "notification-service",
  "auth-service",
  "gateway-service"
)

$results = @()
$ErrorActionPreference = "Stop"

foreach ($s in $services) {
  Write-Host "`n=== Testing $s ===" -ForegroundColor Cyan
  Push-Location $s
  try {
    npm test
    $status = "passed"
  } catch {
    $status = "failed"
  } finally {
    Pop-Location
  }
  $results += @{ service = $s; status = $status }
  if ($status -eq "failed") {
    Write-Host "Tests failed in $s" -ForegroundColor Red
  }
}

$failed = $results | Where-Object { $_.status -eq "failed" }
if ($failed.Count -gt 0) {
  Write-Host "`nSummary:" -ForegroundColor Yellow
  $results | ForEach-Object { Write-Host "$($_.service): $($_.status)" }
  exit 1
} else {
  Write-Host "`nAll tests passed" -ForegroundColor Green
}
