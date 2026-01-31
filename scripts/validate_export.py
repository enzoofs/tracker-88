#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Validate exported migration data.
Checks JSON files for integrity and provides statistics.
"""

import json
import sys
from pathlib import Path

# Fix Windows encoding
if sys.platform == "win32":
    import os
    os.environ["PYTHONIOENCODING"] = "utf-8"
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    if hasattr(sys.stderr, "reconfigure"):
        sys.stderr.reconfigure(encoding="utf-8")

SCRIPT_DIR = Path(__file__).parent.resolve()
DATA_DIR = SCRIPT_DIR / "migration_data"

# Tables expected
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


def validate_json_file(table: str) -> tuple[bool, int, str]:
    """
    Validate a JSON export file.
    Returns: (is_valid, row_count, error_message)
    """
    file_path = DATA_DIR / f"{table}.json"

    if not file_path.exists():
        return False, 0, "File not found"

    try:
        with open(file_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        if not isinstance(data, list):
            return False, 0, "Not a list"

        return True, len(data), ""

    except json.JSONDecodeError as e:
        return False, 0, f"JSON error: {e}"

    except Exception as e:
        return False, 0, f"Error: {e}"


def main():
    print("=" * 60)
    print("MIGRATION DATA VALIDATION")
    print("=" * 60)
    print(f"Data directory: {DATA_DIR}\n")

    if not DATA_DIR.exists():
        print(f"❌ Data directory does not exist: {DATA_DIR}")
        print("   Run migration export first.")
        sys.exit(1)

    total_rows = 0
    valid_tables = 0
    missing_tables = 0
    invalid_tables = 0

    results = []

    for table in TABLES:
        is_valid, row_count, error = validate_json_file(table)

        if is_valid:
            status = "✓"
            valid_tables += 1
            total_rows += row_count
        elif error == "File not found":
            status = "⚠"
            missing_tables += 1
        else:
            status = "✗"
            invalid_tables += 1

        results.append({
            "table": table,
            "status": status,
            "rows": row_count,
            "error": error,
        })

    # Print results
    print(f"{'Table':<30} {'Status':<8} {'Rows':>10}  {'Notes'}")
    print("-" * 60)

    for r in results:
        notes = r["error"] if r["error"] else ""
        print(f"{r['table']:<30} {r['status']:<8} {r['rows']:>10,}  {notes}")

    print("-" * 60)
    print(f"{'TOTAL':<30} {'':<8} {total_rows:>10,}")

    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)
    print(f"Valid tables:    {valid_tables:>3} / {len(TABLES)}")
    print(f"Missing tables:  {missing_tables:>3} / {len(TABLES)}")
    print(f"Invalid tables:  {invalid_tables:>3} / {len(TABLES)}")
    print(f"Total rows:      {total_rows:>10,}")
    print("=" * 60)

    if invalid_tables > 0:
        print("\n✗ Some files are invalid. Check errors above.")
        sys.exit(1)
    elif valid_tables == 0:
        print("\n✗ No valid data found. Run export first.")
        sys.exit(1)
    else:
        print(f"\n✓ Validation passed. Ready to import {total_rows:,} rows.")
        sys.exit(0)


if __name__ == "__main__":
    main()
