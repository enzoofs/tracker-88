# How to Apply the Clean Schema to New Supabase Project

## Prerequisites

- New Supabase project created
- Access to Supabase SQL Editor
- Service role key configured in your `.env` file

## Step-by-Step Instructions

### 1. Open Supabase SQL Editor

1. Go to your new Supabase project dashboard
2. Navigate to **SQL Editor** in the left sidebar
3. Click **New Query**

### 2. Apply the Schema

1. Open `full_schema.sql` in your text editor
2. Copy the entire contents (392 lines)
3. Paste into the SQL Editor
4. Click **Run** (or press Ctrl+Enter)

### 3. Verify Installation

Run this verification query:

```sql
-- Count tables
SELECT COUNT(*) as table_count
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE';
-- Should return: 17

-- List all tables
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- Count indexes
SELECT COUNT(*) as index_count
FROM pg_indexes
WHERE schemaname = 'public';
-- Should return: 24+ (includes auto-created primary key indexes)

-- List functions
SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_type = 'FUNCTION';
-- Should return: update_updated_at_column, has_role, cleanup_old_auth_attempts, backfill_shipment_history

-- Check enum type
SELECT typname, enumlabel
FROM pg_type t
JOIN pg_enum e ON t.oid = e.enumtypid
WHERE typname = 'app_role';
-- Should return: admin, user
```

### 4. Expected Results

After successful execution, you should see:

- **17 tables** created
- **24+ indexes** created (including auto-generated PK indexes)
- **4 functions** created
- **1 enum type** created (app_role)
- **7 triggers** created
- **RLS enabled** on all tables

### 5. Common Issues & Solutions

#### Issue: "type already exists"
**Solution**: The schema uses `DO $$ BEGIN ... EXCEPTION ... END $$` to handle this gracefully. Safe to ignore.

#### Issue: "relation already exists"
**Solution**: Schema uses `IF NOT EXISTS` everywhere. Safe to re-run.

#### Issue: Timeout
**Solution**: The schema is large. If it times out:
1. Run in sections (tables first, then indexes, then functions)
2. Or increase timeout in Supabase settings

### 6. Post-Installation Steps

#### A. Verify Data Types

```sql
-- Check critical columns have correct types
SELECT
    table_name,
    column_name,
    data_type,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('envios_processados', 'cargas', 'user_roles')
  AND column_name IN ('id', 'role', 'data_envio', 'invoices')
ORDER BY table_name, column_name;
```

Expected:
- `envios_processados.id`: UUID with default gen_random_uuid()
- `envios_processados.data_envio`: timestamp with time zone
- `cargas.invoices`: jsonb
- `user_roles.role`: USER-DEFINED (app_role enum)

#### B. Test Functions

```sql
-- Test has_role function (will fail gracefully if no data)
SELECT public.has_role('00000000-0000-0000-0000-000000000000'::uuid, 'admin'::public.app_role);
-- Should return: false

-- Test cleanup function
SELECT public.cleanup_old_auth_attempts();
-- Should return: (empty - no error)
```

#### C. Insert Test Data

```sql
-- Test insert into a simple table
INSERT INTO public.clientes (nome, endereco)
VALUES ('Test Cliente', 'Test Address')
RETURNING *;

-- Verify auto-generated UUID and timestamps
SELECT id, created_at, updated_at FROM public.clientes WHERE nome = 'Test Cliente';

-- Clean up test data
DELETE FROM public.clientes WHERE nome = 'Test Cliente';
```

### 7. Ready for Migration

Once schema is verified:

1. Run `python migrate_supabase.py` to import data from JSON files
2. Verify data imported correctly
3. Test Edge Functions if needed
4. Update frontend `.env` with new Supabase URL and keys

## Troubleshooting

### Schema won't apply

1. Check PostgreSQL version (must be 14+)
2. Verify you're in the SQL Editor, not the Table Editor
3. Ensure no other migrations are running

### Missing tables after application

1. Check for error messages in SQL Editor output
2. Verify RLS is not blocking your view (use service_role_key)
3. Query system tables to confirm creation:
   ```sql
   SELECT * FROM pg_tables WHERE schemaname = 'public';
   ```

### Performance issues

The schema is optimized with indexes. If you experience slowness:

1. Run `ANALYZE;` to update statistics
2. Check index usage with `pg_stat_user_indexes`
3. Consider adding more indexes based on query patterns

## Next Steps

After schema is successfully applied:

1. ✓ Verify schema structure
2. ⏭ Run data migration (`migrate_supabase.py`)
3. ⏭ Deploy Edge Functions
4. ⏭ Update frontend environment variables
5. ⏭ Test application end-to-end

## Support

If you encounter issues:

1. Check Supabase logs in dashboard
2. Review PostgreSQL error messages
3. Verify service_role_key has proper permissions
4. Consult `SCHEMA_GENERATION_SUMMARY.md` for schema details
