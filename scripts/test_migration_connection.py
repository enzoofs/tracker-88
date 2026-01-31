#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Test connectivity to old and new Supabase projects.
Run this before attempting migration to verify credentials.
"""

import sys

# Fix Windows encoding
if sys.platform == "win32":
    import os
    os.environ["PYTHONIOENCODING"] = "utf-8"
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    if hasattr(sys.stderr, "reconfigure"):
        sys.stderr.reconfigure(encoding="utf-8")

import requests

# Same config as migrate_supabase.py
OLD_PROJECT_URL = "https://aldwmdfveivkfxxvfoua.supabase.co"
OLD_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFsZHdtZGZ2ZWl2a2Z4eHZmb3VhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkyMjIxMzksImV4cCI6MjA3NDc5ODEzOX0.uo82xCuNAN9wb6QpbBDxdHNruRCzwRuup6VxgEjvlKM"

NEW_PROJECT_URL = "https://stkwoqcrrecwzeajhhxi.supabase.co"
NEW_ANON_KEY = "sb_publishable_xwcZEaFRUuFCspFO1m23NQ_iAADutgE"
NEW_SERVICE_ROLE_KEY = "sb_secret_9_uEFSNA4RjTinP2EbJlFg_nM9eJKCb"


def test_connection(name, url, key, is_anon=False):
    """Test connection to a Supabase project"""
    print(f"\nTesting {name}...")
    print(f"  URL: {url}")

    headers = {
        "apikey": key,
        "Authorization": f"Bearer {key}",
    }

    # For anon keys, test with a simple table query instead of schema listing
    # Schema listing requires service role
    if is_anon:
        # Try to query profiles table (should exist in most projects)
        test_url = f"{url}/rest/v1/profiles?limit=0"
    else:
        test_url = f"{url}/rest/v1/"

    try:
        response = requests.get(test_url, headers=headers, timeout=10)

        # For anon keys, 200 or 406 (not acceptable) are both OK
        # 406 means the table exists but we might not have permission
        # 404 means table doesn't exist (also OK for connection test)
        if response.status_code in [200, 404, 406]:
            print(f"  ✓ Connected successfully (HTTP {response.status_code})")
            return True
        elif response.status_code == 401:
            print(f"  ✗ Authentication failed: Invalid key")
            return False
        else:
            print(f"  ✗ Connection failed: HTTP {response.status_code}")
            print(f"    Response: {response.text[:200]}")
            return False

    except requests.exceptions.RequestException as e:
        print(f"  ✗ Connection error: {e}")
        return False


def main():
    print("=" * 60)
    print("SUPABASE MIGRATION CONNECTION TEST")
    print("=" * 60)

    old_ok = test_connection("OLD PROJECT (source)", OLD_PROJECT_URL, OLD_ANON_KEY, is_anon=True)
    new_anon_ok = test_connection("NEW PROJECT (anon key)", NEW_PROJECT_URL, NEW_ANON_KEY, is_anon=True)
    new_service_ok = test_connection("NEW PROJECT (service role)", NEW_PROJECT_URL, NEW_SERVICE_ROLE_KEY, is_anon=False)

    print("\n" + "=" * 60)
    print("RESULTS")
    print("=" * 60)
    print(f"Old project (export):     {'✓ OK' if old_ok else '✗ FAIL'}")
    print(f"New project (anon):       {'✓ OK' if new_anon_ok else '✗ FAIL'}")
    print(f"New project (service):    {'✓ OK' if new_service_ok else '✗ FAIL'}")
    print("=" * 60)

    if all([old_ok, new_anon_ok, new_service_ok]):
        print("\n✓ All connections OK. Ready to migrate!")
        sys.exit(0)
    else:
        print("\n✗ Some connections failed. Check credentials.")
        sys.exit(1)


if __name__ == "__main__":
    main()
