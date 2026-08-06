# Property Suite service operations

Property Suite runs from `C:\PropertySuite` as two automatic Windows services:

- `PropertySuite` — the production Node application, API, SQLite database access, and static frontend on port 4100.
- `PropertySuiteTunnel` — the Cloudflare Tunnel connector for `app.propertysuite.net`.

The desktop shortcut **Property Suite Service Control** opens the visual launcher. The launcher requests administrator permission because Windows protects service start, stop, and restart operations.

## Normal operation

Both services start automatically with Windows and restart after a process failure. The launcher does not have to remain open.

Logs are stored in:

- `C:\PropertySuite\logs\application`
- `C:\PropertySuite\logs\tunnel`

Persistent application data is stored in:

- `C:\PropertySuite\data\property-suite.db`
- `C:\PropertySuite\data\attachments`

The source project and `npm run dev` remain development-only. Port 5173 is Vite's development frontend; the permanent service uses the compiled production application on port 4100.

## Manual checks

```powershell
Get-Service PropertySuite, PropertySuiteTunnel
curl.exe http://127.0.0.1:4100/api/health
curl.exe -I https://app.propertysuite.net
```

The public `curl -I` request should normally return a Cloudflare Access redirect unless the client already has a valid Access session.

## Automated deployment

### Unattended deployment (recommended)

Install the pre-authorized scheduled task once. This is the only step that requests UAC:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\deployment\Install-PropertySuite-DeploymentTask.ps1
```

After installation, deploy without UAC from the source workspace:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\deployment\Invoke-PropertySuiteDeployment.ps1
```

The trigger waits for completion and reports success or failure. The fixed task runs as Windows `SYSTEM`, ignores duplicate task starts, and the deployment engine also uses a machine-wide lock to prevent overlapping direct or scheduled deployments. Current status is written to `C:\PropertySuite\logs\deployment\status.json`; detailed transcripts are stored alongside it.

Re-run the installer if the unattended deployment scripts themselves are changed. Normal application deployments do not require reinstalling the task.

### Interactive deployment

Run the deployment tool from the source workspace:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\deployment\Deploy-PropertySuite.ps1
```

The tool runs tests and the production build, requests administrator permission, creates a verified backup, snapshots the current application files for rollback, deploys the compiled client and server, restarts only `PropertySuite`, and verifies health, migration state, and SQLite integrity. The Cloudflare Tunnel is not restarted.

To test the pre-deployment path without changing production or requesting administrator permission:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\deployment\Deploy-PropertySuite.ps1 -ValidateOnly
```
