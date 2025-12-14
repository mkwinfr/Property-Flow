using System;
using System.Collections.ObjectModel;
using System.Windows;
using System.Windows.Input;
using System.Windows.Media;

namespace PropertyFlow.Launcher.ViewModels;

public enum ServiceButtonState
{
    Launch,
    Starting,
    Running,
    Stopping
}

public class ServiceStatusViewModel : System.ComponentModel.INotifyPropertyChanged
{
    private ServiceButtonState _buttonState = ServiceButtonState.Launch;
    private Models.ServiceStatusResult _status = new();
    private const int MaxLogEntries = 200;

    public Models.ServiceConfig Config { get; set; } = new();
    public Services.StatusService StatusService { get; set; } = new();
    public ObservableCollection<string> Logs { get; } = new();

    public Models.ServiceStatusResult Status
    {
        get => _status;
        set
        {
            _status = value;
            OnPropertyChanged(nameof(Status));
            OnPropertyChanged(nameof(CanLaunch));
        }
    }

    public ServiceButtonState ButtonState
    {
        get => _buttonState;
        set { _buttonState = value; OnPropertyChanged(nameof(ButtonState)); OnPropertyChanged(nameof(LaunchLabel)); }
    }

    public string LaunchLabel => ButtonState switch
    {
        ServiceButtonState.Launch => $"Launch {Config.Name}",
        ServiceButtonState.Starting => "Starting…",
        ServiceButtonState.Running => $"{Config.Name} running",
        ServiceButtonState.Stopping => "Stopping…",
        _ => "Launch"
    };

    public bool CanLaunch => Status.LocalStatus == Models.LocalStatusState.Red && ButtonState == ServiceButtonState.Launch;
    public bool HasTrackedProcess { get; set; }
    public bool CanStop => HasTrackedProcess && ButtonState != ServiceButtonState.Stopping;

    public void AppendLog(string message)
    {
        var line = $"[{DateTime.Now:HH:mm:ss}] {message}";

        void Add()
        {
            Logs.Add(line);
            if (Logs.Count > MaxLogEntries)
            {
                Logs.RemoveAt(0);
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

public class TunnelStatusViewModel : System.ComponentModel.INotifyPropertyChanged
{
    private Models.ServiceStatusResult _status = new();

    public Models.ServiceStatusResult Status
    {
        get => _status;
        set
        {
            _status = value;
            OnPropertyChanged(nameof(Status));
            OnPropertyChanged(nameof(IsProcessRunning));
            OnPropertyChanged(nameof(HasPublicReachability));
        }
    }

    public bool IsProcessRunning => Status.IsRunning;
    public bool HasPublicReachability => Status.HasPublicReachability;

    public event System.ComponentModel.PropertyChangedEventHandler? PropertyChanged;

    protected void OnPropertyChanged(string name)
    {
        PropertyChanged?.Invoke(this, new System.ComponentModel.PropertyChangedEventArgs(name));
    }
}
