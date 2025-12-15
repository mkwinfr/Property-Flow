using System.Collections.ObjectModel;
using System.Windows;
using System.Windows.Input;
using PropertyFlow.Launcher.Models;
using PropertyFlow.Launcher.Services;

namespace PropertyFlow.Launcher.ViewModels;

public class SourceViewModel : System.ComponentModel.INotifyPropertyChanged
{
    private GitService _gitService = new();
    private List<RepositoryInfo> _repositories = new();
    private RepositoryInfo _selectedRepository = new();
    private GitStatus _repoStatus = new();
    private bool _isLoading;
    private string _commandOutput = string.Empty;
    private const int MaxLogLines = 500;

    public ObservableCollection<RepositoryInfo> Repositories { get; } = new();
    public ObservableCollection<string> CommandLog { get; } = new();

    public RepositoryInfo SelectedRepository
    {
        get => _selectedRepository;
        set
        {
            if (_selectedRepository != value)
            {
                _selectedRepository = value;
                OnPropertyChanged(nameof(SelectedRepository));
                _ = RefreshStatusAsync();
            }
        }
    }

    public GitStatus RepoStatus
    {
        get => _repoStatus;
        set
        {
            _repoStatus = value;
            OnPropertyChanged(nameof(RepoStatus));
        }
    }

    public bool IsLoading
    {
        get => _isLoading;
        set
        {
            _isLoading = value;
            OnPropertyChanged(nameof(IsLoading));
        }
    }

    public ICommand RefreshStatusCommand { get; private set; }
    public ICommand FetchCommand { get; private set; }
    public ICommand PullCommand { get; private set; }
    public ICommand ResetLocalCommand { get; private set; }

    public SourceViewModel()
    {
        RefreshStatusCommand = new AsyncRelayCommand(async () => await RefreshStatusAsync());
        FetchCommand = new AsyncRelayCommand(async () => await FetchAsync());
        PullCommand = new AsyncRelayCommand(async () => await PullAsync(), CanPull);
        ResetLocalCommand = new AsyncRelayCommand(async () => await ResetLocalAsync());

        InitializeRepositories();
        
        if (Repositories.Count > 0)
        {
            SelectedRepository = Repositories[0];
        }
    }

    private void InitializeRepositories()
    {
        var basePath = @"C:\Users\mkwin\Desktop\Property Flow";
        
        _repositories = new List<RepositoryInfo>
        {
            new()
            {
                Name = "Property Flow",
                Path = basePath,
                DisplayPath = "C:\\Users\\mkwin\\Desktop\\Property Flow"
            },
            new()
            {
                Name = "Property Flow Tech",
                Path = System.IO.Path.Combine(basePath, "Property Flow Tech"),
                DisplayPath = System.IO.Path.Combine(basePath, "Property Flow Tech")
            },
            new()
            {
                Name = "Property Flow Backend",
                Path = System.IO.Path.Combine(basePath, "Property Flow Backend"),
                DisplayPath = System.IO.Path.Combine(basePath, "Property Flow Backend")
            },
            new()
            {
                Name = "Property Flow Desktop",
                Path = System.IO.Path.Combine(basePath, "Property Flow Desktop"),
                DisplayPath = System.IO.Path.Combine(basePath, "Property Flow Desktop")
            }
        };

        foreach (var repo in _repositories)
        {
            Repositories.Add(repo);
        }
    }

    public async Task RefreshStatusAsync()
    {
        if (SelectedRepository == null) return;

        IsLoading = true;
        AppendLog($"Refreshing status for {SelectedRepository.Name}...");

        try
        {
            RepoStatus = await _gitService.GetStatusAsync(SelectedRepository.Path, AppendLog);
            AppendLog("Status refresh complete.");
        }
        catch (Exception ex)
        {
            AppendLog($"Error refreshing status: {ex.Message}");
        }
        finally
        {
            IsLoading = false;
        }
    }

    public async Task FetchAsync()
    {
        if (SelectedRepository == null) return;

        IsLoading = true;
        AppendLog($"Fetching {SelectedRepository.Name}...");

        try
        {
            var (success, output) = await _gitService.FetchAsync(SelectedRepository.Path, AppendLog);
            AppendLog(success ? "Fetch completed successfully." : "Fetch failed.");
            
            // Refresh status after fetch
            await RefreshStatusAsync();
        }
        catch (Exception ex)
        {
            AppendLog($"Error during fetch: {ex.Message}");
        }
        finally
        {
            IsLoading = false;
        }
    }

    public async Task PullAsync()
    {
        if (SelectedRepository == null) return;

        if (!CanPull())
        {
            AppendLog("Pull cannot be executed: working tree is dirty or no tracking branch.");
            return;
        }

        IsLoading = true;
        AppendLog($"Pulling {SelectedRepository.Name}...");

        try
        {
            var (success, output) = await _gitService.PullAsync(SelectedRepository.Path, AppendLog);
            AppendLog(success ? "Pull completed successfully." : "Pull failed.");
            
            // Refresh status after pull
            await RefreshStatusAsync();
        }
        catch (Exception ex)
        {
            AppendLog($"Error during pull: {ex.Message}");
        }
        finally
        {
            IsLoading = false;
        }
    }

    private bool CanPull()
    {
        return RepoStatus.IsTrackingBranch && 
               RepoStatus.WorkingTreeState == DirtyState.Clean;
    }

    public async Task ResetLocalAsync()
    {
        if (SelectedRepository == null) return;

        // Show confirmation dialog
        var dialog = new ResetConfirmationDialog();
        bool? result = dialog.ShowDialog();

        if (result != true || !dialog.DidConfirm)
        {
            AppendLog("Reset operation cancelled by user.");
            return;
        }

        IsLoading = true;
        AppendLog($"DESTRUCTIVE: Resetting {SelectedRepository.Name}...");

        try
        {
            var (success, output) = await _gitService.ResetHardAsync(SelectedRepository.Path, AppendLog);
            AppendLog(success ? "Reset completed successfully." : "Reset encountered errors.");
            
            // Refresh status after reset
            await RefreshStatusAsync();
        }
        catch (Exception ex)
        {
            AppendLog($"Error during reset: {ex.Message}");
        }
        finally
        {
            IsLoading = false;
        }
    }

    private void AppendLog(string message)
    {
        var line = $"[{DateTime.Now:HH:mm:ss}] {message}";

        void Add()
        {
            CommandLog.Add(line);
            if (CommandLog.Count > MaxLogLines)
            {
                CommandLog.RemoveAt(0);
            }
        }

        if (Application.Current?.Dispatcher != null)
        {
            _ = Application.Current.Dispatcher.InvokeAsync(Add);
        }
        else
        {
            Add();
        }
    }

    public event System.ComponentModel.PropertyChangedEventHandler? PropertyChanged;

    protected void OnPropertyChanged(string name)
    {
        PropertyChanged?.Invoke(this, new System.ComponentModel.PropertyChangedEventArgs(name));
    }
}
