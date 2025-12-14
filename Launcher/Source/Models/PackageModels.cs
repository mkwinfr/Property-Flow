using System.Collections.ObjectModel;

namespace PropertyFlow.Launcher.Models;

public class PackageDependency
{
    public string Name { get; set; } = string.Empty;
    public string Version { get; set; } = string.Empty;
    public bool IsDev { get; set; }
}

public class PackageProject
{
    public string Name { get; set; } = string.Empty;
    public string WorkingDirectory { get; set; } = string.Empty;
    public ObservableCollection<PackageDependency> Declared { get; set; } = new();
    public string Status { get; set; } = string.Empty;
}
