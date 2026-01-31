"""Export all data from old Supabase via export-data Edge Function."""
import json
import os
import requests

OLD_URL = "https://aldwmdfveivkfxxvfoua.supabase.co"
OLD_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFsZHdtZGZ2ZWl2a2Z4eHZmb3VhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkyMjIxMzksImV4cCI6MjA3NDc5ODEzOX0.uo82xCuNAN9wb6QpbBDxdHNruRCzwRuup6VxgEjvlKM"

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
    "auth_attempts",
    "security_audit_log",
    "user_roles",
]

DATA_DIR = os.path.join(os.path.dirname(__file__), "migration_data")
os.makedirs(DATA_DIR, exist_ok=True)

headers = {
    "apikey": OLD_ANON_KEY,
    "Authorization": f"Bearer {OLD_ANON_KEY}",
    "Content-Type": "application/json",
}

total = 0
for table in TABLES:
    print(f"Exporting {table}...", end=" ", flush=True)
    try:
        resp = requests.post(
            f"{OLD_URL}/functions/v1/export-data",
            headers=headers,
            json={"table": table},
            timeout=120,
        )
        resp.raise_for_status()
        result = resp.json()
        rows = result.get("data", [])
        count = result.get("count", len(rows))

        with open(os.path.join(DATA_DIR, f"{table}.json"), "w", encoding="utf-8") as f:
            json.dump(rows, f, ensure_ascii=False, indent=2)

        print(f"{count} rows")
        total += count
    except Exception as e:
        print(f"ERROR: {e}")

print(f"\nTotal: {total} rows exported to {DATA_DIR}")
