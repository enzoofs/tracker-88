@echo off
REM Script de Auditoria de Dados de Cargas (SNT-16)
REM Wrapper para facilitar execução no Windows

echo.
echo ========================================
echo   Auditoria de Dados de Cargas (SNT-16)
echo ========================================
echo.

REM Verificar se Python está instalado
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERRO] Python nao esta instalado ou nao esta no PATH
    echo.
    echo Instale Python 3.8+ de: https://www.python.org/downloads/
    pause
    exit /b 1
)

REM Verificar se as dependências estão instaladas
python -c "import pandas, openpyxl, supabase" >nul 2>&1
if errorlevel 1 (
    echo [AVISO] Dependencias nao instaladas. Instalando...
    echo.
    pip install pandas openpyxl supabase
    if errorlevel 1 (
        echo [ERRO] Falha ao instalar dependencias
        pause
        exit /b 1
    )
)

REM Verificar se .env existe
if not exist ".env" (
    echo [AVISO] Arquivo .env nao encontrado
    echo.
    echo Crie um arquivo .env com suas credenciais Supabase:
    echo   SUPABASE_URL=https://xxxxx.supabase.co
    echo   SUPABASE_KEY=eyJhbGc...
    echo.
    echo Ou use variaveis de ambiente:
    echo   set SUPABASE_URL=...
    echo   set SUPABASE_KEY=...
    echo.
)

REM Menu de opções
:menu
echo.
echo Escolha uma opcao:
echo.
echo   1. DRY-RUN (preview sem modificar)
echo   2. REPORT-ONLY (gerar relatorio CSV)
echo   3. AUTO-FILL (preencher dados automaticamente)
echo   4. SAIR
echo.
set /p opcao="Digite o numero da opcao: "

if "%opcao%"=="1" goto dryrun
if "%opcao%"=="2" goto report
if "%opcao%"=="3" goto autofill
if "%opcao%"=="4" goto fim

echo Opcao invalida!
goto menu

:dryrun
echo.
echo [DRY-RUN] Executando preview sem modificar dados...
echo.
python audit_cargo_data.py --dry-run
goto fim_exec

:report
echo.
echo [REPORT-ONLY] Gerando relatorio CSV...
echo.
set /p arquivo="Nome do arquivo de saida (default: audit_report.csv): "
if "%arquivo%"=="" set arquivo=audit_report.csv
python audit_cargo_data.py --report-only --output "%arquivo%"
echo.
echo Relatorio gerado: %arquivo%
start "" "%arquivo%"
goto fim_exec

:autofill
echo.
echo ========================================
echo   ATENCAO: MODO AUTO-FILL
echo ========================================
echo.
echo Este modo ira MODIFICAR o banco de dados!
echo.
set /p confirma="Tem certeza? (S/N): "
if /i not "%confirma%"=="S" (
    echo Operacao cancelada.
    goto menu
)
echo.
echo [AUTO-FILL] Preenchendo dados automaticamente...
echo.
python audit_cargo_data.py --auto-fill
goto fim_exec

:fim_exec
echo.
pause
goto menu

:fim
echo.
echo Encerrando...
exit /b 0
