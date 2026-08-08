# Property Suite service operations

Property Suite runs from `C:\PropertySuite` as three automatic Windows services:

- `PropertySuite` — the production Node application, API, SQLite database access, and static frontend on port 4100.
- `PropertySuiteTunnel` — the Cloudflare Tunnel connector for `app.propertysuite.net`.
- `PropertySuiteOllama` — the local Ollama model server for the read-only Property Suite assistant on port 11434.

The desktop shortcut **Property Suite Service Control** opens the visual launcher. The launcher requests administrator permission because Windows protects service start, stop, and restart operations.

## Normal operation

Both application services start automatically with Windows and restart after a process failure. The launcher does not have to remain open.

Logs are stored in:

- `C:\PropertySuite\logs\application`
- `C:\PropertySuite\logs\tunnel`
- `C:\PropertySuite\logs\ollama`

Persistent application data is stored in:

- `C:\PropertySuite\data\property-suite.db`
- `C:\PropertySuite\data\attachments`

The source project and `npm run dev` remain development-only. Port 5173 is Vite's development frontend; the permanent service uses the compiled production application on port 4100.

## Manual checks

```powershell
Get-Service PropertySuite, PropertySuiteTunnel, PropertySuiteOllama
curl.exe http://127.0.0.1:4100/api/health
curl.exe http://127.0.0.1:4100/api/assistant/health
curl.exe http://127.0.0.1:11434/api/tags
curl.exe -I https://app.propertysuite.net
```

The public `curl -I` request should normally return a Cloudflare Access redirect unless the client already has a valid Access session.

## Cloudflare Access (email login codes)

Public traffic to `https://app.propertysuite.net` passes through **Cloudflare Access** before Property Suite sign-in. If users see **Send login code** and a one-time email PIN, that step is controlled in the [Cloudflare Zero Trust dashboard](https://one.dash.cloudflare.com/) — not in this application.

Property Suite still requires its own email/password (or SSO) after Access succeeds. Local development on `http://127.0.0.1:4100` skips Cloudflare entirely.

### Option A — Keep Access, stop frequent email codes (recommended)

1. Open **Zero Trust → Access controls → Applications**.
2. Select the **`app.propertysuite.net`** application.
3. Under **Settings**, set **Application session duration** to **30 days** (maximum).
4. Open **Zero Trust → Access controls → Access settings**.
5. Set **Global session duration** to **30 days**.
6. In each **Allow** policy for the app, confirm **Policy session duration** is not set to **Immediate** or a very short value.

Users should then stay signed in to Access for up to 30 days on the same browser/device. If codes are still required on every visit, check that the browser is not clearing cookies, and that email security software is not consuming OTP links before the user (allowlist `noreply@notify.cloudflare.com`).

### Option B — Replace email codes with Google or Microsoft login

1. **Zero Trust → Integrations → Identity providers** — add Google or Microsoft Entra ID.
2. **Zero Trust → Settings → Authentication → Login methods** — disable **One-time PIN** if you no longer want email codes.
3. Update the Access **Allow** policy for `app.propertysuite.net` to use the new identity provider.

Users sign in once with their Google/Microsoft account; sessions persist much better than one-time PIN.

### Option C — Remove Cloudflare Access entirely

Only do this if Property Suite authentication alone is sufficient for your security needs.

1. **Zero Trust → Access controls → Applications**.
2. Delete or disable the **`app.propertysuite.net`** Access application.

The Cloudflare Tunnel (`PropertySuiteTunnel`) continues to route traffic; users go straight to the Property Suite login page with no email code step. You lose the extra identity gate in front of the app.

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
