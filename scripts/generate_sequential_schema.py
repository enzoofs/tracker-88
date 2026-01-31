#!/usr/bin/env python3
"""Generate schema SQL preserving original migration order (no reordering)."""
import os, sys
from pathlib import Path
from datetime import datetime

if sys.platform == "win32":
    os.environ["PYTHONIOENCODING"] = "utf-8"
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")

SCRIPT_DIR = Path(__file__).parent.resolve()
PROJECT_ROOT = SCRIPT_DIR.parent
MIGRATIONS_DIR = PROJECT_ROOT / "supabase" / "migrations"
SCHEMA_OUTPUT = SCRIPT_DIR / "full_schema.sql"

migration_files = sorted(MIGRATIONS_DIR.glob("*.sql"))
print(f"Found {len(migration_files)} migration files")

parts = [
    f"-- Full Schema Migration (Sequential Order)",
    f"-- Generated: {datetime.now().isoformat()}",
    f"-- Migrations applied in original order",
    "-- " + "=" * 60,
    "",
    "-- PREAMBLE: Functions referenced before their migration creates them",
    "CREATE OR REPLACE FUNCTION public.update_updated_at_column()",
    "RETURNS trigger",
    "LANGUAGE plpgsql",
    "SET search_path TO ''",
    "AS $$",
    "BEGIN",
    "    NEW.updated_at = NOW();",
    "    RETURN NEW;",
    "END;",
    "$$;",
    "",
]

for i, mf in enumerate(migration_files):
    content = mf.read_text(encoding="utf-8").strip()
    if not content:
        continue
    parts.append(f"-- ============================================================")
    parts.append(f"-- Migration [{i+1:02d}]: {mf.name}")
    parts.append(f"-- ============================================================")
    parts.append(content)
    parts.append("")
    print(f"  [{i+1:02d}] {mf.name}")

schema = "\n".join(parts)
SCHEMA_OUTPUT.write_text(schema, encoding="utf-8", newline="\n")
print(f"\nOutput: {SCHEMA_OUTPUT}")
print(f"Size: {len(schema):,} chars")
