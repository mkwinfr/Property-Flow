param(
  [ValidateRange(1, 60)] [int] $TimeoutMinutes = 20,
  [switch] $NoWait
)

$ErrorActionPreference = 'Stop'
$taskName = 'PropertySuite Unattended Deployment'
$statusPath = 'C:\PropertySuite\logs\deployment\status.json'
$task = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
if (-not $task) {
  throw "Scheduled task '$taskName' is not installed. Run deployment\Install-PropertySuite-DeploymentTask.ps1 once as administrator."
}
if ($task.State -eq 'Running') {
  throw 'A Property Suite deployment is already running.'
}

$previousRunTime = (Get-ScheduledTaskInfo -TaskName $taskName).LastRunTime
Start-ScheduledTask -TaskName $taskName
Write-Host 'Property Suite deployment was queued.' -ForegroundColor Cyan
if ($NoWait) { exit 0 }

$deadline = (Get-Date).AddMinutes($TimeoutMinutes)
$runObserved = $false
do {
  Start-Sleep -Seconds 2
  $task = Get-ScheduledTask -TaskName $taskName
  $taskInfo = Get-ScheduledTaskInfo -TaskName $taskName
  if ($task.State -eq 'Running' -or $taskInfo.LastRunTime -gt $previousRunTime) { $runObserved = $true }
  if ($runObserved -and $task.State -ne 'Running') { break }
} while ((Get-Date) -lt $deadline)

if (-not $runObserved -or $task.State -eq 'Running') {
  throw "Deployment did not finish within $TimeoutMinutes minutes. Check $statusPath and the deployment log."
}
if (-not (Test-Path -LiteralPath $statusPath -PathType Leaf)) {
  throw "Deployment task finished without writing status: $statusPath"
}

$status = Get-Content -Raw -LiteralPath $statusPath | ConvertFrom-Json
Write-Host "Status: $($status.state)"
Write-Host "Message: $($status.message)"
Write-Host "Log: $($status.logPath)"
if ($status.state -ne 'succeeded' -or [int]$taskInfo.LastTaskResult -ne 0) {
  throw "Property Suite deployment failed. Task result: $($taskInfo.LastTaskResult)."
}
