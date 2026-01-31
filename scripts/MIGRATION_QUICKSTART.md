# Supabase Migration — Quick Start

## 🚀 One-Command Migration (Windows)

```cmd
scripts\migrate.bat
```

Interactive menu with all operations.

---

## 📋 Step-by-Step (Command Line)

### Prerequisites
```bash
pip install requests
```

### Step 1: Test Connections
```bash
python scripts/test_migration_connection.py
```
✅ All 3 connections must be OK before proceeding.

### Step 2: Generate Schema
```bash
python scripts/migrate_supabase.py --schema-only
```
📄 Output: `scripts/full_schema.sql`

### Step 3: Apply Schema (MANUAL)
1. Open Supabase Dashboard for **NEW** project
2. Go to **SQL Editor**
3. Copy/paste `scripts/full_schema.sql`
4. Execute

### Step 4: Export Data
```bash
python scripts/migrate_supabase.py --export-only
```
📦 Output: `scripts/migration_data/*.json` (17 files)

### Step 5: Validate (Optional)
```bash
python scripts/validate_export.py
```
✅ Checks JSON integrity and counts rows.

### Step 6: Import Data
```bash
python scripts/migrate_supabase.py --import-only
```
🎉 Data migrated to new project!

---

## 📊 Expected Results

### Tables Migrated
17 tables in FK dependency order:
- profiles, clientes, clientes_contact_info, alert_rules
- cargas, envios_processados, carga_sales_orders
- carga_historico, shipment_history, tracking_master
- customer_assignments, active_alerts
- notificacoes, notification_queue
- auth_attempts, security_audit_log, user_roles

### Output Files
```
scripts/
  ├─ full_schema.sql           (90KB — apply manually)
  └─ migration_data/
      ├─ profiles.json
      ├─ clientes.json
      ├─ cargas.json
      └─ ... (14 more)
```

---

## ⚠️ Important Notes

1. **Schema first**: Apply `full_schema.sql` BEFORE importing data
2. **Service role key**: Import uses service role (bypasses RLS)
3. **No rollback**: No automatic undo. Backup new project first if needed.
4. **Auth users**: Not migrated (use Supabase dashboard export/import)
5. **Sequences**: Auto-reset to max(id) + 1 on first insert

---

## 🐛 Troubleshooting

### "404" on export
- **Cause**: Table doesn't exist in old project
- **Fix**: Normal — script skips it automatically

### "401" on import
- **Cause**: Wrong service role key
- **Fix**: Check `NEW_SERVICE_ROLE_KEY` in `migrate_supabase.py`

### Timeout on large tables
- **Fix**: Edit script, reduce `EXPORT_BATCH_SIZE` or `IMPORT_BATCH_SIZE`

### UTF-8 errors (Windows)
- **Fix**: Script handles automatically. If still fails:
  ```cmd
  set PYTHONIOENCODING=utf-8
  python scripts/migrate_supabase.py
  ```

---

## 📖 Full Documentation

- **README_MIGRATION.md** — Detailed usage guide
- **MIGRATION_SUMMARY.md** — Technical details
- **migrate_supabase.py** — Main script (well-commented)

---

## 🔐 Credentials

Hardcoded in `migrate_supabase.py`:

```python
OLD_PROJECT_URL = "https://aldwmdfveivkfxxvfoua.supabase.co"
NEW_PROJECT_URL = "https://stkwoqcrrecwzeajhhxi.supabase.co"
```

⚠️ **Never commit service role keys to git**

---

## ✅ Checklist

- [ ] Test connections (`test_migration_connection.py`)
- [ ] Generate schema (`--schema-only`)
- [ ] Apply schema manually in SQL Editor
- [ ] Export data (`--export-only`)
- [ ] Validate exports (`validate_export.py`)
- [ ] Import data (`--import-only`)
- [ ] Verify data in new project dashboard
- [ ] Update app config (new URL/keys)
- [ ] Test application end-to-end

---

Need help? Check `README_MIGRATION.md` for detailed instructions.
