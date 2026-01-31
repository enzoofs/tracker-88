#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Generate Properly Ordered Schema SQL

Reads all Supabase migration files and reorders SQL statements to avoid
dependency issues when running in SQL Editor.

Order:
1. Extensions
2. Types/Domains
3. Functions
4. Tables
5. Indexes
6. Triggers
7. Policies/RLS/Grants
8. Everything else (ALTER TABLE constraints, INSERT, etc.)
"""

import os
import re
import sys
from datetime import datetime
from pathlib import Path
from typing import List, Tuple

# Fix Windows encoding
if sys.platform == "win32":
    os.environ["PYTHONIOENCODING"] = "utf-8"
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    if hasattr(sys.stderr, "reconfigure"):
        sys.stderr.reconfigure(encoding="utf-8")

# Paths
SCRIPT_DIR = Path(__file__).parent.resolve()
PROJECT_ROOT = SCRIPT_DIR.parent
MIGRATIONS_DIR = PROJECT_ROOT / "supabase" / "migrations"
SCHEMA_OUTPUT = SCRIPT_DIR / "full_schema.sql"


class SQLStatement:
    """Represents a single SQL statement with metadata"""

    def __init__(self, sql: str, phase: int, original_order: int):
        self.sql = sql.strip()
        self.phase = phase
        self.original_order = original_order

    def __lt__(self, other):
        # Sort by phase first, then by original order
        if self.phase != other.phase:
            return self.phase < other.phase
        return self.original_order < other.original_order


def split_sql_statements(content: str) -> List[str]:
    """
    Split SQL content into individual statements.
    Handles dollar-quoted strings ($$..$$), comments, and multi-line statements.
    """
    statements = []
    current = []
    in_dollar_quote = False
    dollar_tag = None
    in_comment_block = False

    lines = content.split('\n')

    for line in lines:
        # Track block comments
        if '/*' in line and not in_dollar_quote:
            in_comment_block = True
        if '*/' in line and in_comment_block:
            in_comment_block = False

        # Track dollar-quoted strings
        # Dollar quotes can be: $$, $tag$, $function$, etc.
        if not in_comment_block:
            # Find all potential dollar quote markers in the line
            dollar_matches = list(re.finditer(r'\$([a-zA-Z0-9_]*)\$', line))

            for match in dollar_matches:
                tag = match.group(0)

                if not in_dollar_quote:
                    # Start of dollar quote
                    in_dollar_quote = True
                    dollar_tag = tag
                elif tag == dollar_tag:
                    # End of dollar quote (matching tag)
                    in_dollar_quote = False
                    dollar_tag = None

        # Add line to current statement
        current.append(line)

        # Check for statement terminator
        # Semicolon ends statement only if:
        # - Not inside dollar quotes
        # - Not inside block comment
        if ';' in line and not in_dollar_quote and not in_comment_block:
            # Statement complete
            statement = '\n'.join(current).strip()
            # Skip pure comment blocks
            if statement and not all(l.strip().startswith('--') or not l.strip()
                                    for l in statement.split('\n')):
                statements.append(statement)
            current = []

    # Add any remaining content
    if current:
        statement = '\n'.join(current).strip()
        if statement and not all(l.strip().startswith('--') or not l.strip()
                                for l in statement.split('\n')):
            statements.append(statement)

    return statements


def classify_statement(sql: str) -> int:
    """
    Classify SQL statement into execution phase.

    Phases:
    1 - Extensions
    2 - Types/Domains
    3 - Tables
    4 - Functions
    5 - Indexes
    6 - Triggers
    7 - Policies/RLS/Grants
    8 - Everything else
    """
    # Normalize for matching (first significant line)
    lines = [l.strip() for l in sql.split('\n') if l.strip() and not l.strip().startswith('--')]
    if not lines:
        return 8

    first_line = lines[0].upper()

    # Phase 1: Extensions
    if 'CREATE EXTENSION' in first_line:
        return 1

    # Phase 2: Types and Domains
    if re.match(r'CREATE\s+(TYPE|DOMAIN)', first_line):
        return 2

    # Phase 3: Tables (CREATE TABLE, but not ALTER TABLE)
    if re.match(r'CREATE\s+TABLE', first_line):
        return 3

    # Phase 4: Functions (including CREATE OR REPLACE FUNCTION, DROP FUNCTION)
    if 'FUNCTION' in first_line and ('CREATE' in first_line or 'DROP' in first_line):
        return 4

    # Phase 5: Indexes
    if 'CREATE' in first_line and 'INDEX' in first_line:
        return 5

    # Phase 6: Triggers (including CREATE TRIGGER, DROP TRIGGER)
    if 'TRIGGER' in first_line and ('CREATE' in first_line or 'DROP' in first_line):
        return 6

    # Phase 7: Policies, RLS, Grants
    # Special case: ALTER TABLE ENABLE ROW LEVEL SECURITY
    if 'ALTER TABLE' in first_line and 'ENABLE ROW LEVEL SECURITY' in sql.upper():
        return 7

    if any(keyword in first_line for keyword in [
        'CREATE POLICY',
        'DROP POLICY',
        'GRANT',
        'REVOKE'
    ]):
        return 7

    # Phase 3.5: ALTER TABLE ADD/ALTER COLUMN (must run before functions that reference them)
    if 'ALTER TABLE' in first_line:
        full_upper = sql.upper()
        if 'ADD COLUMN' in full_upper or 'ALTER COLUMN' in full_upper or 'DROP COLUMN' in full_upper:
            return 35  # between tables (3) and functions (4)

    # Phase 8: Everything else (ALTER TABLE ADD CONSTRAINT, INSERT, etc.)
    return 8


def get_drop_statement(sql: str) -> str | None:
    """Extract the main object being dropped/created for grouping"""
    # For DROP statements, we want to keep them right before CREATE
    match = re.search(r'DROP\s+(\w+)\s+(?:IF\s+EXISTS\s+)?([^\s;]+)', sql, re.IGNORECASE)
    if match:
        return f"{match.group(1)}:{match.group(2)}"
    return None


def generate_ordered_schema():
    """Main function to generate properly ordered schema"""
    print("=" * 60)
    print("GENERATING ORDERED SCHEMA SQL")
    print("=" * 60)
    print(f"Migrations dir: {MIGRATIONS_DIR}")
    print(f"Output file:    {SCHEMA_OUTPUT}")
    print()

    if not MIGRATIONS_DIR.exists():
        print(f"❌ Migrations directory not found: {MIGRATIONS_DIR}")
        sys.exit(1)

    # Get all migration files
    migration_files = sorted(MIGRATIONS_DIR.glob("*.sql"))

    if not migration_files:
        print(f"❌ No migration files found")
        sys.exit(1)

    print(f"Found {len(migration_files)} migration files\n")

    # Read and concatenate all migrations
    all_sql = []
    for i, migration_file in enumerate(migration_files):
        print(f"  [{i+1:2d}] {migration_file.name}")
        with open(migration_file, "r", encoding="utf-8") as f:
            content = f.read()
            # Don't add migration comments - they mess up statement splitting
            all_sql.append(content)
            all_sql.append("\n")  # Separator between files

    concatenated = "\n".join(all_sql)

    # Split into statements
    print(f"\n📝 Parsing SQL statements...")
    statements = split_sql_statements(concatenated)
    print(f"   Found {len(statements)} statements")

    # Classify and order statements
    print(f"\n🔄 Classifying and ordering...")
    classified: List[SQLStatement] = []

    for i, sql in enumerate(statements):
        phase = classify_statement(sql)
        classified.append(SQLStatement(sql, phase, i))

    # Sort by phase, then original order
    classified.sort()

    # Count by phase
    phase_counts = {i: 0 for i in list(range(1, 9)) + [35]}
    for stmt in classified:
        phase_counts[stmt.phase] += 1

    phase_names = {
        1: "Extensions",
        2: "Types/Domains",
        3: "Tables",
        35: "ALTER TABLE columns",
        4: "Functions",
        5: "Indexes",
        6: "Triggers",
        7: "Policies/RLS/Grants",
        8: "Other (ALTER TABLE, INSERT, etc.)"
    }

    print(f"\n📊 Statement distribution:")
    for phase in [1, 2, 3, 35, 4, 5, 6, 7, 8]:
        count = phase_counts[phase]
        if count > 0:
            print(f"   Phase {phase} - {phase_names[phase]:30s}: {count:4d} statements")

    # Generate output
    print(f"\n✍️  Writing ordered schema...")

    output_lines = [
        "-- Full Schema Migration (Properly Ordered)",
        f"-- Generated: {datetime.now().isoformat()}",
        f"-- Source: {MIGRATIONS_DIR}",
        "-- " + "=" * 77,
        "--",
        "-- Execution order:",
        "--   1. Extensions",
        "--   2. Types/Domains",
        "--   3. Tables",
        "--   4. Functions",
        "--   5. Indexes",
        "--   6. Triggers",
        "--   7. Policies/RLS/Grants",
        "--   8. Other (ALTER TABLE constraints, INSERT, etc.)",
        "-- " + "=" * 77,
        "",
        "BEGIN;",
        ""
    ]

    current_phase = 0
    for stmt in classified:
        if stmt.phase != current_phase:
            current_phase = stmt.phase
            output_lines.append("")
            output_lines.append("-- " + "=" * 77)
            output_lines.append(f"-- PHASE {current_phase}: {phase_names[current_phase].upper()}")
            output_lines.append("-- " + "=" * 77)
            output_lines.append("")

        output_lines.append(stmt.sql)
        if not stmt.sql.endswith(';'):
            output_lines.append(';')
        output_lines.append("")

    output_lines.append("")
    output_lines.append("COMMIT;")
    output_lines.append("")

    # Write to file
    full_schema = "\n".join(output_lines)

    with open(SCHEMA_OUTPUT, "w", encoding="utf-8", newline='\n') as f:
        f.write(full_schema)

    print(f"\n✅ Schema generated successfully!")
    print(f"   Output: {SCHEMA_OUTPUT}")
    print(f"   Size: {len(full_schema):,} characters")
    print(f"   Lines: {len(output_lines):,}")
    print("\n💡 You can now run this file in Supabase SQL Editor")
    print("=" * 60)


if __name__ == "__main__":
    try:
        generate_ordered_schema()
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
