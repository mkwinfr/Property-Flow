# Delivery roadmap

## Phase 1 — foundation and core turn workflow (delivered)

- Local SQLite persistence and migrations.
- Cookie sessions and server-enforced permissions.
- Property context, unit index, operational dashboard.
- Versioned make-ready templates.
- Transactional turn creation and item snapshots.
- Responsive make-ready board and turn workspace.

## Phase 2 — operational depth (delivered)

- Move-out inspections with a centralized checklist, responsibility and cost capture, and transactional make-ready generation.
- Property-scoped work-order queue with priority, assignment, due dates, and status transitions.
- Unit appliance records, inventory ledger adjustments with stock guards, and vendor directory with workload context.
- Local filesystem attachments with database metadata and a future object-storage boundary.
- Pool chemistry logs with server-side exception rules and manager notifications.
- Responsive operations control center and notification inbox.

Additional operational depth now delivered: item-level Make Ready material consumption, reversible inventory ledger corrections, whole-turn cost summaries, vendor quote/approval/invoice/payment tracking, financial-document attachments, and inventory reorder/receive workflows.

Remaining enhancements moved forward: pool schedules/trends/export, richer attachment captions, purchasing exports, and accounting-system integration.

## Phase 3 — administration and collaboration

- User, role, permission, and property-scope administration.
- Technician **My Work** assignment queue and manager team-workload view (delivered), with assignment and rework notifications.
- Make Ready blocker coordination (delivered), with structured blocker details, manager escalation queue, resolution history, and cross-department notifications.
- Notification preferences (the core notification inbox is delivered).
- Saved views, global search, reporting, and audit log.
- Optional location reporting with explicit consent/retention controls.

## Phase 4 — migration and hosted readiness

- Analyze and export the legacy PostgreSQL data without modifying it.
- Transform into versioned import bundles; dry-run and reconcile counts.
- Add PostgreSQL persistence, backups, secrets, TLS, and observability.
- Reconnect the stable Cloudflare hostname and replace or simplify Launcher V2.
