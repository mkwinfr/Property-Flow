using System;
using System.Globalization;
using System.Linq;
using System.Windows.Data;
using PropertyFlow.Launcher.Models;
using PropertyFlow.Launcher.ViewModels;
using PropertyFlow.Launcher.Controls;

namespace PropertyFlow.Launcher.Utilities;

public class EcgStateConverter : IMultiValueConverter
{
    public object Convert(object[] values, Type targetType, object parameter, CultureInfo culture)
    {
        // Expected: LocalStatusState, ServiceButtonState? or bool? (isRunning), optional bool isRunning
        LocalStatusState localStatus = LocalStatusState.Red;
        ServiceButtonState? buttonState = null;
        bool? isRunning = null;

        if (values.Length > 0 && values[0] is LocalStatusState ls)
            localStatus = ls;
        if (values.Length > 1)
        {
            if (values[1] is ServiceButtonState sb) buttonState = sb;
            else if (values[1] is bool b1) isRunning = b1;
        }
        if (values.Length > 2 && values[2] is bool b2)
            isRunning = b2;

        // Map to ECG state with graceful fallbacks
        if (isRunning.HasValue && isRunning.Value == false)
            return EcgState.Red;

        if (localStatus == LocalStatusState.Red)
            return EcgState.Red;

        if (buttonState == ServiceButtonState.Starting || localStatus == LocalStatusState.Yellow)
            return EcgState.Amber;

        return EcgState.Green;
    }

    public object[] ConvertBack(object value, Type[] targetTypes, object parameter, CultureInfo culture)
        => Enumerable.Repeat(Binding.DoNothing, targetTypes.Length).ToArray();
}
