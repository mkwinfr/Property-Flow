param(
  [Parameter(Mandatory = $true)] [string] $WorkspaceRoot,
  [string] $InstallRoot = 'C:\PropertySuite'
)

$ErrorActionPreference = 'Stop'
$expectedInstallRoot = 'C:\PropertySuite'
$workspaceRootPath = [System.IO.Path]::GetFullPath($WorkspaceRoot).TrimEnd('\')
$installRootPath = [System.IO.Path]::GetFullPath($InstallRoot).TrimEnd('\')
if ($installRootPath -ne $expectedInstallRoot) {
  throw "Refusing to deploy to unexpected installation root: $installRootPath"
}

$deploymentScript = Join-Path $installRootPath 'scripts\Deploy-PropertySuite-Unattended.ps1'
$logRoot = Join-Path $installRootPath 'logs\deployment'
$statusPath = Join-Path $logRoot 'status.json'
$timestamp = (Get-Date).ToUniversalTime().ToString('yyyyMMdd-HHmmss')
$logPath = Join-Path $logRoot "deployment-$timestamp.log"
$startedAt = (Get-Date).ToUniversalTime().ToString('o')

New-Item -ItemType Directory -Path $logRoot -Force | Out-Null

function Write-DeploymentStatus(
  [string] $State,
  [string] $Message,
  [Nullable[int]] $ExitCode,
  [Nullable[datetime]] $FinishedAt
) {
  $status = [ordered]@{
    state = $State
    message = $Message
    startedAt = $startedAt
    finishedAt = if ($null -ne $FinishedAt) { ([datetime]$FinishedAt).ToUniversalTime().ToString('o') } else { $null }
    exitCode = $ExitCode
    workspaceRoot = $workspaceRootPath
    logPath = $logPath
  }
  $temporaryStatusPath = "$statusPath.tmp"
  $status | ConvertTo-Json | Set-Content -LiteralPath $temporaryStatusPath -Encoding UTF8
  Move-Item -LiteralPath $temporaryStatusPath -Destination $statusPath -Force
}

Write-DeploymentStatus -State 'running' -Message 'Deployment is running.' -ExitCode $null -FinishedAt $null
Start-Transcript -LiteralPath $logPath -Force | Out-Null

try {
  Write-Host "Property Suite unattended deployment started at $startedAt"
  & powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -File $deploymentScript `
    -WorkspaceRoot $workspaceRootPath -InstallRoot $installRootPath
  if ($LASTEXITCODE -ne 0) {
    throw "Deployment process exited with code $LASTEXITCODE."
  }
  Write-DeploymentStatus -State 'succeeded' -Message 'Deployment completed successfully.' -ExitCode 0 -FinishedAt (Get-Date)
  Write-Host 'Property Suite unattended deployment completed successfully.' -ForegroundColor Green
  exit 0
} catch {
  $message = $_.Exception.Message
  Write-DeploymentStatus -State 'failed' -Message $message -ExitCode 1 -FinishedAt (Get-Date)
  Write-Error $message
  exit 1
} finally {
  try { Stop-Transcript | Out-Null } catch { }
}
