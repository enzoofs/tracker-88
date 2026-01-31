#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Supabase Migration Script
Migrates schema and data from old Supabase project to new project.

Usage:
    # Generate schema SQL only
    python migrate_supabase.py --schema-only

    # Export data from old project
    python migrate_supabase.py --export-only

    # Import data to new project
    python migrate_supabase.py --import-only

    # Full migration (export + import)
    python migrate_supabase.py
"""

import argparse
import json
import os
import sys
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional

# Fix Windows encoding issues before any other imports
if sys.platform == "win32":
    import locale
    os.environ["PYTHONIOENCODING"] = "utf-8"
    # Force UTF-8 for stdout/stderr
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    if hasattr(sys.stderr, "reconfigure"):
        sys.stderr.reconfigure(encoding="utf-8")

import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

# Configuration
OLD_PROJECT_URL = "https://aldwmdfveivkfxxvfoua.supabase.co"
OLD_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFsZHdtZGZ2ZWl2a2Z4eHZmb3VhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkyMjIxMzksImV4cCI6MjA3NDc5ODEzOX0.uo82xCuNAN9wb6QpbBDxdHNruRCzwRuup6VxgEjvlKM"

NEW_PROJECT_URL = "https://stkwoqcrrecwzeajhhxi.supabase.co"
NEW_ANON_KEY = "sb_publishable_xwcZEaFRUuFCspFO1m23NQ_iAADutgE"
NEW_SERVICE_ROLE_KEY = "sb_secret_9_uEFSNA4RjTinP2EbJlFg_nM9eJKCb"

# Base paths
SCRIPT_DIR = Path(__file__).parent.resolve()
PROJECT_ROOT = SCRIPT_DIR.parent
MIGRATIONS_DIR = PROJECT_ROOT / "supabase" / "migrations"
DATA_DIR = SCRIPT_DIR / "migration_data"
SCHEMA_OUTPUT = SCRIPT_DIR / "full_schema.sql"

# Tables to migrate in FK dependency order
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

# Pagination settings
EXPORT_BATCH_SIZE = 1000
IMPORT_BATCH_SIZE = 100


class MigrationStats:
    """Track migration statistics"""

    def __init__(self):
        self.exported: Dict[str, int] = {}
        self.imported: Dict[str, int] = {}
        self.errors: List[str] = []
        self.start_time = datetime.now()

    def add_export(self, table: str, count: int):
        self.exported[table] = count

    def add_import(self, table: str, count: int):
        self.imported[table] = count

    def add_error(self, error: str):
        self.errors.append(error)

    def print_summary(self):
        elapsed = (datetime.now() - self.start_time).total_seconds()

        print("\n" + "=" * 60)
        print("MIGRATION SUMMARY")
        print("=" * 60)

        if self.exported:
            print("\nExported:")
            total_exported = 0
            for table in TABLES:
                count = self.exported.get(table, 0)
                total_exported += count
                print(f"  {table:30s} {count:>6,} rows")
            print(f"  {'TOTAL':30s} {total_exported:>6,} rows")

        if self.imported:
            print("\nImported:")
            total_imported = 0
            for table in TABLES:
                count = self.imported.get(table, 0)
                total_imported += count
                print(f"  {table:30s} {count:>6,} rows")
            print(f"  {'TOTAL':30s} {total_imported:>6,} rows")

        if self.errors:
            print(f"\nErrors: {len(self.errors)}")
            for error in self.errors[:5]:  # Show first 5 errors
                print(f"  - {error}")
            if len(self.errors) > 5:
                print(f"  ... and {len(self.errors) - 5} more")

        print(f"\nElapsed time: {elapsed:.2f}s")
        print("=" * 60)


def get_session() -> requests.Session:
    """Create a requests session with retry logic"""
    session = requests.Session()
    retry = Retry(
        total=3,
        backoff_factor=1,
        status_forcelist=[429, 500, 502, 503, 504],
    )
    adapter = HTTPAdapter(max_retries=retry)
    session.mount("http://", adapter)
    session.mount("https://", adapter)
    return session


def generate_schema_sql() -> None:
    """Concatenate all migration files into a single schema file"""
    print(f"\n📝 Generating schema SQL from migrations...")

    if not MIGRATIONS_DIR.exists():
        print(f"❌ Migrations directory not found: {MIGRATIONS_DIR}")
        sys.exit(1)

    # Get all .sql files sorted by filename (timestamp)
    migration_files = sorted(MIGRATIONS_DIR.glob("*.sql"))

    if not migration_files:
        print(f"❌ No migration files found in {MIGRATIONS_DIR}")
        sys.exit(1)

    print(f"Found {len(migration_files)} migration files")

    # Concatenate all migrations
    schema_sql = []
    schema_sql.append("-- Full Schema Migration")
    schema_sql.append(f"-- Generated: {datetime.now().isoformat()}")
    schema_sql.append(f"-- Source: {MIGRATIONS_DIR}")
    schema_sql.append("-- " + "=" * 60)
    schema_sql.append("")

    for migration_file in migration_files:
        print(f"  + {migration_file.name}")
        schema_sql.append(f"\n-- Migration: {migration_file.name}")
        schema_sql.append("-" * 60)
        schema_sql.append("")

        try:
            with open(migration_file, "r", encoding="utf-8") as f:
                content = f.read()
                schema_sql.append(content)
        except Exception as e:
            print(f"⚠️  Warning: Could not read {migration_file.name}: {e}")
            schema_sql.append(f"-- ERROR: Could not read file: {e}")

        schema_sql.append("")

    # Write output
    SCHEMA_OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    full_schema = "\n".join(schema_sql)

    with open(SCHEMA_OUTPUT, "w", encoding="utf-8") as f:
        f.write(full_schema)

    print(f"\n✅ Schema SQL generated: {SCHEMA_OUTPUT}")
    print(f"   {len(full_schema):,} characters")
    print("\n💡 Copy and paste this file into the Supabase SQL Editor")
    print("   to apply the schema to your new project.")


def export_table(
    session: requests.Session,
    table: str,
    stats: MigrationStats
) -> None:
    """Export all rows from a table in the old project"""
    print(f"\n📤 Exporting {table}...", end=" ", flush=True)

    headers = {
        "apikey": OLD_ANON_KEY,
        "Authorization": f"Bearer {OLD_ANON_KEY}",
        "Content-Type": "application/json",
    }

    all_rows = []
    offset = 0

    while True:
        # Supabase uses Range header for pagination
        range_header = f"{offset}-{offset + EXPORT_BATCH_SIZE - 1}"
        headers["Range"] = range_header

        url = f"{OLD_PROJECT_URL}/rest/v1/{table}?select=*"

        try:
            response = session.get(url, headers=headers, timeout=30)
            response.raise_for_status()

            rows = response.json()

            if not rows:
                break

            all_rows.extend(rows)
            offset += len(rows)

            # Check if there are more rows
            content_range = response.headers.get("Content-Range", "")
            if content_range:
                # Format: "0-999/1234" or "0-999/*"
                parts = content_range.split("/")
                if len(parts) == 2 and parts[1] != "*":
                    total = int(parts[1])
                    if offset >= total:
                        break

            # If we got fewer rows than batch size, we're done
            if len(rows) < EXPORT_BATCH_SIZE:
                break

        except requests.exceptions.HTTPError as e:
            if e.response.status_code == 404:
                # Table doesn't exist - that's ok
                print("⚠️ table not found (skipping)")
                stats.add_export(table, 0)
                return
            elif e.response.status_code == 416:
                # Range not satisfiable - we're done
                break
            else:
                error_msg = f"HTTP error exporting {table}: {e}"
                print(f"❌ {error_msg}")
                stats.add_error(error_msg)
                return

        except Exception as e:
            error_msg = f"Error exporting {table}: {e}"
            print(f"❌ {error_msg}")
            stats.add_error(error_msg)
            return

    # Save to file
    table_file = DATA_DIR / f"{table}.json"
    table_file.parent.mkdir(parents=True, exist_ok=True)

    with open(table_file, "w", encoding="utf-8") as f:
        json.dump(all_rows, f, ensure_ascii=False, indent=2, default=str)

    stats.add_export(table, len(all_rows))
    print(f"✅ {len(all_rows):,} rows")


def import_table(
    session: requests.Session,
    table: str,
    stats: MigrationStats
) -> None:
    """Import all rows into a table in the new project"""
    table_file = DATA_DIR / f"{table}.json"

    if not table_file.exists():
        print(f"⚠️  Skipping {table} (no export file found)")
        return

    print(f"\n📥 Importing {table}...", end=" ", flush=True)

    # Load data
    with open(table_file, "r", encoding="utf-8") as f:
        rows = json.load(f)

    if not rows:
        print("✅ 0 rows (empty table)")
        stats.add_import(table, 0)
        return

    headers = {
        "apikey": NEW_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {NEW_SERVICE_ROLE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates",
    }

    url = f"{NEW_PROJECT_URL}/rest/v1/{table}"

    imported_count = 0

    # Import in batches
    for i in range(0, len(rows), IMPORT_BATCH_SIZE):
        batch = rows[i:i + IMPORT_BATCH_SIZE]

        try:
            response = session.post(
                url,
                headers=headers,
                json=batch,
                timeout=60
            )
            response.raise_for_status()
            imported_count += len(batch)

        except requests.exceptions.HTTPError as e:
            error_msg = f"HTTP error importing {table} batch {i}-{i+len(batch)}: {e}"
            if e.response is not None:
                error_msg += f" | Response: {e.response.text[:200]}"
            print(f"\n❌ {error_msg}")
            stats.add_error(error_msg)
            # Continue with next batch

        except Exception as e:
            error_msg = f"Error importing {table} batch {i}-{i+len(batch)}: {e}"
            print(f"\n❌ {error_msg}")
            stats.add_error(error_msg)
            # Continue with next batch

    stats.add_import(table, imported_count)
    print(f"✅ {imported_count:,} rows")


def export_data(stats: MigrationStats) -> None:
    """Export data from all tables in old project"""
    print("\n" + "=" * 60)
    print("EXPORTING DATA FROM OLD PROJECT")
    print("=" * 60)

    session = get_session()

    for table in TABLES:
        export_table(session, table, stats)

    print(f"\n✅ Export complete. Data saved to: {DATA_DIR}")


def import_data(stats: MigrationStats) -> None:
    """Import data into all tables in new project"""
    print("\n" + "=" * 60)
    print("IMPORTING DATA TO NEW PROJECT")
    print("=" * 60)

    if not DATA_DIR.exists():
        print(f"❌ Data directory not found: {DATA_DIR}")
        print("   Run with --export-only first to export data.")
        sys.exit(1)

    session = get_session()

    for table in TABLES:
        import_table(session, table, stats)

    print(f"\n✅ Import complete")


def main():
    parser = argparse.ArgumentParser(
        description="Migrate Supabase project schema and data",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Generate schema SQL only
  python migrate_supabase.py --schema-only

  # Export data from old project
  python migrate_supabase.py --export-only

  # Import data to new project
  python migrate_supabase.py --import-only

  # Full migration (export + import)
  python migrate_supabase.py
        """
    )

    parser.add_argument(
        "--schema-only",
        action="store_true",
        help="Only generate schema SQL file (no data migration)"
    )
    parser.add_argument(
        "--export-only",
        action="store_true",
        help="Only export data from old project"
    )
    parser.add_argument(
        "--import-only",
        action="store_true",
        help="Only import data to new project"
    )

    args = parser.parse_args()

    print("=" * 60)
    print("SUPABASE MIGRATION TOOL")
    print("=" * 60)
    print(f"Project root: {PROJECT_ROOT}")
    print(f"Migrations:   {MIGRATIONS_DIR}")
    print(f"Data dir:     {DATA_DIR}")
    print(f"Schema out:   {SCHEMA_OUTPUT}")

    stats = MigrationStats()

    try:
        if args.schema_only:
            generate_schema_sql()

        elif args.export_only:
            export_data(stats)
            stats.print_summary()

        elif args.import_only:
            import_data(stats)
            stats.print_summary()

        else:
            # Full migration: export + import
            export_data(stats)
            import_data(stats)
            stats.print_summary()

    except KeyboardInterrupt:
        print("\n\n⚠️  Migration interrupted by user")
        stats.print_summary()
        sys.exit(1)

    except Exception as e:
        print(f"\n\n❌ Fatal error: {e}")
        import traceback
        traceback.print_exc()
        stats.print_summary()
        sys.exit(1)


if __name__ == "__main__":
    main()
