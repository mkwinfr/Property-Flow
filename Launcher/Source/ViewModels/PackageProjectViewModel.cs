using System.Collections.ObjectModel;
using System.IO;
using System.Text.Json;
using PropertyFlow.Launcher.Models;

namespace PropertyFlow.Launcher.ViewModels;

public class PackageProjectViewModel : System.ComponentModel.INotifyPropertyChanged
{
    public string Name { get; }
    public string WorkingDirectory { get; }

    private string _status = "Not loaded";
    public string Status
    {
        get => _status;
        set { _status = value; OnPropertyChanged(nameof(Status)); }
    }

    public ObservableCollection<PackageDependency> Declared { get; } = new();

    public PackageProjectViewModel(string name, string workingDirectory)
    {
        Name = name;
        WorkingDirectory = workingDirectory;
    }

    public void Load()
    {
        Declared.Clear();
        try
        {
            var packageJsonPath = Path.Combine(WorkingDirectory, "package.json");
            if (!File.Exists(packageJsonPath))
            {
                Status = "package.json not found";
                return;
            }

            var json = File.ReadAllText(packageJsonPath);
            using var doc = JsonDocument.Parse(json);
            var root = doc.RootElement;

            if (root.TryGetProperty("dependencies", out var deps) && deps.ValueKind == JsonValueKind.Object)
            {
                foreach (var prop in deps.EnumerateObject())
                {
                    Declared.Add(new PackageDependency { Name = prop.Name, Version = prop.Value.GetString() ?? string.Empty });
                }
            }

            if (root.TryGetProperty("devDependencies", out var devDeps) && devDeps.ValueKind == JsonValueKind.Object)
            {
                foreach (var prop in devDeps.EnumerateObject())
                {
                    Declared.Add(new PackageDependency { Name = prop.Name, Version = prop.Value.GetString() ?? string.Empty, IsDev = true });
                }
            }

            Status = "Loaded from package.json";
        }
        catch (Exception ex)
        {
            Status = $"Error: {ex.Message}";
        }
    }

    public event System.ComponentModel.PropertyChangedEventHandler? PropertyChanged;
    protected void OnPropertyChanged(string name)
    {
        PropertyChanged?.Invoke(this, new System.ComponentModel.PropertyChangedEventArgs(name));
    }
}
