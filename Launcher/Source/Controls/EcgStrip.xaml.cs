using System.Windows;
using System.Windows.Controls;
using System.Windows.Media;

namespace PropertyFlow.Launcher.Controls;

public enum EcgState
{
    Green,
    Amber,
    Red
}

public partial class EcgStrip : UserControl
{
    public static readonly DependencyProperty StateProperty =
        DependencyProperty.Register(nameof(State), typeof(EcgState), typeof(EcgStrip),
            new PropertyMetadata(EcgState.Green, OnStateChanged));

    public static readonly DependencyProperty WaveStrokeProperty =
        DependencyProperty.Register(nameof(WaveStroke), typeof(Brush), typeof(EcgStrip),
            new PropertyMetadata(Brushes.LawnGreen));

    public static readonly DependencyProperty ScanHeadBrushProperty =
        DependencyProperty.Register(nameof(ScanHeadBrush), typeof(Brush), typeof(EcgStrip),
            new PropertyMetadata(Brushes.LawnGreen));

    public EcgState State
    {
        get => (EcgState)GetValue(StateProperty);
        set => SetValue(StateProperty, value);
    }

    public Brush WaveStroke
    {
        get => (Brush)GetValue(WaveStrokeProperty);
        set => SetValue(WaveStrokeProperty, value);
    }

    public Brush ScanHeadBrush
    {
        get => (Brush)GetValue(ScanHeadBrushProperty);
        set => SetValue(ScanHeadBrushProperty, value);
    }

    public EcgStrip()
    {
        InitializeComponent();
        Loaded += (_, _) => ApplyState(State, false);
    }

    private static void OnStateChanged(DependencyObject d, DependencyPropertyChangedEventArgs e)
    {
        if (d is EcgStrip strip && e.NewValue is EcgState next)
        {
            strip.ApplyState(next, true);
        }
    }

    private void ApplyState(EcgState state, bool useTransitions)
    {
        var green = (Brush)FindResource("EcgGreenBrush");
        var amber = (Brush)FindResource("EcgAmberBrush");
        var red = (Brush)FindResource("EcgRedBrush");
        var scanGreen = (Brush)FindResource("ScanGlowGreen");
        var scanAmber = (Brush)FindResource("ScanGlowAmber");

        switch (state)
        {
            case EcgState.Green:
                WaveStroke = green;
                ScanHeadBrush = scanGreen;
                VisualStateManager.GoToElementState(LayoutRoot, "GreenState", useTransitions);
                break;
            case EcgState.Amber:
                WaveStroke = amber;
                ScanHeadBrush = scanAmber;
                VisualStateManager.GoToElementState(LayoutRoot, "AmberState", useTransitions);
                break;
            case EcgState.Red:
                WaveStroke = red;
                ScanHeadBrush = red;
                VisualStateManager.GoToElementState(LayoutRoot, "RedState", useTransitions);
                break;
        }
    }
}
