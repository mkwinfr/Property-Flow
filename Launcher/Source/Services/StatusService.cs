using System.Net.Sockets;
using System.Net.Http;

namespace PropertyFlow.Launcher.Services;

public class StatusService
{
    public async Task<bool> TcpConnectAsync(string host, int port)
    {
        try
        {
            using var client = new System.Net.Sockets.TcpClient();
            var task = client.ConnectAsync(host, port);
            var result = await Task.WhenAny(task, Task.Delay(600));
            return result == task && client.Connected;
        }
        catch
        {
            return false;
        }
    }

    public async Task<bool> CheckLocalHttpAsync(string url)
    {
        try
        {
            using var client = new HttpClient { Timeout = TimeSpan.FromMilliseconds(1200) };
            var response = await client.GetAsync(url);
            return response.IsSuccessStatusCode;
        }
        catch
        {
            return false;
        }
    }

    public async Task<Models.ServiceStatusResult> CheckLocalWithStateAsync(string host, int port, string healthUrl)
    {
        var result = new Models.ServiceStatusResult();

        // Check TCP
        bool tcpOk = await TcpConnectAsync(host, port);
        
        if (!tcpOk)
        {
            result.LocalStatus = Models.LocalStatusState.Red;
            result.ProcessDetails = "Port closed";
            return result;
        }

        // TCP ok, check HTTP
        bool httpOk = await CheckLocalHttpAsync(healthUrl);
        
        if (httpOk)
        {
            result.LocalStatus = Models.LocalStatusState.Green;
            result.ProcessDetails = "Server running";
        }
        else
        {
            result.LocalStatus = Models.LocalStatusState.Yellow;
            result.ProcessDetails = "Port occupied";
        }

        return result;
    }

    public async Task<bool> CheckPublicAsync(string url)
    {
        try
        {
            using var client = new HttpClient { Timeout = TimeSpan.FromSeconds(3) };
            var response = await client.GetAsync(url);
            return response.IsSuccessStatusCode;
        }
        catch
        {
            return false;
        }
    }
}
