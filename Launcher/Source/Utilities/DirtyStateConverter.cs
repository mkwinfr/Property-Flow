using System.Globalization;
using System.Windows.Data;
using System.Windows.Media;
using PropertyFlow.Launcher.Models;

namespace PropertyFlow.Launcher.Utilities;

public class DirtyStateConverter : IValueConverter
{
    private static readonly SolidColorBrush CleanBrush = new Color { A = 255, R = 16, G = 185, B = 129 }.ToSolidColorBrush();
    private static readonly SolidColorBrush DirtyBrush = new Color { A = 255, R = 245, G = 158, B = 11 }.ToSolidColorBrush();
    private static readonly SolidColorBrush UnknownBrush = new Color { A = 255, R = 107, G = 114, B = 128 }.ToSolidColorBrush();

    public object Convert(object? value, Type targetType, object? parameter, CultureInfo? culture)
    {
        return value switch
        {
            DirtyState.Clean => CleanBrush,
            DirtyState.Dirty => DirtyBrush,
            DirtyState.Unknown => UnknownBrush,
            _ => UnknownBrush
        };
    }

    public object ConvertBack(object? value, Type targetType, object? parameter, CultureInfo? culture)
    {
        throw new NotImplementedException();
    }
}

public class DirtyStateTextConverter : IValueConverter
{
    public object Convert(object? value, Type targetType, object? parameter, CultureInfo? culture)
    {
        return value switch
        {
            DirtyState.Clean => "Clean",
            DirtyState.Dirty => "Dirty",
            DirtyState.Unknown => "Unknown",
            _ => "Unknown"
        };
    }

    public object ConvertBack(object? value, Type targetType, object? parameter, CultureInfo? culture)
    {
        throw new NotImplementedException();
    }
}

public class AheadBehindVisibilityConverter : IValueConverter
{
    public object Convert(object? value, Type targetType, object? parameter, CultureInfo? culture)
    {
        if (value is int count)
        {
            return count > 0 ? System.Windows.Visibility.Visible : System.Windows.Visibility.Collapsed;
        }
        return System.Windows.Visibility.Collapsed;
    }

    public object ConvertBack(object? value, Type targetType, object? parameter, CultureInfo? culture)
    {
        throw new NotImplementedException();
    }
}

public class BoolInverter : IValueConverter
{
    public object Convert(object? value, Type targetType, object? parameter, CultureInfo? culture)
    {
        if (value is bool b)
        {
            return !b;
        }
        return true;
    }

    public object ConvertBack(object? value, Type targetType, object? parameter, CultureInfo? culture)
    {
        throw new NotImplementedException();
    }
}
