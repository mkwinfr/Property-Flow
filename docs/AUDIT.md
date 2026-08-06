# Reference application audit

Audit source: `C:\Users\Server\Property-Flow` working tree as found on 2026-08-01. The source repository had uncommitted frontend work and was inspected read-only.

## System inventory

The reference system contains:

- Legacy `Property Flow Tech`: React 19 + Vite PWA for technicians and managers.
- Legacy `Property Flow Backend`: Express 5 + Prisma + PostgreSQL API.
- `Launcher V2`: Electron service launcher for the frontend, backend, webhook receiver, and Cloudflare tunnel.
- A webhook-based Git pull utility, archived references, seed data, UI snapshots, and duplicate documentation.

Implemented or partially implemented domains include properties, buildings, floor plans, apartments, appliances, work orders, make-ready turns, punch lists, inventory consumption, vendors, move-out inspections, notifications, GPS reporting, pool logs, users, departments, roles, and permissions.

## Principal findings

### 1. Template ownership is split across three places

Punch definitions exist in frontend TypeScript/JSON, backend TypeScript/JSON, and database rows. The frontend seeds them after authentication and retries seeding from the create-turn wizard. A backend endpoint deletes and recreates a template's items from a client payload. Normal user activity therefore performs deployment/data-administration work and multiple clients can race.

Decision: the server owns versioned templates. Publishing a template creates an immutable version. Creating a turn copies that version into turn-item snapshots in the same database transaction. Existing turns never change when a template is edited.

### 2. Authorization is mostly presentation-level

The frontend hides or disables selected controls, but many reference API routes—including apartments, buildings, properties, work orders, turn workflows, move-out inspections, and admin endpoints—lack authentication or permission middleware. Several destructive actions reuse unrelated keys such as `WORKORDERS_CREATE` for deleting a turn. The legacy `UserRole` enum coexists with relational roles, which creates two sources of authority.

Decision: every API operation declares a domain permission and optional property scope. UI checks improve usability only; the API is authoritative. One role-assignment model replaces parallel role fields.

### 3. Route components own transport and workflow logic

Large React components call `fetch` directly, retrieve tokens repeatedly from `localStorage`, normalize inconsistent response shapes, contain fallback/seed behavior, and manage domain transitions. Navigation uses global DOM events rather than routes. This increases coupling and makes workflows difficult to test.

Decision: use URL routing, a typed API client, query hooks, feature modules, and server-side application services. Authentication uses an HTTP-only session cookie rather than browser-readable bearer tokens.

### 4. Domain concepts overlap

The schema has both `TurnTask` and `PunchListItem`, several status enums for similar work, duplicated `propertyId`/`unitId`/`apartmentId` concepts, and denormalized property/building strings retained beside foreign keys. Two turn route modules expose overlapping paths and behavior.

Decision: use a bounded turn workflow with one actionable `turn_items` aggregate initially. Specialized work orders can reference a turn item later without duplicating its lifecycle. Use `unit` consistently in the new system and map legacy apartments during migration.

### 5. Local and hosted operation are intertwined

The frontend defaults to a production API URL, while local launch requires several services. Cloudflare configuration, local ports, process supervision, Git webhook behavior, and product runtime are coupled in the launcher.

Decision: the rebuilt product runs as one API process plus one Vite process in development and one API-hosted bundle in production. Launcher/tunnel support becomes deployment configuration, not application behavior.

### 6. Operational quality gates are missing

Reference documentation describes planned tests and layered services, but no test suite exists and much logic remains in routes. Debug logging and fallback behavior are extensive. Checked-in dependencies, backup components, stale CSS, and duplicated documentation add noise.

Decision: type checking, unit/integration tests, build verification, structured errors, audit events, and migration checks are part of each feature slice.

## Valuable behavior to preserve

- Property-aware apartment/unit index and unit details.
- Make-ready board with move dates, ready targets, priority, progress, review, rejection, and activity history.
- Floor-plan-aware template selection.
- Punch item assignment, notes, completion, inventory usage, and cost visibility.
- Move-out inspection leading into make-ready work.
- Appliances, pool logs, notifications, user administration, and property-scoped access.
- Mobile-friendly technician workflows alongside denser manager views.

## Deferred from the first vertical slice

Legacy data import, Cloudflare tunnel wiring, Electron service control, webhook auto-pull, live GPS, chat/Ollama, PDF parity, inventory purchasing, vendor billing, and hosted object storage are documented migration phases—not silently discarded features. Local attachment storage is now implemented.
