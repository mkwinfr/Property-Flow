# Push to git and trigger webhook on laptop
param()

Write-Host "Pushing to git repository..."
git push

if ($LASTEXITCODE -eq 0) {
    Write-Host "Push successful! Triggering webhook on laptop..."
    
    try {
        $response = Invoke-WebRequest -Uri "http://192.168.1.245:3456/webhook/pull" `
            -Method POST `
            -Headers @{"Content-Type" = "application/json"} `
            -TimeoutSec 10 `
            -ErrorAction Stop
        
        Write-Host "✓ Webhook triggered successfully (HTTP $($response.StatusCode))"
    } catch {
        Write-Host "✗ Failed to trigger webhook: $($_.Exception.Message)"
    }
} else {
    Write-Host "✗ Push failed, webhook not triggered"
}
