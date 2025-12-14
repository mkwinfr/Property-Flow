using System.Text.Json;
using System.IO;

namespace PropertyFlow.Launcher.Services;

public class ConfigService
{
    public Models.LauncherConfig LoadConfig(string path)
    {
        var json = File.ReadAllText(path);
        var options = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
        return JsonSerializer.Deserialize<Models.LauncherConfig>(json, options) ?? new();
    }
}
