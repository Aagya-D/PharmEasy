# PharmEasy - Backend Health Check Script
# Use this to verify the backend is running before starting frontend

Write-Host "🔍 Checking Backend Server Status..." -ForegroundColor Cyan

$backendUrl = "http://localhost:5000/api/health"
$maxAttempts = 3
$attempt = 0

while ($attempt -lt $maxAttempts) {
    $attempt++
    Write-Host "Attempt $attempt/$maxAttempts..." -ForegroundColor Yellow
    
    try {
        $response = Invoke-RestMethod -Uri $backendUrl -Method Get -ErrorAction Stop
        
        Write-Host "✓ Backend is ONLINE!" -ForegroundColor Green
        Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Green
        Write-Host "Response:" -ForegroundColor White
        $response | ConvertTo-Json -Depth 3 | Write-Host
        Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Green
        Write-Host ""
        Write-Host "✓ You can now start the frontend!" -ForegroundColor Green
        exit 0
        
    } catch {
        Write-Host "✗ Backend is NOT responding" -ForegroundColor Red
        
        if ($attempt -lt $maxAttempts) {
            Write-Host "Retrying in 2 seconds..." -ForegroundColor Yellow
            Start-Sleep -Seconds 2
        }
    }
}

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Red
Write-Host "❌ Backend server is NOT running!" -ForegroundColor Red
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Red
Write-Host ""
Write-Host "To start the backend server:" -ForegroundColor Yellow
Write-Host "  1. Open a new terminal" -ForegroundColor White
Write-Host "  2. cd Backend" -ForegroundColor White
Write-Host "  3. npm run dev" -ForegroundColor White
Write-Host ""
Write-Host "Or use the quick-start script:" -ForegroundColor Yellow
Write-Host "  cd Backend && .\start-dev.ps1" -ForegroundColor White
Write-Host ""

exit 1
