# ResearchReel — Database Migration & Rollback Guide

This document describes how to run, verify, and roll back database migrations in the ResearchReel production environment.

## Overview
ResearchReel uses `node-pg-migrate` for PostgreSQL schema migrations. The migration files are stored in `backend/migrations/`.

---

## 1. Running Migrations
To execute all pending migrations against the configured database:

```bash
# Set DATABASE_URL if running manually (usually injected by hosting provider)
export DATABASE_URL="postgresql://user:password@host:port/database"

# Run all migrations up
npm run migrate up
```

---

## 2. Verification Procedure
After running a migration, verify the database schema by connecting to PostgreSQL and checking the table definitions and the migrations history table:

```sql
-- View all applied migrations
SELECT * FROM pgmigrations;
```

---

## 3. Rollback Procedure
If a migration fails or causes unexpected production issues, you can revert it.

### Reverting the Last Single Migration
To roll back the most recent migration step:

```bash
npm run migrate down
```

### Reverting Multiple Migration Steps
To revert multiple steps back (e.g., 2 steps):

```bash
npm run migrate down 2
```

### Force Re-running Migrations
If the schema became desynchronized, manually reconcile the `pgmigrations` table or restore from the latest backup before running the migration again.

> [!WARNING]
> Never manually drop production tables. Always use the `migrate down` tool or restore a database snapshot.
