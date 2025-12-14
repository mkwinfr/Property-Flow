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
        // Expected: HasPublicReachability (bool), ServiceButtonState? or bool? (isRunning)
        bool hasPublicReachability = false;
        ServiceButtonState? buttonState = null;
        bool isStarting = false;

        if (values.Length > 0 && values[0] is bool pub)
            hasPublicReachability = pub;
        if (values.Length > 1)
        {
            if (values[1] is ServiceButtonState sb)
            {
                buttonState = sb;
                isStarting = sb == ServiceButtonState.Starting;
            }
            else if (values[1] is bool b1)
                isStarting = b1; // For tunnel, this could be isRunning while not yet public
        }
        if (values.Length > 2 && values[2] is bool starting)
            isStarting = starting;

        // Map to ECG state based on Public status
        // Green: Public is reachable (full spike animation)
        // Yellow: Starting/restarting (slow 1-2 spikes)
        // Red: Public offline (flatline)
        
        if (isStarting && !hasPublicReachability)
            return EcgState.Amber;

        if (hasPublicReachability)
            return EcgState.Green;

        return EcgState.Red;
    }

    public object[] ConvertBack(object value, Type[] targetTypes, object parameter, CultureInfo culture)
        => Enumerable.Repeat(Binding.DoNothing, targetTypes.Length).ToArray();
}
