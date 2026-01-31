"""Import exported data into new Supabase project via REST API."""
import json
import os
import sys
import requests

NEW_URL = "https://stkwoqcrrecwzeajhhxi.supabase.co"
NEW_SERVICE_KEY = "sb_secret_9_uEFSNA4RjTinP2EbJlFg_nM9eJKCb"

# FK-safe order
TABLES = [
    "profiles",
    "clientes",
    "clientes_contact_info",
    "alert_rules",
    "cargas",
    "envios_processados",
    "carga_sales_orders",
    "carga_historico",
    "shipment_history",
    "tracking_master",
    "customer_assignments",
    "active_alerts",
    "notificacoes",
    "notification_queue",
    # "auth_attempts",  # skip - audit table, not critical
    "security_audit_log",
    "user_roles",
]

DATA_DIR = os.path.join(os.path.dirname(__file__), "migration_data")
BATCH_SIZE = 100

headers = {
    "apikey": NEW_SERVICE_KEY,
    "Authorization": f"Bearer {NEW_SERVICE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "resolution=merge-duplicates",
}

total_imported = 0
errors = []

for table in TABLES:
    filepath = os.path.join(DATA_DIR, f"{table}.json")
    if not os.path.exists(filepath):
        print(f"  {table}: no export file, skipping")
        continue

    with open(filepath, "r", encoding="utf-8") as f:
        rows = json.load(f)

    if not rows:
        print(f"  {table}: 0 rows (empty)")
        continue

    print(f"  {table}: importing {len(rows)} rows...", end=" ", flush=True)
    imported = 0
    for i in range(0, len(rows), BATCH_SIZE):
        batch = rows[i : i + BATCH_SIZE]
        try:
            resp = requests.post(
                f"{NEW_URL}/rest/v1/{table}",
                headers=headers,
                json=batch,
                timeout=60,
            )
            if resp.status_code in (200, 201):
                imported += len(batch)
            else:
                err_msg = resp.text[:200]
                errors.append(f"{table} batch {i}: {resp.status_code} {err_msg}")
                print(f"\n    ERROR batch {i}: {resp.status_code} {err_msg}")
        except Exception as e:
            errors.append(f"{table} batch {i}: {e}")
            print(f"\n    ERROR batch {i}: {e}")

    print(f"{imported} OK")
    total_imported += imported

print(f"\nTotal imported: {total_imported} rows")
if errors:
    print(f"\n{len(errors)} errors:")
    for e in errors:
        print(f"  - {e}")
else:
    print("No errors!")
