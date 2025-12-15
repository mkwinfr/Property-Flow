using System.Diagnostics;
using System.Text.RegularExpressions;
using PropertyFlow.Launcher.Models;

namespace PropertyFlow.Launcher.Services;

public class GitService
{
    private const int CommandTimeoutMs = 10000;

    public async Task<GitStatus> GetStatusAsync(string repoPath, Action<string>? log = null)
    {
        var status = new GitStatus { LastRefreshTime = DateTime.Now };

        try
        {
            // Get current branch
            status.CurrentBranch = await ExecuteGitCommandAsync(repoPath, "branch --show-current", log);

            // Get tracking branch
            var trackingBranch = await ExecuteGitCommandAsync(repoPath, "rev-parse --abbrev-ref --symbolic-full-name @{u}", log);
            status.TrackingBranch = trackingBranch.TrimEnd();
            status.IsTrackingBranch = !trackingBranch.Contains("@{u}") && !string.IsNullOrWhiteSpace(trackingBranch);

            // Get ahead/behind counts
            if (status.IsTrackingBranch)
            {
                var aheadBehind = await ExecuteGitCommandAsync(repoPath, "rev-list --left-right --count HEAD...@{u}", log);
                var counts = aheadBehind.Trim().Split('\t');
                if (counts.Length == 2)
                {
                    int.TryParse(counts[0], out var ahead);
                    int.TryParse(counts[1], out var behind);
                    status.AheadCount = ahead;
                    status.BehindCount = behind;
                }
            }

            // Get working tree status
            var porcelainStatus = await ExecuteGitCommandAsync(repoPath, "status --porcelain=v1", log);
            var lines = porcelainStatus.Split(new[] { '\r', '\n' }, StringSplitOptions.RemoveEmptyEntries);
            
            status.WorkingTreeState = lines.Length == 0 ? DirtyState.Clean : DirtyState.Dirty;
            
            // Count modified and untracked
            status.ModifiedFileCount = lines.Count(l => !l.StartsWith("??"));
            status.UntrackedFileCount = lines.Count(l => l.StartsWith("??"));

            // Get preview of changed files (first 10)
            status.ChangedFiles = lines.Take(10).ToList();

            return status;
        }
        catch (Exception ex)
        {
            status.ErrorMessage = ex.Message;
            status.WorkingTreeState = DirtyState.Unknown;
            log?.Invoke($"Error getting status: {ex.Message}");
            return status;
        }
    }

    public async Task<(bool success, string output)> FetchAsync(string repoPath, Action<string>? log = null)
    {
        log?.Invoke("Running: git fetch --prune");
        var result = await ExecuteGitCommandWithResultAsync(repoPath, "fetch --prune", log);
        return result;
    }

    public async Task<(bool success, string output)> PullAsync(string repoPath, Action<string>? log = null)
    {
        log?.Invoke("Running: git pull");
        var result = await ExecuteGitCommandWithResultAsync(repoPath, "pull", log);
        return result;
    }

    public async Task<(bool success, string output)> ResetHardAsync(string repoPath, Action<string>? log = null)
    {
        log?.Invoke("WARNING: Running destructive command: git reset --hard && git clean -fd");
        
        var result1 = await ExecuteGitCommandWithResultAsync(repoPath, "reset --hard", log);
        if (!result1.success)
        {
            return result1;
        }

        var result2 = await ExecuteGitCommandWithResultAsync(repoPath, "clean -fd", log);
        return result2;
    }

    private async Task<string> ExecuteGitCommandAsync(string repoPath, string args, Action<string>? log = null)
    {
        var (_, output) = await ExecuteGitCommandWithResultAsync(repoPath, args, log);
        return output;
    }

    private async Task<(bool success, string output)> ExecuteGitCommandWithResultAsync(string repoPath, string args, Action<string>? log = null)
    {
        try
        {
            var psi = new ProcessStartInfo
            {
                FileName = "git",
                Arguments = args,
                WorkingDirectory = repoPath,
                UseShellExecute = false,
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                CreateNoWindow = true
            };

            using var process = Process.Start(psi);
            if (process == null)
            {
                return (false, "Failed to start git process");
            }

            var outputTask = process.StandardOutput.ReadToEndAsync();
            var errorTask = process.StandardError.ReadToEndAsync();

            var completed = process.WaitForExit(CommandTimeoutMs);
            if (!completed)
            {
                process.Kill(entireProcessTree: true);
                return (false, "Git command timed out");
            }

            var output = await outputTask;
            var error = await errorTask;

            var success = process.ExitCode == 0;

            if (!string.IsNullOrWhiteSpace(error))
            {
                log?.Invoke($"[stderr] {error}");
            }

            if (!string.IsNullOrWhiteSpace(output))
            {
                log?.Invoke(output);
            }

            if (!success)
            {
                log?.Invoke($"Git command failed with exit code {process.ExitCode}");
            }

            return (success, success ? output : error);
        }
        catch (Exception ex)
        {
            log?.Invoke($"Exception running git: {ex.Message}");
            return (false, ex.Message);
        }
    }

    public async Task<string> GetRepoRootAsync(string repoPath, Action<string>? log = null)
    {
        try
        {
            var output = await ExecuteGitCommandAsync(repoPath, "rev-parse --show-toplevel", log);
            return output.Trim();
        }
        catch
        {
            return repoPath;
        }
    }
}
