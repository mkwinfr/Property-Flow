#Requires -RunAsAdministrator

$ErrorActionPreference = 'Stop'

Write-Host 'Activating the Property Suite authentication update...' -ForegroundColor Cyan
Restart-Service -Name 'PropertySuite' -Force

$healthy = $false
for ($attempt = 0; $attempt -lt 30; $attempt += 1) {
  try {
    $response = Invoke-RestMethod -Uri 'http://127.0.0.1:4100/api/health' -TimeoutSec 2
    if ($response.status -eq 'ok' -and $response.service -eq 'property-suite') {
      $healthy = $true
      break
    }
  } catch {
    Start-Sleep -Milliseconds 500
  }
}
if (-not $healthy) { throw 'Property Suite did not pass its health check after restart.' }

$backupTask = & schtasks.exe /Query /TN '\PropertySuite Daily Backup' /FO LIST 2>$null
if ($LASTEXITCODE -ne 0 -or $backupTask -notmatch 'PropertySuite Daily Backup') {
  Write-Host 'Installing the daily backup task...'
  & 'C:\PropertySuite\Install-PropertySuite-BackupTask.ps1'
  if ($LASTEXITCODE -ne 0) { throw 'The daily backup task could not be installed.' }
}

& 'C:\PropertySuite\Configure-PropertySuite-Administrator.ps1'
if ($LASTEXITCODE -ne 0) { throw 'Administrator setup did not complete.' }

Write-Host ''
Write-Host 'Property Suite authentication hardening is active.' -ForegroundColor Green
Write-Host 'Open https://app.propertysuite.net and sign in with the administrator email and password you just chose.'
