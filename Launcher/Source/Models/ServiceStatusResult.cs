namespace PropertyFlow.Launcher.Models;

public enum LocalStatusState
{
    Green,   // HTTP responding
    Yellow,  // TCP ok, HTTP failed
    Red      // TCP failed or port closed
}

public class ServiceStatusResult
{
    public bool IsRunning { get; set; }
    public bool HasPublicReachability { get; set; }
    public LocalStatusState LocalStatus { get; set; }
    public string ProcessDetails { get; set; } = string.Empty;
    public string PublicSummary { get; set; } = string.Empty;
}
