using System.Collections.ObjectModel;
using System.Linq;
using System.Windows;
using System.Windows.Input;
using PropertyFlow.Launcher.Models;

namespace PropertyFlow.Launcher.ViewModels;

public class MainViewModel : System.ComponentModel.INotifyPropertyChanged
{
    private Services.StatusService _statusService = new();
    private Services.ProcessService _processService = new();
    private Services.ConfigService _configService = new();
    private Models.LauncherConfig _config = new();
    private ObservableCollection<ServiceStatusViewModel> _services = new();
    private TunnelStatusViewModel _tunnelStatus = new();
    private string _machineNameDisplay = string.Empty;
    private ObservableCollection<PackageProjectViewModel> _packageProjects = new();
    private const int MaxLauncherLogEntries = 200;

    public ObservableCollection<ServiceStatusViewModel> Services
    {
        get => _services;
        set { _services = value; OnPropertyChanged(nameof(Services)); }
    }

    public TunnelStatusViewModel TunnelStatus
    {
        get => _tunnelStatus;
        set { _tunnelStatus = value; OnPropertyChanged(nameof(TunnelStatus)); }
    }

    public ObservableCollection<PackageProjectViewModel> PackageProjects
    {
        get => _packageProjects;
        set { _packageProjects = value; OnPropertyChanged(nameof(PackageProjects)); }
    }

    public ObservableCollection<string> LauncherLogs { get; } = new();

    public string MachineNameDisplay
    {
        get => _machineNameDisplay;
        set { _machineNameDisplay = value; OnPropertyChanged(nameof(MachineNameDisplay)); }
    }

    public ICommand LaunchServiceCommand { get; private set; }
    public ICommand LaunchAllCommand { get; private set; }
    public ICommand LaunchTunnelCommand { get; private set; }
    public ICommand OpenLocalCommand { get; private set; }
    public ICommand OpenPublicCommand { get; private set; }
    public ICommand StopServiceCommand { get; private set; }
    public ICommand StopAllCommand { get; private set; }
    public ICommand RefreshPackagesCommand { get; private set; }

    public MainViewModel()
    {
        LaunchServiceCommand = new RelayCommand<ServiceStatusViewModel>(LaunchService);
        LaunchAllCommand = new RelayCommand(LaunchAll);
        LaunchTunnelCommand = new RelayCommand(LaunchTunnel);
        OpenLocalCommand = new RelayCommand<ServiceStatusViewModel>(OpenLocal);
        OpenPublicCommand = new RelayCommand<ServiceStatusViewModel>(OpenPublic);
        StopServiceCommand = new RelayCommand<ServiceStatusViewModel>(StopService);
        StopAllCommand = new RelayCommand(StopAll);
        RefreshPackagesCommand = new RelayCommand(RefreshPackages);
        LoadConfig();
        InitializeUI();
    }

    private void LoadConfig()
    {
        try
        {
            var configPath = System.IO.Path.Combine(
                System.IO.Path.GetDirectoryName(System.Reflection.Assembly.GetExecutingAssembly().Location) ?? "",
                "config.json");
            
            if (System.IO.File.Exists(configPath))
            {
                _config = _configService.LoadConfig(configPath);
            }
        }
        catch (Exception ex)
        {
            System.Diagnostics.Debug.WriteLine($"Config load error: {ex.Message}");
        }
    }

    private void InitializeUI()
    {
        MachineNameDisplay = $"This PC: {System.Environment.MachineName} | Local target: 127.0.0.1";

        foreach (var svc in _config.Services)
        {
            var vm = new ServiceStatusViewModel
            {
                Config = svc,
                StatusService = _statusService
            };
            Services.Add(vm);
        }

        TunnelStatus = new TunnelStatusViewModel();

        _ = RefreshStatusAsync();
        RefreshPackages();
    }

    private void RefreshPackages()
    {
        PackageProjects.Clear();
        foreach (var svc in _config.Services)
        {
            var project = new PackageProjectViewModel(svc.Name, svc.WorkingDirectory);
            project.Load();
            PackageProjects.Add(project);
        }
    }

    private async Task RefreshStatusAsync()
    {
        while (true)
        {
            try
            {
                foreach (var svc in Services)
                {
                    var healthUrl = $"http://127.0.0.1:{svc.Config.Port}{svc.Config.HealthPath}";
                    var status = await _statusService.CheckLocalWithStateAsync("127.0.0.1", svc.Config.Port, healthUrl);
                    status.HasPublicReachability = await _statusService.CheckPublicAsync(svc.Config.PublicUrl);
                    status.PublicSummary = status.HasPublicReachability ? "Public: Active" : "Public: Offline";
                    svc.Status = status;
                }

                // Tunnel status
                bool cloudflaredRunning = _processService.DetectExternalCloudflared();
                bool publicOk = false;

                // Re-use the first configured public URL as a reachability probe for the tunnel
                var probeUrl = _config.Services.FirstOrDefault()?.PublicUrl;
                if (cloudflaredRunning && !string.IsNullOrWhiteSpace(probeUrl))
                {
                    publicOk = await _statusService.CheckPublicAsync(probeUrl);
                }

                TunnelStatus.Status = new Models.ServiceStatusResult
                {
                    IsRunning = cloudflaredRunning,
                    ProcessDetails = cloudflaredRunning ? "cloudflared running" : "cloudflared not detected",
                    HasPublicReachability = publicOk,
                    PublicSummary = publicOk ? "Public: Active" : "Public: Offline"
                };
            }
            catch { }

            await Task.Delay(2000);
        }
    }

    private async void LaunchService(ServiceStatusViewModel? vm)
    {
        if (vm == null) return;

        if (_processService.IsPortInUse(vm.Config.Port))
        {
            var blockedMessage = $"Launch blocked for {vm.Config.Name}: port {vm.Config.Port} is already in use.";
            vm.AppendLog(blockedMessage);
            AppendLauncherLog(blockedMessage);
            return;
        }

        vm.ButtonState = ServiceButtonState.Starting;
        vm.AppendLog($"Launching {vm.Config.Name}...");

        var pid = await _processService.LaunchServiceAsync(vm.Config.Command, vm.Config.WorkingDirectory, vm.AppendLog);
        if (pid.HasValue)
        {
            vm.HasTrackedProcess = true;
            vm.ButtonState = ServiceButtonState.Running;
            vm.AppendLog($"Started (PID: {pid})");
        }
        else
        {
            vm.ButtonState = ServiceButtonState.Launch;
            vm.AppendLog("Failed to launch service");
            AppendLauncherLog($"Failed to launch {vm.Config.Name}");
        }
    }

    private void LaunchAll()
    {
        foreach (var svc in Services)
        {
            if (svc.CanLaunch)
            {
                LaunchService(svc);
            }
        }
    }

    private async void LaunchTunnel()
    {
        var pid = await _processService.LaunchTunnelAsync(_config.Tunnel.Command, _config.Tunnel.WorkingDirectory);
        TunnelStatus.Status = new Models.ServiceStatusResult
        {
            IsRunning = pid.HasValue || TunnelStatus.Status.IsRunning,
            HasPublicReachability = TunnelStatus.Status.HasPublicReachability,
            ProcessDetails = pid.HasValue ? $"Tunnel started (PID: {pid})" : "Failed to launch tunnel",
            PublicSummary = TunnelStatus.Status.PublicSummary
        };
    }

    private void OpenLocal(ServiceStatusViewModel? vm)
    {
        if (vm == null) return;
        _processService.OpenUrl($"http://127.0.0.1:{vm.Config.Port}");
        vm.AppendLog("Opened local URL");
    }

    private void OpenPublic(ServiceStatusViewModel? vm)
    {
        if (vm == null) return;
        _processService.OpenUrl(vm.Config.PublicUrl);
        vm.AppendLog("Opened public URL");
    }

    private void StopService(ServiceStatusViewModel? vm)
    {
        if (vm == null) return;

        vm.ButtonState = ServiceButtonState.Stopping;
        vm.AppendLog("Stopping...");

        _processService.StopProcess(vm.Config.WorkingDirectory);
        vm.HasTrackedProcess = false;
        vm.ButtonState = ServiceButtonState.Launch;
        vm.AppendLog("Stopped");
        AppendLauncherLog($"Stop requested for {vm.Config.Name}");
    }

    private void StopAll()
    {
        AppendLauncherLog("Stop all services requested.");
        foreach (var svc in Services)
        {
            _processService.StopProcess(svc.Config.WorkingDirectory);
            svc.HasTrackedProcess = false;
            svc.ButtonState = ServiceButtonState.Launch;
            svc.AppendLog("Stopped via Stop All");
        }
        _processService.StopAllProcesses();
    }

    public event System.ComponentModel.PropertyChangedEventHandler? PropertyChanged;

    protected void OnPropertyChanged(string name)
    {
        PropertyChanged?.Invoke(this, new System.ComponentModel.PropertyChangedEventArgs(name));
    }

    private void AppendLauncherLog(string message)
    {
        var line = $"[{DateTime.Now:HH:mm:ss}] {message}";

        void Add()
        {
            LauncherLogs.Add(line);
            if (LauncherLogs.Count > MaxLauncherLogEntries)
            {
                LauncherLogs.RemoveAt(0);
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
}

public class RelayCommand<T> : ICommand
{
    private readonly Action<T?> _execute;
    private readonly Predicate<T?>? _canExecute;

    public RelayCommand(Action<T?> execute, Predicate<T?>? canExecute = null)
    {
        _execute = execute;
        _canExecute = canExecute;
    }

    public event EventHandler? CanExecuteChanged
    {
        add { CommandManager.RequerySuggested += value; }
        remove { CommandManager.RequerySuggested -= value; }
    }

    public bool CanExecute(object? parameter) => _canExecute == null || _canExecute((T?)parameter);
    public void Execute(object? parameter) => _execute((T?)parameter);
}

public class RelayCommand : ICommand
{
    private readonly Action _execute;
    private readonly Func<bool>? _canExecute;

    public RelayCommand(Action execute, Func<bool>? canExecute = null)
    {
        _execute = execute;
        _canExecute = canExecute;
    }

    public event EventHandler? CanExecuteChanged
    {
        add { CommandManager.RequerySuggested += value; }
        remove { CommandManager.RequerySuggested -= value; }
    }

    public bool CanExecute(object? parameter) => _canExecute?.Invoke() ?? true;
    public void Execute(object? parameter) => _execute();
}
