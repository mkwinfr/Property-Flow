# Property Suite product roadmap

Property Suite is delivered as three applications on one platform:

1. **Main App (Phase 1 — current)** — staff workspace for property managers, maintenance, leasing, and back office.
2. **Resident Portal (Phase 2)** — resident and applicant self-service.
3. **Admin Ops (Phase 3)** — platform operator / IT control panel for hosted multi-tenant deployments.

## Phase 1 — Main App

### 1.0 Foundation (delivered)

- Property Suite branding and documentation
- Shared contracts split by domain
- Incremental repository layer (turns, units, work orders)
- Granular financial permissions (`financial:view`, `financial:edit`, `purchasing:manage`)
- Launcher/Ollama operational visibility
- ESLint and expanded permission tests
- Operations and turns service modularization

### 1.1 Complete operational core (delivered)

- Saved views API and UI on Make Ready and work orders
- Recurring maintenance jobs UI in Operations, run-due work order generation
- Move-in inspection types (`move_in`, `move_in_final`)
- Pool log CSV export
- Audit log UI (`/audit`)
- Notification preferences API and staff UI

### 1.2 People and units (delivered)

- Resident and household records with create UI
- Lease records with occupancy linkage and create UI
- Work orders and turns linked to residents (`resident_id`)
- Residents & leases UI (`/residents`)

### 1.3 Leasing and CRM (delivered)

- Prospect pipeline with stage tracking and create/advance UI
- Tours and rental applications with scheduling and status UI
- Leasing workspace UI (`/leasing`)

### 1.4 Communications (delivered)

- Message templates and campaigns with create UI
- Audience targeting (residents, active leases, prospects)
- In-app delivery logs and campaign send
- Communications UI (`/communications`)

### 1.5 Financial and back office (delivered)

- Resident charges ledger
- Rent roll view and CSV export
- Executive dashboard metrics
- Accounting export boundary with snapshot history
- Financial workspace UI (`/financial`)

### 1.6 Scale (delivered)

- Portfolio rollup API and dashboard toggle (`GET /api/portfolio/summary`)
- Per-property module toggles (`property_modules`, nav filtering, Platform admin UI)
- Organizations table and default org seed
- PostgreSQL migration boundary: export/import scripts, connection validation, `scripts/postgres-init.sql`
- OIDC SSO login flow (`/api/auth/sso/login`, `/api/auth/sso/callback`)
- `platform:manage` permission for platform operators

Runtime note: day-to-day operations continue on SQLite; PostgreSQL is the hosted migration target via `npm run db:export` and `npm run db:import-postgres`.

## Phase 2 — Resident Portal (in progress)

- Resident account auth with session cookies (`/portal`)
- Portal shell with sidebar navigation, mobile bottom nav, and property context
- Maintenance self-service: submit requests, open/history lists, detail view with access info
- Maintenance photo attachments on work order detail
- Self-service: charges, application status
- Documents hub with Lease, Application, and Send to office subtabs
- Residents can upload documents (PDF/photos) to management via portal
- Lease documents (read-only in portal; staff upload on lease records)
- Community messages inbox with read tracking
- Household pets CRUD
- Portal → staff work order workflow (submission source, manager notifications, portal badge/filter)
- Portal module toggle per property
- Demo account: `taylor.brooks@example.com` / `propertysuite`

**Still planned:** Payments, full online applications, lease signing, email/push notifications on status changes

## Phase 3 — Admin Ops (foundation delivered)

- Platform health dashboard (`/platform-admin`)
- Staff user listing and role assignment API
- Organization summary and platform audit events table
- Module toggle management per property

**Still planned:** Billing, cross-tenant support tools, impersonation, feature flags

See [ROADMAP.md](./ROADMAP.md) for delivered feature history from the rebuild.
