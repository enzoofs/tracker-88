# Supabase Migration — Summary

## Files Created

### Main Script
- **`migrate_supabase.py`** — Main migration script (517 lines)
  - Generates consolidated schema SQL
  - Exports data from old project via REST API
  - Imports data to new project via REST API
  - Handles pagination, batching, retries, errors

### Supporting Files
- **`test_migration_connection.py`** — Connection tester (validates credentials)
- **`full_schema.sql`** — Generated schema (88KB, 39 migrations consolidated)
- **`migration_data/`** — Directory for exported JSON files (one per table)
- **`README_MIGRATION.md`** — Detailed usage guide
- **`.env.migration.example`** — Credential reference

## Quick Start

```bash
# 1. Test connections
python scripts/test_migration_connection.py

# 2. Generate schema SQL
python scripts/migrate_supabase.py --schema-only

# 3. Apply schema manually in Supabase SQL Editor
# (Copy/paste full_schema.sql)

# 4. Export data from old project
python scripts/migrate_supabase.py --export-only

# 5. Import data to new project
python scripts/migrate_supabase.py --import-only
```

## Technical Details

### Schema Migration
- Reads 39 migration files from `supabase/migrations/`
- Concatenates in chronological order (sorted by filename timestamp)
- Outputs single `full_schema.sql` file
- **Manual step**: User must paste into Supabase SQL Editor

### Data Export
- Uses old project anon key (subject to RLS)
- Queries via `GET /rest/v1/{table}?select=*`
- Pagination: 1000 rows per request (uses Range header)
- Saves to `migration_data/{table}.json`
- Handles missing tables gracefully (404 = skip)

### Data Import
- Uses new project service role key (bypass RLS)
- POSTs to `/rest/v1/{table}`
- Batches: 100 rows per request
- Uses `Prefer: resolution=merge-duplicates` for upsert
- Continues on error (doesn't abort entire migration)

### Table Order (FK Dependencies)
1. profiles
2. clientes
3. clientes_contact_info
4. alert_rules
5. cargas
6. envios_processados
7. carga_sales_orders
8. carga_historico
9. shipment_history
10. tracking_master
11. customer_assignments
12. active_alerts
13. notificacoes
14. notification_queue
15. auth_attempts
16. security_audit_log
17. user_roles

### Error Handling
- Retry logic for 429, 500, 502, 503, 504 (3 retries, exponential backoff)
- Connection timeout: 30s (export), 60s (import)
- Continues on batch import failure (logs error, moves to next batch)
- UTF-8 encoding handled automatically on Windows

### Statistics Tracking
- Rows exported per table
- Rows imported per table
- Error count and messages
- Total elapsed time
- Summary printed at end

## Credentials (Hardcoded in Script)

```python
# Old project (source)
OLD_PROJECT_URL = "https://aldwmdfveivkfxxvfoua.supabase.co"
OLD_ANON_KEY = "eyJ..."

# New project (destination)
NEW_PROJECT_URL = "https://stkwoqcrrecwzeajhhxi.supabase.co"
NEW_ANON_KEY = "sb_publishable_..."
NEW_SERVICE_ROLE_KEY = "sb_secret_..."
```

**⚠️ Security Note**: Service role key is hardcoded. Never commit this to git. Consider using environment variables for production use.

## Known Limitations

1. **Schema must be applied manually** — No automated SQL execution (Supabase doesn't expose SQL endpoint for anon/service keys via REST API)

2. **RLS on export** — Export uses anon key, so subject to old project's RLS policies. If data is not readable by anon role, it won't export. Use service role if needed (edit script).

3. **No rollback** — If import fails partway, there's no automatic rollback. You'd need to manually delete imported data or drop/recreate the new project.

4. **No data transformation** — Migrates data as-is. If schema changes require data transformation, you'll need to do that separately.

5. **No auth.users migration** — Only public schema tables are migrated. Supabase auth.users table is not accessible via REST API. If you need to migrate users, use Supabase dashboard export/import for auth.

6. **Sequences/IDs** — If tables have SERIAL/BIGSERIAL columns, sequences will reset to max(id) + 1 automatically on first insert after migration. But if you have specific sequence values, you may need to reset them manually.

## Testing Status

- ✅ Schema generation tested (39 migrations, 88KB output)
- ✅ Connection test validated (all 3 connections OK)
- ⚠️ Export NOT yet tested (needs old project to have data)
- ⚠️ Import NOT yet tested (needs schema applied to new project first)

## Next Steps

1. Apply schema to new project (paste `full_schema.sql` into SQL Editor)
2. Run export to verify old project data is accessible
3. Review exported JSON files in `migration_data/`
4. Run import to migrate data
5. Verify data in new project dashboard
6. Test application against new project
7. Update application config to point to new project URL/keys

## Troubleshooting

See `README_MIGRATION.md` for detailed troubleshooting guide.

Common issues:
- **404 on export**: Table doesn't exist in old project (normal, script skips it)
- **401 on export**: RLS blocking anon key (use service role in script)
- **401 on import**: Wrong service role key
- **Timeout on large tables**: Reduce batch sizes in script
- **UTF-8 errors**: Script handles Windows encoding automatically

## Files to .gitignore

Add to `.gitignore`:

```
scripts/migration_data/
scripts/full_schema.sql
scripts/.env.migration
```

The script and README should be committed. Exported data and generated schema should NOT be committed.
