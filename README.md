# Property Suite

Property Suite is a ground-up rebuild of the legacy property operations application in `C:\Users\Server\Property-Flow`. The reference repository remains unchanged and is treated as the behavioral source of truth.

The current local release includes property-scoped authentication, make-ready turns, work orders, move-out inspections, unit appliances, inventory, vendors, pool compliance logs, notifications, and filesystem-backed attachments. It preserves a browser/API boundary so the same application can later be hosted for multiple users and moved to PostgreSQL without replacing the user interface or domain workflows.

## Local development

Requirements: Node.js 22 or newer.

```powershell
npm install
npm run dev
```

Open `http://localhost:5173`. The API runs at `http://localhost:4000`; Vite proxies `/api` requests during development.

The local database is created at `.data/property-suite.db`, with uploaded files stored under `.data/attachments`. Both contain deliberately fictional development data and can be backed up or replaced independently from the application.

## Verification

```powershell
npm run typecheck
npm test
npm run build
```

## Documentation

- [Audit findings](docs/AUDIT.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Delivery roadmap](docs/ROADMAP.md)
- [Legacy data migration](docs/DATA_MIGRATION.md)
- [Launcher and Cloudflare follow-up](docs/DEPLOYMENT_FOLLOW_UP.md)
