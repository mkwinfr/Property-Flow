using System.Windows;

namespace PropertyFlow.Launcher;

public partial class MainWindow : Window
{
    private ViewModels.MainViewModel _viewModel;
    private ViewModels.SourceViewModel _sourceViewModel;

    public MainWindow()
    {
        InitializeComponent();
        _viewModel = new ViewModels.MainViewModel();
        DataContext = _viewModel;
        
        // Initialize SourceViewModel and register it in resources
        _sourceViewModel = new ViewModels.SourceViewModel();
        Resources["SourceViewModel"] = _sourceViewModel;
        
        // Handle window closing to cleanup processes
        Closing += MainWindow_Closing;
    }

    private void MainWindow_Closing(object? sender, System.ComponentModel.CancelEventArgs e)
    {
        // Stop all tracked processes when the launcher closes
        _viewModel.CleanupOnClose();
        _sourceViewModel.Cleanup();
    }
}
