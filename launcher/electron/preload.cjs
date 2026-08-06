const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("launcherApi", {
  windowControl: (action) => ipcRenderer.invoke("window:control", action),
  setAlwaysOnTop: (enabled) => ipcRenderer.invoke("window:alwaysOnTop", enabled),
  getServices: () => ipcRenderer.invoke("launcher:getServices"),
  refreshStatuses: () => ipcRenderer.invoke("launcher:refreshStatuses"),
  startService: (name) => ipcRenderer.invoke("launcher:startService", name),
  stopService: (name) => ipcRenderer.invoke("launcher:stopService", name),
  restartService: (name) => ipcRenderer.invoke("launcher:restartService", name),
  startAll: () => ipcRenderer.invoke("launcher:startAll"),
  stopAll: () => ipcRenderer.invoke("launcher:stopAll"),
  restartAll: () => ipcRenderer.invoke("launcher:restartAll"),
  getTelemetry: () => ipcRenderer.invoke("launcher:getTelemetry"),
  clearTelemetry: () => ipcRenderer.invoke("launcher:clearTelemetry"),
  getSystemTelemetry: () => ipcRenderer.invoke("launcher:getSystemTelemetry"),
  getAllServiceMetrics: () => ipcRenderer.invoke("launcher:getAllServiceMetrics"),
  openUrl: (url) => ipcRenderer.invoke("launcher:openUrl", url),
  getServiceLogs: (name, maxLines) => ipcRenderer.invoke("launcher:getServiceLogs", name, maxLines),
  clearServiceLogs: (name) => ipcRenderer.invoke("launcher:clearServiceLogs", name),
});
