#Requires -RunAsAdministrator

$ErrorActionPreference = 'Stop'
$taskName = '\PropertySuite Daily Backup'
$backupScript = 'C:\PropertySuite\scripts\Backup-PropertySuite.ps1'
$installLogRoot = 'C:\PropertySuite\logs\backup'
$installLog = Join-Path $installLogRoot 'task-install.log'

New-Item -ItemType Directory -Path $installLogRoot -Force | Out-Null
Start-Transcript -LiteralPath $installLog -Append | Out-Null

try {

  if (-not (Test-Path -LiteralPath $backupScript)) {
    throw "Backup script not found: $backupScript"
  }

  # Prove the backup works before scheduling it.
  & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $backupScript
  if ($LASTEXITCODE -ne 0) { throw 'Initial Property Suite backup failed.' }

  $taskCommand = 'powershell.exe -NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File "C:\PropertySuite\scripts\Backup-PropertySuite.ps1"'
  & schtasks.exe /Create /TN $taskName /TR $taskCommand /SC DAILY /ST '02:00' /RU SYSTEM /RL HIGHEST /F
  if ($LASTEXITCODE -ne 0) { throw "schtasks.exe failed to register $taskName (exit $LASTEXITCODE)." }

  $queryOutput = & schtasks.exe /Query /TN $taskName /FO LIST /V
  $queryText = $queryOutput -join [Environment]::NewLine
  if ($LASTEXITCODE -ne 0 -or $queryText -notmatch 'PropertySuite Daily Backup') {
    throw 'Windows did not retain the Property Suite backup task after registration.'
  }

  Write-Host 'Property Suite daily backup task installed and verified successfully.' -ForegroundColor Green
  $queryOutput
} finally {
  Stop-Transcript | Out-Null
}
