# Webhook Auto-Pull Setup Guide

## Overview

This system automatically pulls changes from your desktop to your laptop whenever you push code. It uses a local network webhook to trigger automatic git pulls on your host machine.

## Architecture

```
Desktop (git push) → Webhook request → Laptop (webhook receiver) → git pull
```

## Files Involved

### On Desktop (c:\Users\mkwin\Desktop\Property Flow\)
- `.git/hooks/post-push.bat` - Triggers after git push
- `push-with-webhook.ps1` - PowerShell script that handles push + webhook
- `.vscode/tasks.json` - VS Code task definition
- `.vscode/keybindings.json` - Keyboard shortcut (End key)

### On Laptop
- `webhook-receiver.js` - Node.js server listening for webhook requests
- Runs on port 3456 at `192.168.1.245`

## How It Works

### Step 1: Desktop Push
When you press `End` key (or run the push task):
1. Executes `push-with-webhook.ps1`
2. Runs `git push` to upload your changes
3. If push succeeds, sends HTTP POST to webhook receiver

### Step 2: Webhook Trigger
```
POST http://192.168.1.245:3456/webhook/pull
Content-Type: application/json
```

### Step 3: Laptop Receives Webhook
The Node.js receiver:
1. Receives the POST request
2. Executes `git pull` in the repository
3. Logs the pull with timestamp
4. Sends success/error response back to desktop

## Setup Instructions

### Prerequisites
- Both devices on same network (192.168.x.x)
- Node.js installed on laptop
- Git installed on both machines
- Same repository location: `C:\Users\mkwin\Desktop\Property Flow`

### Desktop Setup

#### 1. Configure Git Hooks Path
```powershell
cd "C:\Users\mkwin\Desktop\Property Flow"
git config core.hooksPath .git/hooks
```

#### 2. Verify Hook Files Exist
```powershell
ls .git\hooks\post-push*
```

Only `post-push.bat` should exist (bash/ps1 versions removed)

#### 3. Test Keyboard Shortcut
In VS Code, press `End` key - should trigger "Git Push (with webhook)" task

### Laptop Setup

#### 1. Start Webhook Receiver
```powershell
cd "C:\Users\mkwin\Desktop\Property Flow"
node webhook-receiver.js
```

You should see:
```
🚀 Webhook receiver listening on http://192.168.1.245:3456
Repository path: C:\Users\mkwin\Desktop\Property Flow
```

#### 2. Keep Running
The webhook receiver must stay running for auto-pull to work. Options:
- Keep terminal window open
- Set up as Windows service (advanced)
- Create batch file to restart on reboot

### Testing

#### Manual Test (Desktop)
```powershell
cd "C:\Users\mkwin\Desktop\Property Flow"
.\push-with-webhook.ps1
```

#### Expected Output (Desktop)
```
Pushing to git repository...
Push successful! Triggering webhook on laptop...
✓ Webhook triggered successfully (HTTP 200)
```

#### Expected Output (Laptop)
```
[2025-12-26T...] Webhook received, pulling latest changes...
[2025-12-26T...] Pull successful
Already up to date.
```

## Usage

### Option 1: Keyboard Shortcut (Recommended)
1. Make changes and commit
2. Press `End` key in VS Code
3. Changes push and laptop auto-pulls

### Option 2: VS Code Task
1. Press `Ctrl+Shift+B`
2. Select "Git Push (with webhook)"
3. Changes push and laptop auto-pulls

### Option 3: PowerShell Script
```powershell
cd "C:\Users\mkwin\Desktop\Property Flow"
.\push-with-webhook.ps1
```

### Option 4: Batch File
Double-click `resources/hooks/push-webhook.vbs` for silent execution

## Troubleshooting

### Webhook Receiver Won't Start
**Error:** `Cannot find module 'http'`
- Node.js not installed correctly
- Solution: Reinstall Node.js

**Error:** `EADDRINUSE: address already in use :::3456`
- Another process using port 3456
- Solution: Change PORT in `webhook-receiver.js` or kill process using port 3456

### Push Succeeds But No Pull on Laptop
**Check 1:** Webhook receiver running?
- Look for terminal window with "listening on" message
- If not running, start it

**Check 2:** Laptop IP address changed?
- Verify laptop IP still `192.168.1.245`
- Run `ipconfig` on laptop
- If changed, update in:
  - `push-with-webhook.ps1` (line with `$LAPTOP_IP`)
  - `.vscode/tasks.json` (URL)
  - `.vscode/keybindings.json` (if using task)

**Check 3:** Network connectivity
- From desktop, ping laptop:
  ```powershell
  Test-NetConnection 192.168.1.245 -Port 3456
  ```
- Should see "TcpTestSucceeded: True"

**Check 4:** Git credentials
- Laptop may not have git credentials configured
- Run from laptop terminal:
  ```powershell
  git config user.name "Your Name"
  git config user.email "your.email@example.com"
  ```

### Manual Pull Works But Auto-Pull Doesn't
**Issue:** Webhook receiver running but no pull happens
- Check if post-push.bat file was deleted
- Verify `.git/hooks/post-push.bat` exists
- Verify `core.hooksPath` is set: `git config core.hooksPath`

### Permission Denied Errors
**On Laptop:**
- Git pull requires repository write access
- Ensure repository is not read-only
- Check file permissions on repository folder

**On Desktop:**
- PowerShell script execution policy
- Run: `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser`

## Configuration

### Change Laptop IP Address
If laptop IP changes:

1. **Update Desktop Files:**
   - `push-with-webhook.ps1` - line 5 `$LAPTOP_IP`
   - `.vscode/tasks.json` - update URI in command

2. **Update Laptop Files:**
   - `webhook-receiver.js` - line 33 in listening message (optional, just for display)

3. **Verify:**
   ```powershell
   Test-NetConnection <NEW_IP> -Port 3456
   ```

### Change Webhook Port
If port 3456 conflicts with another app:

1. **Update Desktop:** `push-with-webhook.ps1` - line 6 `$WEBHOOK_PORT`
2. **Update Laptop:** `webhook-receiver.js` - line 5 `const PORT`
3. Restart webhook receiver

### Change Repository Path
If repository location changes:

1. **Update Desktop:** Environment automatically uses working directory
2. **Update Laptop:** `webhook-receiver.js` - line 6 `REPO_PATH`
3. Restart webhook receiver

## Logs and Debugging

### Desktop Push Log
Check VS Code terminal output - shows push status and webhook response

### Laptop Pull Log
Terminal where `webhook-receiver.js` is running shows:
```
[ISO_TIMESTAMP] Webhook received, pulling latest changes...
[ISO_TIMESTAMP] Pull successful
<git pull output>
```

### Advanced Debugging

**On Desktop - Test Network:**
```powershell
# Test connectivity
Test-NetConnection 192.168.1.245 -Port 3456

# Test webhook manually
$uri = "http://192.168.1.245:3456/webhook/pull"
$response = Invoke-WebRequest -Uri $uri -Method POST -Headers @{"Content-Type"="application/json"}
$response.StatusCode  # Should print 200
```

**On Laptop - Check Git:**
```powershell
cd "C:\Users\mkwin\Desktop\Property Flow"
git status           # Should show clean or changes
git pull             # Manual test pull
git config --list   # Check configuration
```

## Security Notes

- Webhook runs on local network only (192.168.x.x)
- No authentication required (assumes trusted network)
- If opening to internet, add token authentication
- Webhook receiver runs as current user - ensure adequate permissions

## Maintenance

### Daily
- Keep webhook receiver running on laptop
- Monitor terminal for errors

### Weekly
- Verify both machines still on same network
- Check that pulls are working correctly

### Monthly
- Review logs for failed pulls
- Test manual push/pull to ensure still working

## Support

For issues:
1. Check troubleshooting section above
2. Verify network connectivity between devices
3. Check that webhook receiver is running
4. Review terminal output for error messages
5. Verify git config on both machines
