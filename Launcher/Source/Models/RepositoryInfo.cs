namespace PropertyFlow.Launcher.Models;

public class RepositoryInfo
{
    public string Name { get; set; } = string.Empty;
    public string Path { get; set; } = string.Empty;
    public string DisplayPath { get; set; } = string.Empty;
}

public enum DirtyState
{
    Clean,
    Dirty,
    Unknown
}

public class GitStatus
{
    public string CurrentBranch { get; set; } = string.Empty;
    public string TrackingBranch { get; set; } = string.Empty;
    public int AheadCount { get; set; }
    public int BehindCount { get; set; }
    public DirtyState WorkingTreeState { get; set; } = DirtyState.Unknown;
    public int ModifiedFileCount { get; set; }
    public int UntrackedFileCount { get; set; }
    public List<string> ChangedFiles { get; set; } = new();
    public bool IsTrackingBranch { get; set; }
    public DateTime LastRefreshTime { get; set; }
    public string ErrorMessage { get; set; } = string.Empty;
}
