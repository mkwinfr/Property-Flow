#Requires -RunAsAdministrator

$ErrorActionPreference = 'Stop'
$installRoot = 'C:\PropertySuite'
$appService = 'PropertySuite'
$tunnelService = 'PropertySuiteTunnel'

function Wait-ServiceState {
  param(
    [Parameter(Mandatory)] [string] $Name,
    [Parameter(Mandatory)] [string] $State,
    [int] $TimeoutSeconds = 30
  )

  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
  do {
    $service = Get-Service -Name $Name -ErrorAction SilentlyContinue
    if ($service -and $service.Status.ToString() -eq $State) { return }
    Start-Sleep -Milliseconds 500
  } while ((Get-Date) -lt $deadline)

  throw "Service $Name did not reach state $State within $TimeoutSeconds seconds."
}

if (-not (Test-Path -LiteralPath "$installRoot\app\dist-server\server\index.js")) {
  throw 'The prepared Property Suite application was not found. Run the preparation step first.'
}

if (-not (Test-Path -LiteralPath "$installRoot\runtime\cloudflared.exe")) {
  throw 'cloudflared.exe is missing from the prepared runtime.'
}

foreach ($serviceName in @($tunnelService, $appService)) {
  $existing = Get-Service -Name $serviceName -ErrorAction SilentlyContinue
  if ($existing -and $existing.Status -ne 'Stopped') {
    Stop-Service -Name $serviceName -Force
    Wait-ServiceState -Name $serviceName -State 'Stopped'
  }
}

# Stop only the unmanaged processes that would conflict with the permanent services.
$portOwner = Get-NetTCPConnection -LocalPort 4100 -State Listen -ErrorAction SilentlyContinue |
  Select-Object -First 1 -ExpandProperty OwningProcess
if ($portOwner) {
  $process = Get-CimInstance Win32_Process -Filter "ProcessId=$portOwner" -ErrorAction SilentlyContinue
  if ($process -and $process.Name -eq 'node.exe') {
    Stop-Process -Id $portOwner -Force
  }
}

Get-CimInstance Win32_Process -Filter "Name='cloudflared.exe'" -ErrorAction SilentlyContinue |
  Where-Object { $_.CommandLine -match 'property-suite-desktop|8b00c20f-378d-4315-bd89-cf747dd97eb0' } |
  ForEach-Object { Stop-Process -Id $_.ProcessId -Force }

foreach ($serviceName in @($appService, $tunnelService)) {
  $wrapper = "$installRoot\services\$serviceName.exe"
  if (-not (Get-Service -Name $serviceName -ErrorAction SilentlyContinue)) {
    & $wrapper install
    if ($LASTEXITCODE -ne 0) { throw "Failed to install $serviceName." }
  }
}

# The tunnel credential should only be readable by SYSTEM and administrators.
& icacls.exe "$installRoot\config\cloudflared" /inheritance:r /grant:r '*S-1-5-18:(OI)(CI)F' '*S-1-5-32-544:(OI)(CI)F' | Out-Null

Start-Service -Name $appService
Wait-ServiceState -Name $appService -State 'Running'

$healthy = $false
for ($attempt = 0; $attempt -lt 20; $attempt += 1) {
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
if (-not $healthy) { throw 'Property Suite started but failed its local health check.' }

Start-Service -Name $tunnelService
Wait-ServiceState -Name $tunnelService -State 'Running'

$shell = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut([Environment]::GetFolderPath('Desktop') + '\Property Suite Service Control.lnk')
$shortcut.TargetPath = 'powershell.exe'
$shortcut.Arguments = '-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File "C:\PropertySuite\Start-PropertySuite-Launcher.ps1"'
$shortcut.WorkingDirectory = 'C:\PropertySuite\launcher'
$shortcut.Description = 'Monitor and control Property Suite services'
$shortcut.Save()

Write-Host ''
Write-Host 'Property Suite services are installed and running.' -ForegroundColor Green
Get-CimInstance Win32_Service | Where-Object { $_.Name -in @($appService, $tunnelService) } |
  Select-Object Name, State, StartMode, ProcessId | Format-Table -AutoSize
Write-Host 'Local health: http://127.0.0.1:4100/api/health'
Write-Host 'Public app:  https://app.propertysuite.net'
