using System.Globalization;
using System.Windows.Data;
using System.Windows.Media;

namespace PropertyFlow.Launcher.Utilities;

public class StatusBrushConverter : IValueConverter
{
    private static readonly SolidColorBrush GreenBrush = new Color { A = 255, R = 16, G = 185, B = 129 }.ToSolidColorBrush();
    private static readonly SolidColorBrush YellowBrush = new Color { A = 255, R = 245, G = 158, B = 11 }.ToSolidColorBrush();
    private static readonly SolidColorBrush RedBrush = new Color { A = 255, R = 239, G = 68, B = 68 }.ToSolidColorBrush();

    public object Convert(object? value, Type targetType, object? parameter, CultureInfo? culture)
    {
        return value switch
        {
            Models.LocalStatusState.Green => GreenBrush,
            Models.LocalStatusState.Yellow => YellowBrush,
            Models.LocalStatusState.Red => RedBrush,
            bool b => b ? GreenBrush : RedBrush,
            _ => RedBrush
        };
    }

    public object ConvertBack(object? value, Type targetType, object? parameter, CultureInfo? culture)
    {
        throw new NotImplementedException();
    }
}

public static class ColorExtensions
{
    public static SolidColorBrush ToSolidColorBrush(this Color color) => new(color);
}
