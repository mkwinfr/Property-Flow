# Legacy data migration plan

Migration is intentionally deferred until the new domain model stabilizes. The reference data remains valuable and should not be manually recreated.

## Proposed process

1. Freeze a read-only export of the reference PostgreSQL database and record source migration versions.
2. Profile counts, nullability, duplicate natural keys, orphaned relationships, and enum values.
3. Define an explicit mapping from legacy `Apartment`, `Turn`, template, task, punch, inspection, appliance, pool-log, identity, and audit records.
4. Import into a disposable new database using stable legacy-ID mapping tables.
5. Reconcile record counts and domain totals; produce a human-readable exception report.
6. Have the property manager validate representative units and turns.
7. Rehearse the migration, measure downtime, then perform a final cutover with rollback artifacts retained.

No migration script should connect to or mutate the source database. Export and import are separate operations.

