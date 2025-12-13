# Property Suite - Multi-Server Launcher

This directory contains scripts to launch all three development servers simultaneously in Windows Terminal with horizontal split panes.

## Quick Start

### Option 1: Batch File (Easiest)
Double-click or run:
```
Start.bat
```

### Option 2: PowerShell Script
```powershell
.\Start-Servers.ps1
```

## What Gets Launched

The scripts will open Windows Terminal with three vertical split panes (stacked top-to-bottom):

1. **Backend Server** (Top) - Port 4000
   - REST API server
   - URL: http://localhost:4000
   - Includes: Admin routes, user management, roles/permissions API

2. **Desktop App** (Middle) - Development server
   - Property Flow Desktop application
   - React/TypeScript frontend for admin panel
   - Includes: Users, roles, permissions management UI

3. **Tech App** (Bottom) - Development server
   - Property Flow Tech application
   - Main public-facing application
   - Hosted with `--host` flag for network access

## Requirements

- **Node.js** and npm installed
- **Windows Terminal** installed (Microsoft Store)
- All dependencies installed (run `npm install` in each directory)

## Default Ports

- Backend: http://localhost:4000
- Desktop: http://localhost:5173
- Tech: http://localhost:5174 (or next available)

## Stopping Servers

Close the Windows Terminal window, or use Ctrl+C in each pane.

## Troubleshooting

### "Windows Terminal not found"
Install Windows Terminal from Microsoft Store:
https://www.microsoft.com/en-us/p/windows-terminal/

### Terminal doesn't split properly
Ensure you're using a recent version of Windows Terminal. Update from Microsoft Store.

### Ports already in use
If ports are in use, edit the scripts or manually navigate to each directory and run:
```
npm run dev
```

## Manual Start

If the scripts don't work, you can start each server manually:

**Backend:**
```
cd "Property Flow Backend"
npm run dev
```

**Desktop:**
```
cd "Property Flow Desktop"
npm run dev
```

**Tech:**
```
cd "Property Flow Tech"
npm run dev -- --host
```

## Architecture

```
Windows Terminal Window
├─ Pane 1 (Top):    Backend   : npm run dev (Port 4000)
├─ Pane 2 (Middle): Desktop   : npm run dev (Port 5173)
└─ Pane 3 (Bottom): Tech      : npm run dev --host (Port 5174+)
```

## Development Workflow

1. Run `Start.bat` or `Start-Servers.ps1`
2. Wait for all servers to start (watch for "Server running on..." messages)
3. Open applications:
   - Backend API: http://localhost:4000/api/admin/users
   - Admin Panel: http://localhost:5173
   - Main App: http://localhost:5174

4. Make code changes - servers automatically reload
5. Check individual panes for errors and logs
