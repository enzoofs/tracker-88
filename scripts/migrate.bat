@echo off
REM Supabase Migration Batch Script
REM Windows wrapper for migrate_supabase.py

setlocal enabledelayedexpansion

set PYTHONIOENCODING=utf-8

echo ============================================================
echo SUPABASE MIGRATION TOOL
echo ============================================================
echo.

REM Check Python
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python not found. Please install Python 3.8+
    pause
    exit /b 1
)

REM Check requests module
python -c "import requests" >nul 2>&1
if errorlevel 1 (
    echo ERROR: requests module not found. Installing...
    pip install requests
    if errorlevel 1 (
        echo ERROR: Failed to install requests
        pause
        exit /b 1
    )
)

echo Select operation:
echo.
echo 1. Test connections
echo 2. Generate schema SQL
echo 3. Export data from old project
echo 4. Validate exported data
echo 5. Import data to new project
echo 6. Full migration (export + import)
echo 7. Exit
echo.
set /p choice="Enter choice (1-7): "

if "%choice%"=="1" (
    echo.
    echo Testing connections...
    python "%~dp0test_migration_connection.py"
    goto :end
)

if "%choice%"=="2" (
    echo.
    echo Generating schema SQL...
    python "%~dp0migrate_supabase.py" --schema-only
    goto :end
)

if "%choice%"=="3" (
    echo.
    echo Exporting data from old project...
    echo This may take several minutes depending on data size.
    echo.
    python "%~dp0migrate_supabase.py" --export-only
    goto :end
)

if "%choice%"=="4" (
    echo.
    echo Validating exported data...
    python "%~dp0validate_export.py"
    goto :end
)

if "%choice%"=="5" (
    echo.
    echo WARNING: This will import data to the new project.
    echo Make sure the schema has been applied first!
    echo.
    set /p confirm="Continue? (y/n): "
    if /i "!confirm!" neq "y" (
        echo Cancelled.
        goto :end
    )
    echo.
    echo Importing data to new project...
    echo This may take several minutes depending on data size.
    echo.
    python "%~dp0migrate_supabase.py" --import-only
    goto :end
)

if "%choice%"=="6" (
    echo.
    echo WARNING: This will export from old and import to new project.
    echo Make sure the schema has been applied first!
    echo.
    set /p confirm="Continue? (y/n): "
    if /i "!confirm!" neq "y" (
        echo Cancelled.
        goto :end
    )
    echo.
    echo Running full migration...
    echo This may take several minutes depending on data size.
    echo.
    python "%~dp0migrate_supabase.py"
    goto :end
)

if "%choice%"=="7" (
    echo Goodbye!
    exit /b 0
)

echo Invalid choice. Please select 1-7.

:end
echo.
echo ============================================================
pause
