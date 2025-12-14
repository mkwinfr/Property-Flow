namespace PropertyFlow.Launcher.Models;

public class ServiceConfig
{
    public string Name { get; set; } = string.Empty;
    public string Command { get; set; } = string.Empty;
    public string WorkingDirectory { get; set; } = string.Empty;
    public int Port { get; set; }
    public string PublicUrl { get; set; } = string.Empty;
    public string HealthPath { get; set; } = "/";
}

public class TunnelConfig
{
    public string Command { get; set; } = string.Empty;
    public string WorkingDirectory { get; set; } = string.Empty;
}

public class LauncherConfig
{
    public List<ServiceConfig> Services { get; set; } = new();
    public TunnelConfig Tunnel { get; set; } = new();
}
