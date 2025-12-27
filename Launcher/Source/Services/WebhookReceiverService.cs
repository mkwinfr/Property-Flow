using System.Diagnostics;
using System.IO;
using System.Text;

namespace PropertyFlow.Launcher.Services;

public class WebhookReceiverService
{
    private Process? _process;
    private const string WebhookScriptPath = "webhook-receiver.js";
    private const string NodeExecutable = "node";
    private const int Port = 3456;

    public event Action<string>? LogReceived;
    public bool IsRunning => _process?.HasExited == false;

    public void Start(string workspaceRoot)
    {
        if (IsRunning)
        {
            LogReceived?.Invoke("[Webhook] Already running");
            return;
        }

        try
        {
            string webhookPath = Path.Combine(workspaceRoot, WebhookScriptPath);
            
            if (!File.Exists(webhookPath))
            {
                LogReceived?.Invoke($"[Webhook] Error: Script not found at {webhookPath}");
                return;
            }

            _process = new Process
            {
                StartInfo = new ProcessStartInfo
                {
                    FileName = NodeExecutable,
                    Arguments = $"\"{webhookPath}\"",
                    WorkingDirectory = workspaceRoot,
                    UseShellExecute = false,
                    RedirectStandardOutput = true,
                    RedirectStandardError = true,
                    CreateNoWindow = true,
                    StandardOutputEncoding = Encoding.UTF8,
                    StandardErrorEncoding = Encoding.UTF8
                }
            };

            _process.OutputDataReceived += (sender, e) =>
            {
                if (!string.IsNullOrEmpty(e.Data))
                {
                    LogReceived?.Invoke(e.Data);
                }
            };

            _process.ErrorDataReceived += (sender, e) =>
            {
                if (!string.IsNullOrEmpty(e.Data))
                {
                    LogReceived?.Invoke($"[ERROR] {e.Data}");
                }
            };

            _process.Start();
            _process.BeginOutputReadLine();
            _process.BeginErrorReadLine();

            LogReceived?.Invoke($"[Webhook] Started on port {Port}");
        }
        catch (Exception ex)
        {
            LogReceived?.Invoke($"[Webhook] Failed to start: {ex.Message}");
        }
    }

    public void Stop()
    {
        if (_process == null) return;

        try
        {
            if (!_process.HasExited)
            {
                _process.Kill(entireProcessTree: true);
                _process.WaitForExit(3000);
            }

            _process.Dispose();
            _process = null;
            LogReceived?.Invoke("[Webhook] Stopped");
        }
        catch (Exception ex)
        {
            LogReceived?.Invoke($"[Webhook] Error stopping: {ex.Message}");
        }
    }

    public void Dispose()
    {
        Stop();
        _process?.Dispose();
    }
}
