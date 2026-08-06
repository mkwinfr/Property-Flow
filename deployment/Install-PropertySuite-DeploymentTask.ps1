param(
  [string] $WorkspaceRoot = (Split-Path -Parent $PSScriptRoot),
  [string] $InstallRoot = 'C:\PropertySuite',
  [string] $TriggerUserSid
)

$ErrorActionPreference = 'Stop'
$taskName = 'PropertySuite Unattended Deployment'
$expectedInstallRoot = 'C:\PropertySuite'
$workspaceRootPath = [System.IO.Path]::GetFullPath($WorkspaceRoot).TrimEnd('\')
$installRootPath = [System.IO.Path]::GetFullPath($InstallRoot).TrimEnd('\')
if ($installRootPath -ne $expectedInstallRoot) {
  throw "Refusing to configure an unexpected installation root: $installRootPath"
}

$isAdministrator = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole(
  [Security.Principal.WindowsBuiltInRole]::Administrator
)
if (-not $isAdministrator) {
  if (-not $TriggerUserSid) {
    $TriggerUserSid = [Security.Principal.WindowsIdentity]::GetCurrent().User.Value
  }
  $arguments = "-NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`" -WorkspaceRoot `"$workspaceRootPath`" -InstallRoot `"$installRootPath`" -TriggerUserSid `"$TriggerUserSid`""
  $elevated = Start-Process -FilePath 'powershell.exe' -Verb RunAs -ArgumentList $arguments -Wait -PassThru
  exit $elevated.ExitCode
}

if (-not $TriggerUserSid) {
  $TriggerUserSid = [Security.Principal.WindowsIdentity]::GetCurrent().User.Value
}

$sourceDeploymentScript = Join-Path $PSScriptRoot 'Deploy-PropertySuite.ps1'
$sourceRunnerScript = Join-Path $PSScriptRoot 'Run-PropertySuite-DeploymentTask.ps1'
$scriptsRoot = Join-Path $installRootPath 'scripts'
$logRoot = Join-Path $installRootPath 'logs\deployment'
$installedDeploymentScript = Join-Path $scriptsRoot 'Deploy-PropertySuite-Unattended.ps1'
$installedRunnerScript = Join-Path $scriptsRoot 'Run-PropertySuite-DeploymentTask.ps1'

foreach ($path in @($sourceDeploymentScript, $sourceRunnerScript, (Join-Path $workspaceRootPath 'package.json'))) {
  if (-not (Test-Path -LiteralPath $path -PathType Leaf)) { throw "Required file not found: $path" }
}
New-Item -ItemType Directory -Path $scriptsRoot, $logRoot -Force | Out-Null
Copy-Item -LiteralPath $sourceDeploymentScript -Destination $installedDeploymentScript -Force
Copy-Item -LiteralPath $sourceRunnerScript -Destination $installedRunnerScript -Force

$powerShellPath = 'C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe'
$actionArguments = "-NoProfile -NonInteractive -ExecutionPolicy Bypass -File `"$installedRunnerScript`" -WorkspaceRoot `"$workspaceRootPath`" -InstallRoot `"$installRootPath`""
$action = New-ScheduledTaskAction -Execute $powerShellPath -Argument $actionArguments -WorkingDirectory $workspaceRootPath
$principal = New-ScheduledTaskPrincipal -UserId 'SYSTEM' -LogonType ServiceAccount -RunLevel Highest
$settings = New-ScheduledTaskSettingsSet -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Minutes 30) -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
Register-ScheduledTask -TaskName $taskName -Action $action -Principal $principal -Settings $settings -Description 'Deploys the staged Property Suite workspace with backup, rollback, restart, and health verification.' -Force | Out-Null

# Allow only SYSTEM, local administrators, and the installing user to inspect and run the fixed task.
$taskService = New-Object -ComObject 'Schedule.Service'
$taskService.Connect()
$registeredTask = $taskService.GetFolder('\').GetTask("\$taskName")
$taskSddl = "D:P(A;;GA;;;SY)(A;;GA;;;BA)(A;;GRGX;;;$TriggerUserSid)"
$registeredTask.SetSecurityDescriptor($taskSddl, 0)

Write-Host "Installed scheduled task: $taskName" -ForegroundColor Green
Write-Host "Authorized trigger SID: $TriggerUserSid"
Write-Host "Workspace: $workspaceRootPath"
Write-Host "Deployment logs: $logRoot"
