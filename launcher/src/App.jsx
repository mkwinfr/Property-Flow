import { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  Bot,
  Cloud,
  ExternalLink,
  HardDrive,
  MemoryStick,
  Minus,
  Pin,
  PinOff,
  Play,
  RefreshCw,
  RotateCcw,
  Server,
  Square,
  Terminal,
  X,
} from "lucide-react";

const ICONS = { application: Server, cloudflare: Cloud, ollama: Bot };

function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes < 0) return "n/a";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(value >= 100 || unit === 0 ? 0 : 1)} ${units[unit]}`;
}

function formatPercent(value) {
  return Number.isFinite(value) ? `${value.toFixed(1)}%` : "n/a";
}

function formatUptime(startMs) {
  if (!startMs) return "";
  const seconds = Math.max(0, Math.floor((Date.now() - startMs) / 1000));
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
}

function Metric({ icon: Icon, label, value, detail }) {
  return (
    <div className="metric-card">
      <div className="metric-label"><Icon size={14} /> {label}</div>
      <strong>{value}</strong>
      <span>{detail}</span>
    </div>
  );
}

export default function App() {
  const [services, setServices] = useState([]);
  const [telemetry, setTelemetry] = useState([]);
  const [system, setSystem] = useState(null);
  const [details, setDetails] = useState({ metrics: {}, uptimes: {} });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [alwaysOnTop, setAlwaysOnTop] = useState(false);
  const [activeLog, setActiveLog] = useState("");
  const [logs, setLogs] = useState(null);
  const [filter, setFilter] = useState("");
  const logRef = useRef(null);

  async function refresh() {
    const [nextServices, nextTelemetry, nextSystem, nextDetails] = await Promise.all([
      window.launcherApi.refreshStatuses(),
      window.launcherApi.getTelemetry(),
      window.launcherApi.getSystemTelemetry(),
      window.launcherApi.getAllServiceMetrics(),
    ]);
    setServices(nextServices);
    setTelemetry(nextTelemetry);
    setSystem(nextSystem);
    setDetails(nextDetails);
  }

  async function refreshLogs(name = activeLog) {
    if (!name) return;
    setLogs(await window.launcherApi.getServiceLogs(name, 180));
  }

  async function run(action) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await action();
      await refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    let mounted = true;
    Promise.all([
      window.launcherApi.getServices(),
      window.launcherApi.getTelemetry(),
      window.launcherApi.getSystemTelemetry(),
      window.launcherApi.getAllServiceMetrics(),
    ]).then(([nextServices, nextTelemetry, nextSystem, nextDetails]) => {
      if (!mounted) return;
      setServices(nextServices);
      setTelemetry(nextTelemetry);
      setSystem(nextSystem);
      setDetails(nextDetails);
    }).catch((caught) => mounted && setError(String(caught)));
    const timer = setInterval(() => refresh().catch(() => {}), 3000);
    return () => { mounted = false; clearInterval(timer); };
  }, []);

  useEffect(() => {
    if (!activeLog) return undefined;
    refreshLogs(activeLog).catch(() => {});
    const timer = setInterval(() => refreshLogs(activeLog).catch(() => {}), 1500);
    return () => clearInterval(timer);
  }, [activeLog]);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [logs?.lines?.length]);

  const filteredLogs = useMemo(() => {
    const lines = logs?.lines || [];
    const search = filter.trim().toLowerCase();
    return search ? lines.filter((line) => line.toLowerCase().includes(search)) : lines;
  }, [logs, filter]);

  const activeService = services.find((service) => service.name === activeLog);
  const disk = system?.storage?.find((entry) => entry.drive === "C:") || system?.storage?.[0];

  return (
    <div className="app-shell">
      <aside className="brand-rail">
        <div className="brand-mark">PS</div>
        <div className="rail-line" />
      </aside>

      <section className="workspace">
        <header className="titlebar">
          <div>
            <p className="eyebrow">PROPERTY SUITE</p>
            <h1>Service Control</h1>
            <p className="subtitle">Production monitoring, recovery, and live logs.</p>
          </div>
          <div className="window-actions">
            <button title="Start all" disabled={busy} onClick={() => run(window.launcherApi.startAll)}><Play size={14} /></button>
            <button title="Restart all" disabled={busy} onClick={() => run(window.launcherApi.restartAll)}><RotateCcw size={14} /></button>
            <button title="Stop all" disabled={busy} onClick={() => run(window.launcherApi.stopAll)}><Square size={14} /></button>
            <span />
            <button title="Refresh" disabled={busy} onClick={() => run(refresh)}><RefreshCw size={14} /></button>
            <button
              title={alwaysOnTop ? "Unpin" : "Always on top"}
              className={alwaysOnTop ? "active" : ""}
              onClick={async () => {
                const next = !alwaysOnTop;
                setAlwaysOnTop(next);
                await window.launcherApi.setAlwaysOnTop(next);
              }}
            >{alwaysOnTop ? <PinOff size={14} /> : <Pin size={14} />}</button>
            <button onClick={() => window.launcherApi.windowControl("minimize")}><Minus size={14} /></button>
            <button className="close" onClick={() => window.launcherApi.windowControl("close")}><X size={14} /></button>
          </div>
        </header>

        <main>
          {error && <div className="error-banner"><span>{error}</span><button onClick={() => setError("")}><X size={14} /></button></div>}

          <div className="service-grid">
            {services.map((service) => {
              const Icon = ICONS[service.name] || Server;
              const metrics = details.metrics?.[service.name];
              const uptime = details.uptimes?.[service.name];
              const good = service.isRunning && service.health !== "unhealthy";
              return (
                <article className="service-card" key={service.name}>
                  <div className="service-heading">
                    <div className="service-icon"><Icon size={21} /></div>
                    <div>
                      <h2>{service.label}</h2>
                      <p>Windows service · {service.serviceName}</p>
                    </div>
                    <span className={`status ${good ? "running" : "stopped"}`}>
                      {service.installed ? (service.isRunning ? (service.health === "unhealthy" ? "Degraded" : "Running") : service.state) : "Not installed"}
                    </span>
                  </div>

                  <dl className="service-facts">
                    <div><dt>PID</dt><dd>{service.pid || "—"}</dd></div>
                    <div><dt>Startup</dt><dd>{service.startMode || "—"}</dd></div>
                    <div><dt>Uptime</dt><dd>{service.isRunning ? formatUptime(uptime) || "Starting" : "—"}</dd></div>
                    <div><dt>Memory</dt><dd>{metrics?.ramBytes ? formatBytes(metrics.ramBytes) : "—"}</dd></div>
                  </dl>

                  <div className="service-buttons">
                    <button className="primary" disabled={busy || service.isRunning} onClick={() => run(() => window.launcherApi.startService(service.name))}><Play size={13} /> Start</button>
                    <button disabled={busy || !service.isRunning} onClick={() => run(() => window.launcherApi.restartService(service.name))}><RotateCcw size={13} /> Restart</button>
                    <button className="danger" disabled={busy || !service.isRunning} onClick={() => run(() => window.launcherApi.stopService(service.name))}><Square size={13} /> Stop</button>
                    <button onClick={() => { setActiveLog(service.name); setFilter(""); }}><Terminal size={13} /> Logs</button>
                    {service.openUrl && <button onClick={() => window.launcherApi.openUrl(service.openUrl)}><ExternalLink size={13} /> Open</button>}
                  </div>
                </article>
              );
            })}
          </div>

          <section className="metrics-section">
            <div className="section-heading"><h3>Server telemetry</h3><span>Updates every 3 seconds</span></div>
            <div className="metrics-grid">
              <Metric icon={Activity} label="CPU" value={formatPercent(system?.cpu?.usagePercent)} detail={`${system?.cpu?.cores || "—"} logical cores`} />
              <Metric icon={MemoryStick} label="Memory" value={formatPercent(system?.memory?.usagePercent)} detail={`${formatBytes(system?.memory?.usedBytes)} / ${formatBytes(system?.memory?.totalBytes)}`} />
              <Metric icon={HardDrive} label="Storage" value={formatPercent(disk?.usagePercent)} detail={disk ? `${disk.drive} · ${formatBytes(disk.freeBytes)} free` : "Unavailable"} />
              <Metric icon={Cloud} label="Network" value={`↓ ${formatBytes(system?.network?.rxBytesPerSec)}/s`} detail={`↑ ${formatBytes(system?.network?.txBytesPerSec)}/s`} />
            </div>
          </section>

          <section className="events-section">
            <div className="section-heading">
              <h3>Recent activity</h3>
              <button onClick={() => run(window.launcherApi.clearTelemetry)}>Clear</button>
            </div>
            <div className="event-list">
              {telemetry.length ? telemetry.slice(0, 30).map((event) => (
                <div className={`event ${event.level}`} key={event.id}>
                  <time>{new Date(event.ts).toLocaleTimeString()}</time>
                  <strong>{event.action}</strong>
                  <span>{event.message}</span>
                </div>
              )) : <p className="empty">No service actions recorded in this launcher session.</p>}
            </div>
          </section>
        </main>
      </section>

      {activeLog && (
        <div className="log-panel">
          <div className="log-header">
            <div><p className="eyebrow">LIVE OUTPUT</p><h3>{activeService?.label || activeLog}</h3></div>
            <button onClick={() => setActiveLog("")}><X size={16} /></button>
          </div>
          <input value={filter} onChange={(event) => setFilter(event.target.value)} placeholder="Filter log lines…" />
          <pre ref={logRef}>{filteredLogs.length ? filteredLogs.join("\n") : (logs?.exists ? "Waiting for output…" : "No service log exists yet.")}</pre>
          <p className="log-path">{logs?.logPath}</p>
        </div>
      )}
    </div>
  );
}
