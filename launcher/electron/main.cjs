const {
  app,
  BrowserWindow,
  ipcMain,
  Menu,
  Tray,
  nativeImage,
  shell,
} = require("electron");
const { execFile } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

const SERVICE_TIMEOUT_MS = 20_000;
const MAX_EVENTS = 300;
const telemetryEvents = [];
let lastCpuSnapshot = null;
let lastNetSnapshot = null;
let mainWindow = null;
let tray = null;
let serviceDefinitions = [];
const observedProcessStartTimes = new Map();

function pushTelemetry(level, action, message, details = {}) {
  telemetryEvents.unshift({
    id: `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    ts: new Date().toISOString(),
    level,
    action,
    message,
    details,
  });
  telemetryEvents.length = Math.min(telemetryEvents.length, MAX_EVENTS);
}

function execFileResult(fileName, args) {
  return new Promise((resolve) => {
    execFile(fileName, args, { windowsHide: true }, (error, stdout, stderr) => {
      resolve({
        ok: !error,
        code: error?.code ?? 0,
        stdout: String(stdout || ""),
        stderr: String(stderr || ""),
      });
    });
  });
}

function loadConfig() {
  const parsed = JSON.parse(
    fs.readFileSync(path.join(__dirname, "..", "config.json"), "utf8"),
  );
  return (parsed.services || [])
    .map((service) => ({
      name: String(service.name || ""),
      label: String(service.label || service.name || ""),
      serviceName: String(service.serviceName || ""),
      processName: String(service.processName || ""),
      port: Number(service.port || 0),
      openUrl: String(service.openUrl || ""),
      healthUrl: String(service.healthUrl || ""),
      logFiles: Array.isArray(service.logFiles)
        ? service.logFiles.map((entry) => String(entry))
        : [],
    }))
    .filter((service) => service.name && service.serviceName);
}

function psQuote(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

async function getServiceStatus(service) {
  const [query, configuration] = await Promise.all([
    execFileResult("sc.exe", ["queryex", service.serviceName]),
    execFileResult("sc.exe", ["qc", service.serviceName]),
  ]);
  const installed = query.ok && !/FAILED\s+1060/i.test(query.stdout + query.stderr);
  const stateMatch = query.stdout.match(/STATE\s*:\s*\d+\s+([A-Z_]+)/i);
  const pidMatch = query.stdout.match(/PID\s*:\s*(\d+)/i);
  const rawState = stateMatch?.[1] || "UNKNOWN";
  const isRunning = rawState === "RUNNING";
  const pid = Number(pidMatch?.[1] || 0) || null;
  const delayed = /AUTO_START\s*\(DELAYED\)/i.test(configuration.stdout);
  const automatic = /START_TYPE\s*:\s*2\s+AUTO_START/i.test(configuration.stdout);
  const startMode = automatic ? (delayed ? "Automatic (delayed)" : "Automatic") : null;

  if (isRunning && pid) {
    const observed = observedProcessStartTimes.get(service.name);
    if (!observed || observed.pid !== pid) {
      observedProcessStartTimes.set(service.name, { pid, startedAt: Date.now() });
    }
  } else {
    observedProcessStartTimes.delete(service.name);
  }
  const observed = observedProcessStartTimes.get(service.name);
  let health = null;
  if (isRunning && service.healthUrl) {
    try {
      const response = await fetch(service.healthUrl, {
        signal: AbortSignal.timeout(2500),
        cache: "no-store",
      });
      health = response.ok ? "healthy" : "unhealthy";
    } catch {
      health = "unhealthy";
    }
  }

  return {
    name: service.name,
    installed,
    isRunning,
    state: installed
      ? rawState.toLowerCase().replace(/(^|_)([a-z])/g, (_, prefix, letter) => `${prefix ? " " : ""}${letter.toUpperCase()}`)
      : "Not installed",
    startMode,
    pid,
    startedAt: observed ? new Date(observed.startedAt).toISOString() : null,
    health,
  };
}

async function waitForState(service, expectedRunning) {
  const deadline = Date.now() + SERVICE_TIMEOUT_MS;
  while (Date.now() < deadline) {
    const status = await getServiceStatus(service);
    if (status.isRunning === expectedRunning) return status;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  return getServiceStatus(service);
}

function serviceByName(name) {
  const service = serviceDefinitions.find((entry) => entry.name === name);
  if (!service) throw new Error(`Unknown service: ${name}`);
  return service;
}

function serviceControlError(service, action, result) {
  const detail = (result.stderr || result.stdout || `exit code ${result.code}`).trim();
  if (/access is denied|requires elevation|openservice failed 5/i.test(detail)) {
    return new Error(
      `${service.label} requires administrator permission. Close and reopen the Property Suite launcher as administrator.`,
    );
  }
  return new Error(`Could not ${action} ${service.label}: ${detail}`);
}

async function startService(name) {
  const service = serviceByName(name);
  const before = await getServiceStatus(service);
  if (!before.installed) throw new Error(`${service.label} has not been installed yet.`);
  if (before.isRunning) return before;

  const result = await execFileResult("sc.exe", ["start", service.serviceName]);
  if (!result.ok && !/START_PENDING|RUNNING/i.test(result.stdout)) {
    throw serviceControlError(service, "start", result);
  }
  const status = await waitForState(service, true);
  if (!status.isRunning) throw new Error(`${service.label} did not reach the running state.`);
  pushTelemetry("success", "start", `${service.label} started`, { pid: status.pid });
  return status;
}

async function stopService(name) {
  const service = serviceByName(name);
  const before = await getServiceStatus(service);
  if (!before.installed) throw new Error(`${service.label} has not been installed yet.`);
  if (!before.isRunning) return before;

  const result = await execFileResult("sc.exe", ["stop", service.serviceName]);
  if (!result.ok && !/STOP_PENDING|STOPPED/i.test(result.stdout)) {
    throw serviceControlError(service, "stop", result);
  }
  const status = await waitForState(service, false);
  if (status.isRunning) throw new Error(`${service.label} did not stop within 20 seconds.`);
  pushTelemetry("success", "stop", `${service.label} stopped`);
  return status;
}

async function restartService(name) {
  await stopService(name);
  const status = await startService(name);
  pushTelemetry("success", "restart", `${serviceByName(name).label} restarted`);
  return status;
}

async function refreshStatuses() {
  return Promise.all(serviceDefinitions.map(getServiceStatus));
}

function withStatuses(statuses) {
  const byName = new Map(statuses.map((entry) => [entry.name, entry]));
  return serviceDefinitions.map((service) => ({
    ...service,
    ...(byName.get(service.name) || {}),
  }));
}

function readTailLines(filePath, maxLines) {
  if (!fs.existsSync(filePath)) return [];
  try {
    return fs
      .readFileSync(filePath, "utf8")
      .split(/\r?\n/)
      .filter((line) => line.trim())
      .slice(-maxLines);
  } catch (error) {
    return [`Unable to read ${path.basename(filePath)}: ${error.message}`];
  }
}

function readServiceLogs(service, maxLines = 120) {
  const existing = service.logFiles.filter((filePath) => fs.existsSync(filePath));
  const perFile = Math.max(20, Math.ceil(maxLines / Math.max(existing.length, 1)));
  const lines = existing.flatMap((filePath) => {
    const fileLines = readTailLines(filePath, perFile);
    return fileLines.length
      ? [`── ${path.basename(filePath)} ──`, ...fileLines]
      : [];
  });
  return {
    service: service.name,
    logPath: service.logFiles.join("; "),
    exists: existing.length > 0,
    lines: lines.slice(-maxLines),
    updatedAt: new Date().toISOString(),
  };
}

function cpuSnapshot() {
  return os.cpus().map(({ times }) => ({
    idle: times.idle,
    total: times.user + times.nice + times.sys + times.idle + times.irq,
  }));
}

function cpuUsage() {
  const current = cpuSnapshot();
  if (!lastCpuSnapshot) {
    lastCpuSnapshot = current;
    return null;
  }
  let idle = 0;
  let total = 0;
  current.forEach((next, index) => {
    const previous = lastCpuSnapshot[index];
    if (!previous) return;
    idle += Math.max(0, next.idle - previous.idle);
    total += Math.max(0, next.total - previous.total);
  });
  lastCpuSnapshot = current;
  return total ? Math.max(0, Math.min(100, (1 - idle / total) * 100)) : null;
}

async function getSystemTelemetry() {
  const memoryTotal = os.totalmem();
  const memoryFree = os.freemem();
  const diskResult = await execFileResult("powershell.exe", [
    "-NoProfile",
    "-NonInteractive",
    "-Command",
    '$items = Get-CimInstance Win32_LogicalDisk -Filter "DriveType=3" | Select-Object DeviceID,Size,FreeSpace; $items | ConvertTo-Json -Compress',
  ]);
  let storage = [];
  try {
    const parsed = JSON.parse(diskResult.stdout || "[]");
    storage = (Array.isArray(parsed) ? parsed : [parsed]).map((drive) => {
      const totalBytes = Number(drive.Size || 0);
      const freeBytes = Number(drive.FreeSpace || 0);
      return {
        drive: drive.DeviceID,
        totalBytes,
        freeBytes,
        usedBytes: totalBytes - freeBytes,
        usagePercent: totalBytes ? ((totalBytes - freeBytes) / totalBytes) * 100 : null,
      };
    });
  } catch {
    storage = [];
  }

  const netResult = await execFileResult("netstat.exe", ["-e"]);
  const bytesLine = netResult.stdout.split(/\r?\n/).find((line) => /^\s*Bytes\s+/i.test(line));
  const values = bytesLine?.match(/\d+/g)?.map(Number) || [];
  const now = Date.now();
  let network = { rxBytesPerSec: null, txBytesPerSec: null };
  if (lastNetSnapshot && values.length >= 2) {
    const seconds = Math.max(0.001, (now - lastNetSnapshot.ts) / 1000);
    network = {
      rxBytesPerSec: Math.max(0, (values[0] - lastNetSnapshot.rx) / seconds),
      txBytesPerSec: Math.max(0, (values[1] - lastNetSnapshot.tx) / seconds),
    };
  }
  if (values.length >= 2) lastNetSnapshot = { rx: values[0], tx: values[1], ts: now };

  return {
    ts: new Date().toISOString(),
    cpu: { usagePercent: cpuUsage(), cores: os.cpus().length },
    memory: {
      totalBytes: memoryTotal,
      freeBytes: memoryFree,
      usedBytes: memoryTotal - memoryFree,
      usagePercent: ((memoryTotal - memoryFree) / memoryTotal) * 100,
    },
    storage,
    network,
  };
}

async function getAllServiceMetrics() {
  const statuses = await refreshStatuses();
  const metrics = {};
  const uptimes = {};
  await Promise.all(
    statuses.map(async (status) => {
      if (!status.pid) return;
      const result = await execFileResult("powershell.exe", [
        "-NoProfile",
        "-NonInteractive",
        "-Command",
        `try { $p=Get-Process -Id ${status.pid} -ErrorAction Stop; [pscustomobject]@{CPU=$p.CPU;RAM=$p.WorkingSet64} | ConvertTo-Json -Compress } catch { '{}' }`,
      ]);
      try {
        const parsed = JSON.parse(result.stdout || "{}");
        metrics[status.name] = {
          cpuSeconds: parsed.CPU == null ? null : Number(parsed.CPU),
          ramBytes: parsed.RAM == null ? null : Number(parsed.RAM),
        };
      } catch {
        metrics[status.name] = null;
      }
      if (status.startedAt) uptimes[status.name] = Date.parse(status.startedAt);
    }),
  );
  return { metrics, uptimes };
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 980,
    minHeight: 700,
    frame: false,
    autoHideMenuBar: true,
    backgroundColor: "#17191f",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });
  mainWindow.on("minimize", () => tray && setImmediate(() => mainWindow?.hide()));
  const devServer = process.env.VITE_DEV_SERVER_URL;
  if (devServer) mainWindow.loadURL(devServer);
  else mainWindow.loadFile(path.join(__dirname, "..", "dist", "index.html"));
}

function createTray() {
  const icon = nativeImage.createEmpty();
  tray = new Tray(icon);
  tray.setToolTip("Property Suite Service Control");
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: "Open Property Suite Control", click: () => { mainWindow?.show(); mainWindow?.focus(); } },
      { type: "separator" },
      { label: "Quit", click: () => app.quit() },
    ]),
  );
  tray.on("double-click", () => { mainWindow?.show(); mainWindow?.focus(); });
}

ipcMain.handle("window:control", (event, action) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (action === "minimize") win?.minimize();
  if (action === "close") win?.close();
});
ipcMain.handle("window:alwaysOnTop", (event, enabled) => {
  BrowserWindow.fromWebContents(event.sender)?.setAlwaysOnTop(Boolean(enabled));
  return Boolean(enabled);
});
ipcMain.handle("launcher:getServices", async () => {
  serviceDefinitions = loadConfig();
  return withStatuses(await refreshStatuses());
});
ipcMain.handle("launcher:refreshStatuses", async () => withStatuses(await refreshStatuses()));
ipcMain.handle("launcher:startService", (_, name) => startService(name));
ipcMain.handle("launcher:stopService", (_, name) => stopService(name));
ipcMain.handle("launcher:restartService", (_, name) => restartService(name));
ipcMain.handle("launcher:startAll", async () => {
  for (const service of serviceDefinitions) await startService(service.name);
});
ipcMain.handle("launcher:stopAll", async () => {
  for (const service of [...serviceDefinitions].reverse()) await stopService(service.name);
});
ipcMain.handle("launcher:restartAll", async () => {
  for (const service of [...serviceDefinitions].reverse()) await stopService(service.name);
  for (const service of serviceDefinitions) await startService(service.name);
});
ipcMain.handle("launcher:getTelemetry", () => telemetryEvents);
ipcMain.handle("launcher:clearTelemetry", () => { telemetryEvents.length = 0; });
ipcMain.handle("launcher:getSystemTelemetry", getSystemTelemetry);
ipcMain.handle("launcher:getAllServiceMetrics", getAllServiceMetrics);
ipcMain.handle("launcher:getServiceLogs", (_, name, maxLines) => readServiceLogs(serviceByName(name), Number(maxLines) || 120));
ipcMain.handle("launcher:clearServiceLogs", async (_, name) => {
  const service = serviceByName(name);
  for (const filePath of service.logFiles) {
    if (!fs.existsSync(filePath)) continue;
    try { fs.truncateSync(filePath, 0); } catch { /* active service may hold the file */ }
  }
  return readServiceLogs(service, 120);
});
ipcMain.handle("launcher:openUrl", async (_, url) => {
  const allowed = serviceDefinitions.some((service) => service.openUrl === url);
  if (!allowed) throw new Error("That URL is not configured for this launcher.");
  await shell.openExternal(url);
});

app.whenReady().then(() => {
  serviceDefinitions = loadConfig();
  createWindow();
  createTray();
  pushTelemetry("info", "launcher", "Property Suite Service Control opened");
});
app.on("window-all-closed", () => app.quit());
