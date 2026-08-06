param(
  [string] $WorkspaceRoot = (Split-Path -Parent $PSScriptRoot),
  [string] $InstallRoot = 'C:\PropertySuite',
  [ValidateRange(10, 180)] [int] $HealthTimeoutSeconds = 45,
  [switch] $ValidateOnly
)

$ErrorActionPreference = 'Stop'
$serviceName = 'PropertySuite'
$expectedInstallRoot = 'C:\PropertySuite'

function Write-Step([string] $Message) {
  Write-Host "`n==> $Message" -ForegroundColor Cyan
}

function Wait-ServiceState([string] $Name, [string] $State, [int] $TimeoutSeconds = 30) {
  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
  do {
    $service = Get-Service -Name $Name -ErrorAction Stop
    if ($service.Status.ToString() -eq $State) { return }
    Start-Sleep -Milliseconds 300
  } while ((Get-Date) -lt $deadline)
  throw "Service $Name did not reach state $State within $TimeoutSeconds seconds."
}

function Wait-ApplicationHealth([int] $TimeoutSeconds) {
  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
  do {
    try {
      $response = Invoke-RestMethod -Uri 'http://127.0.0.1:4100/api/health' -TimeoutSec 2
      if ($response.status -eq 'ok' -and $response.service -eq 'property-suite') { return }
    } catch {
      # The service may still be starting or applying migrations.
    }
    Start-Sleep -Seconds 1
  } while ((Get-Date) -lt $deadline)
  throw "Property Suite did not pass its health check within $TimeoutSeconds seconds."
}

function Invoke-Npm([string[]] $Arguments, [string] $WorkingDirectory) {
  Push-Location -LiteralPath $WorkingDirectory
  try {
    & npm.cmd @Arguments
    if ($LASTEXITCODE -ne 0) { throw "npm $($Arguments -join ' ') exited with code $LASTEXITCODE." }
  } finally {
    Pop-Location
  }
}

function Test-ProductionDatabase([string] $AppRoot, [string] $DatabasePath) {
  $check = @'
const Database = require('better-sqlite3');
const database = new Database(process.argv[1], { readonly: true, fileMustExist: true });
const result = {
  migration: database.prepare('SELECT MAX(version) AS version FROM schema_migrations').get().version,
  integrity: database.pragma('integrity_check', { simple: true }),
};
database.close();
console.log(JSON.stringify(result));
'@
  Push-Location -LiteralPath $AppRoot
  try {
    $json = & 'C:\Program Files\nodejs\node.exe' -e $check $DatabasePath
    if ($LASTEXITCODE -ne 0) { throw "Database verification exited with code $LASTEXITCODE." }
    $result = $json | ConvertFrom-Json
    if ($result.integrity -ne 'ok') { throw "Production database integrity failed: $($result.integrity)" }
    if ([int]$result.migration -lt 1) { throw 'Production database has no applied schema migration.' }
    return $result
  } finally {
    Pop-Location
  }
}

$workspaceRootPath = [System.IO.Path]::GetFullPath($WorkspaceRoot).TrimEnd('\')
$installRootPath = [System.IO.Path]::GetFullPath($InstallRoot).TrimEnd('\')
if ($installRootPath -ne $expectedInstallRoot) {
  throw "Refusing to deploy to unexpected installation root: $installRootPath"
}

$appRoot = Join-Path $installRootPath 'app'
$databasePath = Join-Path $installRootPath 'data\property-suite.db'
$backupScript = Join-Path $installRootPath 'scripts\Backup-PropertySuite.ps1'
$sourceDist = Join-Path $workspaceRootPath 'dist'
$sourceServer = Join-Path $workspaceRootPath 'dist-server'
$sourcePackage = Join-Path $workspaceRootPath 'package.json'
$sourceLock = Join-Path $workspaceRootPath 'package-lock.json'
$productionDist = Join-Path $appRoot 'dist'
$productionServer = Join-Path $appRoot 'dist-server'
$productionPackage = Join-Path $appRoot 'package.json'
$productionLock = Join-Path $appRoot 'package-lock.json'

$requiredFiles = @(
  (Join-Path $workspaceRootPath 'package.json'),
  (Join-Path $workspaceRootPath 'package-lock.json'),
  $backupScript,
  $databasePath,
  $productionPackage,
  $productionLock
)
foreach ($file in $requiredFiles) {
  if (-not (Test-Path -LiteralPath $file -PathType Leaf)) { throw "Required file not found: $file" }
}
foreach ($directory in @($appRoot, $productionDist, $productionServer)) {
  if (-not (Test-Path -LiteralPath $directory -PathType Container)) { throw "Required directory not found: $directory" }
}
if (-not (Get-Service -Name $serviceName -ErrorAction SilentlyContinue)) {
  throw "Windows service $serviceName is not installed."
}

if (-not $ValidateOnly) {
  $isAdministrator = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole(
    [Security.Principal.WindowsBuiltInRole]::Administrator
  )
  if (-not $isAdministrator) {
    Write-Step 'Requesting administrator permission for production deployment'
    $arguments = "-NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`" -WorkspaceRoot `"$workspaceRootPath`" -InstallRoot `"$installRootPath`" -HealthTimeoutSeconds $HealthTimeoutSeconds"
    $elevated = Start-Process -FilePath 'powershell.exe' -Verb RunAs -ArgumentList $arguments -Wait -PassThru
    exit $elevated.ExitCode
  }
}

$deploymentMutex = $null
if (-not $ValidateOnly) {
  $deploymentMutex = [System.Threading.Mutex]::new($false, 'Global\PropertySuiteDeployment')
  if (-not $deploymentMutex.WaitOne(0)) {
    throw 'Another Property Suite deployment is already running.'
  }
}

Write-Step 'Running automated tests'
Invoke-Npm -Arguments @('test') -WorkingDirectory $workspaceRootPath

Write-Step 'Building the production application'
Invoke-Npm -Arguments @('run', 'build') -WorkingDirectory $workspaceRootPath

foreach ($artifact in @(
  (Join-Path $sourceDist 'index.html'),
  (Join-Path $sourceServer 'server\index.js'),
  (Join-Path $sourceServer 'server\db\schema.js')
)) {
  if (-not (Test-Path -LiteralPath $artifact -PathType Leaf)) { throw "Build artifact not found: $artifact" }
}

if ($ValidateOnly) {
  Write-Step 'Validation completed without changing production'
  Write-Host 'Tests, build artifacts, production paths, backup tooling, database path, and service registration are valid.' -ForegroundColor Green
  exit 0
}

Write-Step 'Creating a verified production backup'
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File $backupScript
if ($LASTEXITCODE -ne 0) { throw "Production backup exited with code $LASTEXITCODE." }

$timestamp = (Get-Date).ToUniversalTime().ToString('yyyyMMdd-HHmmss')
$rollbackRoot = Join-Path $installRootPath "deployments\rollback-$timestamp"
New-Item -ItemType Directory -Path $rollbackRoot -Force | Out-Null
Copy-Item -LiteralPath $productionDist -Destination $rollbackRoot -Recurse -Force
Copy-Item -LiteralPath $productionServer -Destination $rollbackRoot -Recurse -Force
Copy-Item -LiteralPath $productionPackage -Destination (Join-Path $rollbackRoot 'package.json') -Force
Copy-Item -LiteralPath $productionLock -Destination (Join-Path $rollbackRoot 'package-lock.json') -Force

$dependenciesChanged = (Get-FileHash -LiteralPath $sourceLock -Algorithm SHA256).Hash -ne
  (Get-FileHash -LiteralPath $productionLock -Algorithm SHA256).Hash
$deploymentStarted = $false

try {
  Write-Step 'Stopping Property Suite Application'
  Stop-Service -Name $serviceName -Force
  Wait-ServiceState -Name $serviceName -State 'Stopped'
  $deploymentStarted = $true

  Write-Step 'Copying compiled application files'
  Copy-Item -Path (Join-Path $sourceServer '*') -Destination $productionServer -Recurse -Force
  Copy-Item -Path (Join-Path $sourceDist 'assets\*') -Destination (Join-Path $productionDist 'assets') -Recurse -Force
  Copy-Item -LiteralPath $sourcePackage -Destination $productionPackage -Force
  Copy-Item -LiteralPath $sourceLock -Destination $productionLock -Force
  # Replace index.html last so browsers never receive an entry point before its hashed assets exist.
  Copy-Item -LiteralPath (Join-Path $sourceDist 'index.html') -Destination (Join-Path $productionDist 'index.html') -Force

  if ($dependenciesChanged) {
    Write-Step 'Installing changed production dependencies'
    Invoke-Npm -Arguments @('ci', '--omit=dev', '--no-audit', '--no-fund') -WorkingDirectory $appRoot
  }

  Write-Step 'Starting Property Suite Application'
  Start-Service -Name $serviceName
  Wait-ServiceState -Name $serviceName -State 'Running'
  Wait-ApplicationHealth -TimeoutSeconds $HealthTimeoutSeconds

  Write-Step 'Verifying migration and SQLite integrity'
  $databaseCheck = Test-ProductionDatabase -AppRoot $appRoot -DatabasePath $databasePath
  Write-Host "Migration version: $($databaseCheck.migration)" -ForegroundColor Green
  Write-Host "Database integrity: $($databaseCheck.integrity)" -ForegroundColor Green
  Write-Host "Rollback snapshot: $rollbackRoot" -ForegroundColor DarkGray
  Write-Host "`nProperty Suite deployment completed successfully." -ForegroundColor Green
} catch {
  $deploymentError = $_
  if ($deploymentStarted) {
    Write-Warning "Deployment failed. Restoring application files from $rollbackRoot"
    try {
      Stop-Service -Name $serviceName -Force -ErrorAction SilentlyContinue
      Wait-ServiceState -Name $serviceName -State 'Stopped'
      Copy-Item -Path (Join-Path $rollbackRoot 'dist-server\*') -Destination $productionServer -Recurse -Force
      Copy-Item -Path (Join-Path $rollbackRoot 'dist\assets\*') -Destination (Join-Path $productionDist 'assets') -Recurse -Force
      Copy-Item -LiteralPath (Join-Path $rollbackRoot 'dist\index.html') -Destination (Join-Path $productionDist 'index.html') -Force
      Copy-Item -LiteralPath (Join-Path $rollbackRoot 'package.json') -Destination $productionPackage -Force
      Copy-Item -LiteralPath (Join-Path $rollbackRoot 'package-lock.json') -Destination $productionLock -Force
      if ($dependenciesChanged) {
        Invoke-Npm -Arguments @('ci', '--omit=dev', '--no-audit', '--no-fund') -WorkingDirectory $appRoot
      }
      Start-Service -Name $serviceName
      Wait-ServiceState -Name $serviceName -State 'Running'
      Wait-ApplicationHealth -TimeoutSeconds $HealthTimeoutSeconds
      Write-Warning 'Application files were rolled back and the service is healthy.'
    } catch {
      Write-Error "Automatic rollback also failed: $($_.Exception.Message)"
    }
  }
  throw $deploymentError
}
