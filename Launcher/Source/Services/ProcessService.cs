using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;
using System.Net.NetworkInformation;
using System.Text.RegularExpressions;

namespace PropertyFlow.Launcher.Services;

public class ProcessService
{
    private Dictionary<string, int> _trackedProcesses = new();

    public async Task<int?> LaunchServiceAsync(string command, string workingDirectory, Action<string>? log = null)
    {
        try
        {
            var psi = new ProcessStartInfo
            {
                FileName = "cmd",
                Arguments = $"/c {command}",
                WorkingDirectory = workingDirectory,
                UseShellExecute = false,
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                CreateNoWindow = true
            };

            var process = new Process { StartInfo = psi, EnableRaisingEvents = true };

            process.OutputDataReceived += (_, e) =>
            {
                if (!string.IsNullOrWhiteSpace(e.Data))
                {
                    log?.Invoke(e.Data);
                }
            };

            process.ErrorDataReceived += (_, e) =>
            {
                if (!string.IsNullOrWhiteSpace(e.Data))
                {
                    log?.Invoke($"ERR: {e.Data}");
                }
            };

            if (process.Start())
            {
                _trackedProcesses[workingDirectory] = process.Id;
                process.Exited += (_, _) =>
                {
                    _trackedProcesses.Remove(workingDirectory);
                };
                process.BeginOutputReadLine();
                process.BeginErrorReadLine();
                await Task.Delay(300);
                return process.Id;
            }
        }
        catch (Exception ex)
        {
            log?.Invoke($"Launch error: {ex.Message}");
            System.Diagnostics.Debug.WriteLine($"Launch error: {ex.Message}");
        }
        return null;
    }

    public bool TryGetTrackedProcess(string workingDirectory, out int processId)
    {
        return _trackedProcesses.TryGetValue(workingDirectory, out processId);
    }

    public void StopProcess(string workingDirectory, int? port = null, Action<string>? log = null)
    {
        var stopped = false;

        if (TryGetTrackedProcess(workingDirectory, out int pid))
        {
            stopped = KillProcessTree(pid, log, $"Stopped tracked process (PID {pid}) for {workingDirectory}");
            _trackedProcesses.Remove(workingDirectory);
        }

        if (!stopped && port.HasValue)
        {
            stopped = KillProcessesByPort(port.Value, log);
            if (stopped)
            {
                _trackedProcesses.Remove(workingDirectory);
            }
        }

        if (!stopped)
        {
            log?.Invoke($"No tracked process found to stop for {workingDirectory}");
        }
    }

    public void StopAllProcesses()
    {
        foreach (var workingDirectory in _trackedProcesses.Keys.ToList())
        {
            StopProcess(workingDirectory);
        }
    }

    public bool IsPortInUse(int port)
    {
        try
        {
            var ipProps = IPGlobalProperties.GetIPGlobalProperties();
            return ipProps.GetActiveTcpListeners().Any(ep => ep.Port == port);
        }
        catch
        {
            return false;
        }
    }

    private bool KillProcessTree(int pid, Action<string>? log = null, string? message = null)
    {
        try
        {
            var process = Process.GetProcessById(pid);
            try { process.CloseMainWindow(); } catch { }
            if (!process.WaitForExit(1000))
            {
                process.Kill(entireProcessTree: true);
            }
            process.WaitForExit(2000);
            log?.Invoke(message ?? $"Killed PID {pid}");
            return true;
        }
        catch (Exception ex)
        {
            log?.Invoke($"Failed to kill PID {pid}: {ex.Message}");
            return false;
        }
    }

    private bool KillProcessesByPort(int port, Action<string>? log = null)
    {
        var pids = FindPidsByPort(port).Distinct().ToList();
        var any = false;
        foreach (var pid in pids)
        {
            any |= KillProcessTree(pid, log, $"Killed PID {pid} on port {port}");
        }
        if (!any)
        {
            log?.Invoke($"No processes found on port {port}");
        }
        return any;
    }

    private IEnumerable<int> FindPidsByPort(int port)
    {
        var result = new List<int>();
        try
        {
            var psi = new ProcessStartInfo
            {
                FileName = "cmd",
                Arguments = "/c netstat -ano -p tcp",
                RedirectStandardOutput = true,
                UseShellExecute = false,
                CreateNoWindow = true
            };

            using var process = Process.Start(psi);
            if (process != null)
            {
                var output = process.StandardOutput.ReadToEnd();
                process.WaitForExit(2000);
                var lines = output.Split(new[] { '\r', '\n' }, StringSplitOptions.RemoveEmptyEntries);
                var pattern = new Regex($":{port}\\s+.*\\s+(\\d+)$");
                foreach (var line in lines)
                {
                    var match = pattern.Match(line);
                    if (match.Success && int.TryParse(match.Groups[1].Value, out var pid))
                    {
                        result.Add(pid);
                    }
                }
            }
        }
        catch { }

        return result;
    }

    public bool DetectExternalCloudflared()
    {
        try
        {
            var processes = Process.GetProcessesByName("cloudflared");
            return processes.Length > 0;
        }
        catch
        {
            return false;
        }
    }

    public async Task<int?> LaunchTunnelAsync(string command, string workingDirectory, Action<string>? log = null)
    {
        return await LaunchServiceAsync(command, workingDirectory, log);
    }

    public void OpenUrl(string url)
    {
        try
        {
            var psi = new ProcessStartInfo
            {
                FileName = url,
                UseShellExecute = true
            };
            Process.Start(psi);
        }
        catch { }
    }
}
