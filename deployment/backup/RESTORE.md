# Property Suite backup and restore

Backups are written beneath `C:\PropertySuite\backups`:

- `database` contains transactionally consistent SQLite database files.
- `attachments` contains matching attachment archives when attachments exist.
- `manifests` contains timestamps, file sizes, SHA-256 hashes, and integrity results.

The scheduled task `\PropertySuite Daily Backup` runs every day at 2:00 AM. Missed runs start when the server is next available. Files older than 30 days are removed only from the three backup output directories.

## Verify the latest backup

```powershell
Get-ChildItem 'C:\PropertySuite\backups\manifests' -File |
  Sort-Object LastWriteTimeUtc -Descending |
  Select-Object -First 1 |
  Get-Content

schtasks.exe /Query /TN '\PropertySuite Daily Backup' /V /FO LIST
```

## Restore procedure

Restoring replaces production data, so it should only be done after choosing and validating the exact manifest and backup timestamp.

1. Stop `PropertySuite` from the Service Control launcher. The Cloudflare Tunnel may remain running and will temporarily return a gateway error.
2. Copy `C:\PropertySuite\data\property-suite.db` to a dated rollback filename outside the `data` directory.
3. Verify the selected backup database SHA-256 against its matching manifest.
4. Copy the selected `.db` backup to `C:\PropertySuite\data\property-suite.db`.
5. If the matching attachment archive exists, extract it into a temporary directory, inspect it, and then replace `C:\PropertySuite\data\attachments`.
6. Start `PropertySuite` and verify `http://127.0.0.1:4100/api/health` before testing the public application.

Do not restore a database while the application service is running.
