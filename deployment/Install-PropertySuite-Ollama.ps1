[CmdletBinding()]
param(
  [string]$OllamaExe = 'C:\Users\Server\AppData\Local\Programs\Ollama\ollama.exe',
  [string]$ModelPath = 'C:\Users\Server\.ollama\models'
)

$ErrorActionPreference = 'Stop'
$serviceName = 'PropertySuiteOllama'
$displayName = 'Property Suite Ollama'

$principal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
  $arguments = @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', $PSCommandPath, '-OllamaExe', $OllamaExe, '-ModelPath', $ModelPath)
  $elevated = Start-Process -FilePath 'powershell.exe' -Verb RunAs -ArgumentList $arguments -Wait -PassThru
  if ($elevated.ExitCode -ne 0) { throw "Elevated Ollama service setup failed with exit code $($elevated.ExitCode)." }
  exit 0
}

if (-not (Test-Path -LiteralPath $OllamaExe)) { throw "Ollama executable not found: $OllamaExe" }
if (-not (Test-Path -LiteralPath $ModelPath)) { New-Item -ItemType Directory -Path $ModelPath -Force | Out-Null }
[Environment]::SetEnvironmentVariable('OLLAMA_MODELS', $ModelPath, 'Machine')

$query = sc.exe query $serviceName 2>&1
if ($LASTEXITCODE -ne 0) {
  sc.exe create $serviceName binPath= ('"' + $OllamaExe + '" serve') start= auto DisplayName= $displayName | Out-Host
  if ($LASTEXITCODE -ne 0) { throw "Could not create $serviceName." }
}
sc.exe description $serviceName 'Local Ollama model service for the Property Suite assistant.' | Out-Host
sc.exe failure $serviceName reset= 86400 actions= restart/5000/restart/15000/restart/60000 | Out-Host
$status = sc.exe query $serviceName
if ($status -notmatch 'RUNNING') {
  sc.exe start $serviceName | Out-Host
}

$deadline = (Get-Date).AddSeconds(30)
do {
  Start-Sleep -Milliseconds 500
  $status = sc.exe query $serviceName
  if ($status -match 'RUNNING') { break }
} while ((Get-Date) -lt $deadline)
if ($status -notmatch 'RUNNING') { throw "$serviceName did not reach RUNNING state." }
Write-Host "$displayName is installed and running." -ForegroundColor Green
