using System.Diagnostics;

namespace PropertyFlow.Launcher.Services;

public class ProcessService
{
    private Dictionary<string, int> _trackedProcesses = new();

    public async Task<int?> LaunchServiceAsync(string command, string workingDirectory)
    {
        try
        {
            var psi = new ProcessStartInfo
            {
                FileName = "cmd",
                Arguments = $"/c {command}",
                WorkingDirectory = workingDirectory,
                UseShellExecute = false,
                CreateNoWindow = true
            };

            var process = Process.Start(psi);
            if (process != null)
            {
                _trackedProcesses[workingDirectory] = process.Id;
                await Task.Delay(500);
                return process.Id;
            }
        }
        catch (Exception ex)
        {
            System.Diagnostics.Debug.WriteLine($"Launch error: {ex.Message}");
        }
        return null;
    }

    public bool TryGetTrackedProcess(string workingDirectory, out int processId)
    {
        return _trackedProcesses.TryGetValue(workingDirectory, out processId);
    }

    public void StopProcess(string workingDirectory)
    {
        if (TryGetTrackedProcess(workingDirectory, out int pid))
        {
            try
            {
                var process = Process.GetProcessById(pid);
                // Graceful close
                process.CloseMainWindow();
                bool exited = process.WaitForExit(2000);
                
                if (!exited)
                {
                    process.Kill(true);
                }
                _trackedProcesses.Remove(workingDirectory);
            }
            catch { }
        }
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

    public async Task<int?> LaunchTunnelAsync(string command, string workingDirectory)
    {
        return await LaunchServiceAsync(command, workingDirectory);
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
