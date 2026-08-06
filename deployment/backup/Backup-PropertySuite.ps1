param(
  [string] $InstallRoot = 'C:\PropertySuite',
  [ValidateRange(1, 3650)] [int] $RetentionDays = 30
)

$ErrorActionPreference = 'Stop'
$installRootPath = [System.IO.Path]::GetFullPath($InstallRoot).TrimEnd('\')
if ($installRootPath -ne 'C:\PropertySuite') {
  throw "Refusing to back up an unexpected installation root: $installRootPath"
}

$appRoot = Join-Path $installRootPath 'app'
$sourceDatabase = Join-Path $installRootPath 'data\property-suite.db'
$sourceAttachments = Join-Path $installRootPath 'data\attachments'
$backupRoot = Join-Path $installRootPath 'backups'
$databaseBackupRoot = Join-Path $backupRoot 'database'
$attachmentBackupRoot = Join-Path $backupRoot 'attachments'
$manifestRoot = Join-Path $backupRoot 'manifests'
$temporaryRoot = Join-Path $backupRoot 'temporary'
$logRoot = Join-Path $installRootPath 'logs\backup'
$logPath = Join-Path $logRoot 'backup.log'
$backupHelper = Join-Path $installRootPath 'scripts\backup-database.mjs'

foreach ($directory in @($databaseBackupRoot, $attachmentBackupRoot, $manifestRoot, $temporaryRoot, $logRoot)) {
  New-Item -ItemType Directory -Path $directory -Force | Out-Null
}

function Write-BackupLog([string] $Message) {
  $line = '{0} {1}' -f (Get-Date).ToUniversalTime().ToString('o'), $Message
  Add-Content -LiteralPath $logPath -Value $line
  Write-Output $line
}

if (-not (Test-Path -LiteralPath $sourceDatabase)) { throw "Database not found: $sourceDatabase" }
if (-not (Test-Path -LiteralPath $backupHelper)) { throw "Backup helper not found: $backupHelper" }

$timestamp = (Get-Date).ToUniversalTime().ToString('yyyyMMdd-HHmmss')
$databaseName = "property-suite-$timestamp.db"
$attachmentName = "property-suite-attachments-$timestamp.zip"
$manifestName = "property-suite-$timestamp.json"
$temporaryDatabase = Join-Path $temporaryRoot "$databaseName.partial"
$databaseDestination = Join-Path $databaseBackupRoot $databaseName
$attachmentDestination = Join-Path $attachmentBackupRoot $attachmentName
$manifestDestination = Join-Path $manifestRoot $manifestName

try {
  Write-BackupLog "Starting backup $timestamp"
  & 'C:\Program Files\nodejs\node.exe' $backupHelper $sourceDatabase $temporaryDatabase $appRoot
  if ($LASTEXITCODE -ne 0) { throw "SQLite backup helper exited with code $LASTEXITCODE" }
  Move-Item -LiteralPath $temporaryDatabase -Destination $databaseDestination

  $attachmentCreated = $false
  if ((Test-Path -LiteralPath $sourceAttachments) -and
      (Get-ChildItem -LiteralPath $sourceAttachments -File -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1)) {
    Compress-Archive -Path (Join-Path $sourceAttachments '*') -DestinationPath $attachmentDestination -CompressionLevel Optimal
    $attachmentCreated = $true
  }

  $databaseFile = Get-Item -LiteralPath $databaseDestination
  $manifest = [ordered]@{
    product = 'Property Suite'
    createdAtUtc = (Get-Date).ToUniversalTime().ToString('o')
    database = [ordered]@{
      file = $databaseFile.Name
      sizeBytes = $databaseFile.Length
      sha256 = (Get-FileHash -LiteralPath $databaseDestination -Algorithm SHA256).Hash.ToLowerInvariant()
      integrityCheck = 'ok'
    }
    attachments = if ($attachmentCreated) {
      $attachmentFile = Get-Item -LiteralPath $attachmentDestination
      [ordered]@{
        file = $attachmentFile.Name
        sizeBytes = $attachmentFile.Length
        sha256 = (Get-FileHash -LiteralPath $attachmentDestination -Algorithm SHA256).Hash.ToLowerInvariant()
      }
    } else { $null }
    retentionDays = $RetentionDays
  }
  $manifest | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath $manifestDestination -Encoding UTF8

  $cutoff = (Get-Date).ToUniversalTime().AddDays(-$RetentionDays)
  foreach ($directory in @($databaseBackupRoot, $attachmentBackupRoot, $manifestRoot)) {
    $resolvedDirectory = [System.IO.Path]::GetFullPath($directory)
    if (-not $resolvedDirectory.StartsWith($backupRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
      throw "Retention target escaped backup root: $resolvedDirectory"
    }
    Get-ChildItem -LiteralPath $resolvedDirectory -File |
      Where-Object { $_.LastWriteTimeUtc -lt $cutoff } |
      ForEach-Object { Remove-Item -LiteralPath $_.FullName -Force }
  }

  Write-BackupLog "Backup completed: $databaseName"
  $manifest | ConvertTo-Json -Depth 5
} catch {
  if (Test-Path -LiteralPath $temporaryDatabase) { Remove-Item -LiteralPath $temporaryDatabase -Force }
  Write-BackupLog "Backup failed: $($_.Exception.Message)"
  throw
}
