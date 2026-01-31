# Clean SQL Schema Generation - Summary

## Overview

Successfully generated a clean SQL schema (`full_schema.sql`) by extracting the REAL final schema from the old Supabase project's PostgREST OpenAPI endpoint, avoiding the circular dependencies present in the migration files.

## Process

1. **Fetched OpenAPI Spec**: Retrieved the schema definitions from `https://aldwmdfveivkfxxvfoua.supabase.co/rest/v1/`
2. **Parsed Table Definitions**: Extracted 17 table schemas with column types, defaults, and constraints
3. **Generated Clean SQL**: Created a single, runnable SQL file with proper ordering and no circular dependencies

## Generated Schema Details

### Tables (17 total)
In dependency order:
1. `profiles` - User profile information
2. `user_roles` - User role assignments (uses app_role enum)
3. `clientes` - Customer master data
4. `clientes_contact_info` - Customer contact information (FK to clientes)
5. `customer_assignments` - User-customer assignments
6. `alert_rules` - Alert rule definitions
7. `active_alerts` - Active system alerts (FK to alert_rules)
8. `envios_processados` - Processed shipments/sales orders
9. `cargas` - Cargo/shipment consolidations
10. `carga_sales_orders` - N:N link between cargas and SOs
11. `carga_historico` - Cargo event history
12. `shipment_history` - Shipment status history
13. `tracking_master` - Tracking number master table
14. `notificacoes` - Sent notifications
15. `notification_queue` - Notification queue (SERIAL id)
16. `auth_attempts` - Authentication attempt tracking
17. `security_audit_log` - Security audit trail

### Indexes (24 total)
- Performance indexes on frequently queried columns
- Foreign key indexes for join optimization
- Status and date indexes for filtering
- GIN index on JSONB columns (cargas.invoices)

### Foreign Keys (2 total)
- `active_alerts.rule_id` → `alert_rules.id`
- `clientes_contact_info.cliente_id` → `clientes.id`

### Triggers (7 total)
Automatic `updated_at` timestamp updates on:
- tracking_master
- alert_rules
- profiles
- envios_processados
- clientes_contact_info
- clientes
- cargas

### Functions (4 total)
1. `update_updated_at_column()` - Trigger function for auto-updating timestamps
2. `has_role(_user_id, _role)` - Check if user has a specific role
3. `cleanup_old_auth_attempts()` - Remove auth attempts older than 30 days
4. `backfill_shipment_history()` - Backfill shipment history from envios_processados

### Enum Types (1 total)
- `app_role` - 'admin' | 'user'

## Key Features

✓ **No circular dependencies** - Tables created in proper dependency order
✓ **No auth.users references** - Schema is auth-agnostic (can add auth later)
✓ **No RLS policies** - RLS is enabled but policies not created (service_role bypasses)
✓ **IF NOT EXISTS everywhere** - Safe to run multiple times
✓ **Proper type mappings** - UUID, TIMESTAMP WITH TIME ZONE, JSONB, etc.
✓ **Default values** - Correct defaults from OpenAPI spec
✓ **Complete indexes** - All performance indexes from migrations
✓ **Helper functions** - Application support functions included

## Type Mappings Applied

| OpenAPI Format | PostgreSQL Type |
|----------------|-----------------|
| `uuid` | `UUID` |
| `text` | `TEXT` |
| `integer` | `INTEGER` |
| `number` | `NUMERIC` |
| `boolean` | `BOOLEAN` |
| `timestamp with time zone` | `TIMESTAMP WITH TIME ZONE` |
| `timestamp without time zone` | `TIMESTAMP WITHOUT TIME ZONE` |
| `jsonb` | `JSONB` |
| `public.app_role` | `public.app_role` (enum) |

## Special Handling

1. **notification_queue.id** - Uses SERIAL instead of UUID (only table with integer PK)
2. **user_roles.role** - Uses `public.app_role` enum type instead of TEXT
3. **Boolean defaults** - `is_at_warehouse` and `is_delivered` default to false
4. **cargas dates** - Mix of `TIMESTAMP WITH TIME ZONE` and `WITHOUT TIME ZONE` (preserved from original)

## Usage

To apply this schema to a new Supabase project:

1. Go to Supabase SQL Editor
2. Copy the entire contents of `full_schema.sql`
3. Paste and run in one go
4. Verify all tables, indexes, and functions are created

The schema is idempotent - safe to run multiple times due to `IF NOT EXISTS` clauses.

## Files Generated

- `full_schema.sql` (392 lines) - Complete runnable schema
- `generate_schema.py` - Python script that generates the schema
- `openapi_spec.json` - Cached OpenAPI spec from old project

## Next Steps

After applying the schema:

1. Run the data migration script to import data from JSON files
2. Add RLS policies if needed for auth-enabled access
3. Create Edge Functions if they don't exist yet
4. Test the migration with a few sample records

## Notes

- This schema does NOT include storage buckets or auth configuration
- Edge Functions must be deployed separately
- The schema is designed to work with service_role_key (bypasses RLS)
- For production, add appropriate RLS policies based on your auth setup
