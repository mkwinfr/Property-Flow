# Architecture

## Shape

Property Suite is a modular monolith:

```text
React client -> HTTP API -> application services -> repository ports -> SQLite
                                                          later -> PostgreSQL
```

This is intentionally one deployable product, not one undifferentiated codebase. Domain modules own their commands, queries, policies, and persistence operations. The browser never accesses the data file directly.

## Persistence

SQLite is the local persistence provider. Foreign keys, write-ahead logging, transactions, migration versions, and an explicit database path provide durable local behavior. Repository boundaries and portable identifiers keep a future PostgreSQL adapter practical.

Development bootstrap data is applied once to a new local database. It is not run at login and is not part of turn creation.

## Template lifecycle

```text
Draft template -> publish immutable version -> create turn from version
                                           -> snapshot items into the turn
```

A turn stores the template version it originated from plus independent item snapshots. Template changes affect only future turns. The create operation inserts the turn, all item snapshots, and its initial activity event atomically.

## Inspection-to-turn lifecycle

```text
Draft inspection -> assess centralized checklist -> complete -> generate turn -> locked inspection
                                                           -> append findings as turn-item snapshots
```

Inspection findings are the source record for observed condition, responsibility, and estimated resident cost. Turn generation is idempotent and transactional: the published floor-plan template, finding snapshots, inspection link, lock, and activity records commit together or not at all. This avoids maintaining a separate inspection work list that drifts from make-ready work.

## Operational records

- Inventory changes are ledger entries with actor, reason, cost snapshot, and quantity delta. Database guards prevent negative stock even if a future caller bypasses the application service.
- Make Ready material usage is linked to the originating scope item. Corrections restore stock through a linked reversal entry rather than deleting financial history.
- Vendor quote, approval, invoice, and payment state belongs to the Make Ready as a whole. The cost summary uses the most authoritative available amount (invoice, then approval, then quote) and keeps inspection-derived resident charges visibly separate.
- Technician turn responses pass through a server-side financial-redaction boundary. Scope, material quantities, vendor coordination, notes, and status remain available while costs, invoices, payment state, resident charges, and financial documents are restricted.
- The My Work API returns only active Make Readies assigned to the authenticated user. A separate manager workload API requires review permission and aggregates assigned, overdue, urgent, blocked, rework, and unassigned work.
- Make Ready blockers are recorded as auditable episodes linked to scope items. Active blockers feed a manager-only property queue; opening a blocker notifies property reviewers, while resolution records the outcome, resumes the item, and notifies the lead technician when another department clears it.
- Inventory reorders move through requested, ordered, received, or cancelled states. Receiving is transactional: it closes the reorder, increases on-hand stock, and records the delivery in the inventory ledger together.
- Pool compliance limits are evaluated by the server. Exceptions create manager notifications rather than depending on a page remaining open.
- Attachment metadata lives in SQLite while file bytes use a local provider under `.data/attachments`. The API boundary allows an object-storage provider to replace it later.
- Appliance records belong to units; work orders, vendors, inspections, inventory, and pool logs belong to the active property scope.

## Authorization

Permissions use `domain:action` keys, for example `turns:create` and `units:update`. Role assignments may be organization-wide or scoped to one property. The API resolves effective permissions for the requested resource and denies by default. Client-side guards only explain or hide unavailable actions.

## Auditability

State-changing commands append an activity event with actor, entity, action, timestamp, and structured detail. This event history is operational context, not a replacement for database backups.

## Module boundaries

- Identity: users, sessions, roles, permissions, scoped assignments.
- Portfolio: properties, buildings, floor plans, and units.
- Turns: templates, template versions, turns, turn items, and review transitions.
- Maintenance: work orders, inventory, vendors, and appliances.
- Inspections: move-out inspections and media metadata.
- Compliance: pool logs and required readings.
- Platform: notifications, activity/audit events, attachments, and settings.

## Client form controls

- All single-choice dropdowns use the shared `AppSelect` component. Native `select`, `option`, and `optgroup` markup is intentionally prohibited by a regression test so future forms inherit consistent styling, search, grouping, disabled options, keyboard navigation, and dismissal behavior.
- Multi-choice fields use a purpose-built checkbox popover such as the Work Order Areas control.
- Text inputs, textareas, date controls, custom select triggers, and multi-select triggers share the same application form typography.
