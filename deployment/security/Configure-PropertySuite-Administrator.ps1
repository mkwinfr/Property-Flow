$ErrorActionPreference = 'Stop'
$installRoot = 'C:\PropertySuite'
$databasePath = Join-Path $installRoot 'data\property-suite.db'
$appRoot = Join-Path $installRoot 'app'
$utilityPath = Join-Path $appRoot 'scripts\configure-admin.mjs'
$backupScript = Join-Path $installRoot 'scripts\Backup-PropertySuite.ps1'

if (-not (Test-Path -LiteralPath $utilityPath)) { throw "Administrator utility not found: $utilityPath" }
if (-not (Test-Path -LiteralPath $databasePath)) { throw "Property Suite database not found: $databasePath" }

Write-Host 'Property Suite administrator setup' -ForegroundColor Cyan
Write-Host 'A verified backup will be created before credentials are changed.'
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File $backupScript
if ($LASTEXITCODE -ne 0) { throw 'The safety backup failed. Credentials were not changed.' }

$name = Read-Host 'Administrator display name [Morgan Reed]'
if ([string]::IsNullOrWhiteSpace($name)) { $name = 'Morgan Reed' }
$email = Read-Host 'Administrator email address'
if ([string]::IsNullOrWhiteSpace($email)) { throw 'Administrator email is required.' }

$securePassword = Read-Host 'New password (12 characters minimum)' -AsSecureString
$secureConfirmation = Read-Host 'Confirm new password' -AsSecureString
$password = [System.Net.NetworkCredential]::new('', $securePassword).Password
$confirmation = [System.Net.NetworkCredential]::new('', $secureConfirmation).Password
if ($password -cne $confirmation) { throw 'Passwords do not match. No changes were made.' }

$disableResponse = Read-Host 'Disable the seeded technician and leasing accounts? [Y/n]'
$disableSeededAccounts = $disableResponse -notmatch '^(n|no)$'

try {
  $payload = [ordered]@{
    name = $name
    email = $email
    password = $password
    disableSeededAccounts = $disableSeededAccounts
  } | ConvertTo-Json -Compress
  $result = $payload | & 'C:\Program Files\nodejs\node.exe' $utilityPath $databasePath $appRoot
  if ($LASTEXITCODE -ne 0) { throw 'Administrator credentials could not be updated.' }
  $summary = $result | ConvertFrom-Json
  Write-Host ''
  Write-Host 'Administrator credentials updated successfully.' -ForegroundColor Green
  Write-Host "Sign-in email: $($summary.email)"
  Write-Host 'All existing administrator sessions were invalidated.'
  if ($summary.seededAccountsDisabled) { Write-Host 'Seeded technician and leasing accounts were disabled.' }
} finally {
  $password = $null
  $confirmation = $null
  $payload = $null
}
