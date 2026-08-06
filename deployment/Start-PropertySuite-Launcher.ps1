$ErrorActionPreference = 'Stop'

$isAdministrator = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole(
  [Security.Principal.WindowsBuiltInRole]::Administrator
)

if (-not $isAdministrator) {
  Start-Process -FilePath 'powershell.exe' -Verb RunAs -ArgumentList @(
    '-NoProfile',
    '-ExecutionPolicy', 'Bypass',
    '-File', ('"{0}"' -f $PSCommandPath)
  )
  exit
}

Set-Location -LiteralPath 'C:\PropertySuite\launcher'
$electronPath = 'C:\PropertySuite\launcher\node_modules\electron\dist\electron.exe'
Start-Process -FilePath $electronPath -ArgumentList 'electron\main.cjs' -WorkingDirectory 'C:\PropertySuite\launcher'
