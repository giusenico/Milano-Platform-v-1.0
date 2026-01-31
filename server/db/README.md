# DB Migrations

This folder contains idempotent SQL migrations for the SQLite database in `Pulizia_Dati/immobiliari_milano.db`.

Apply (safe to re-run):

```bash
sqlite3 Pulizia_Dati/immobiliari_milano.db < server/db/migrations/001_schema_improvements.sql
```

Notes:
- The migration creates views for normalized NIL and price data and adds indexes/unique constraints.
- Re-run after importing new data to keep query performance consistent.
