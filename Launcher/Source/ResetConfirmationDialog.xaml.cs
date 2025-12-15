using System.Windows;
using System.Windows.Controls;

namespace PropertyFlow.Launcher;

public partial class ResetConfirmationDialog : Window
{
    public bool DidConfirm { get; private set; }

    public ResetConfirmationDialog()
    {
        InitializeComponent();
        
        // Wire up text changed event to enable/disable confirm button
        ConfirmationInput.TextChanged += (s, e) =>
        {
            ConfirmButton.IsEnabled = ConfirmationInput.Text == "DELETE";
        };
    }

    private void CancelButton_Click(object sender, RoutedEventArgs e)
    {
        DidConfirm = false;
        DialogResult = false;
        Close();
    }

    private void ConfirmButton_Click(object sender, RoutedEventArgs e)
    {
        if (ConfirmationInput.Text == "DELETE")
        {
            DidConfirm = true;
            DialogResult = true;
            Close();
        }
    }
}
