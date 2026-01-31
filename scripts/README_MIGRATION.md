# Supabase Migration Guide

Este script migra schema e dados entre projetos Supabase usando a REST API.

## Requisitos

```bash
pip install requests
```

Ou com uv:

```bash
uv add requests
```

## Uso

### 0. Testar Conexões (Recomendado)

Antes de migrar, teste as conexões:

```bash
uv run python scripts/test_migration_connection.py
```

Ou com python direto:

```bash
python scripts/test_migration_connection.py
```

Isso valida:
- Conexão com projeto antigo (para export)
- Conexão com projeto novo usando anon key
- Conexão com projeto novo usando service role key

### 1. Gerar Schema SQL

Primeiro, gere o arquivo SQL consolidado com todas as migrations:

```bash
uv run python scripts/migrate_supabase.py --schema-only
```

Isso cria o arquivo `scripts/full_schema.sql` com todas as migrations concatenadas.

**Aplicar manualmente:**
1. Abra o Supabase Dashboard do novo projeto
2. Vá em SQL Editor
3. Copie e cole o conteúdo de `full_schema.sql`
4. Execute o SQL

### 2. Exportar Dados do Projeto Antigo

```bash
uv run python scripts/migrate_supabase.py --export-only
```

- Exporta dados de todas as tabelas do projeto antigo
- Salva em `scripts/migration_data/{table}.json`
- Usa paginação automática (1000 rows por request)
- Pula tabelas que não existem (sem erro)

### 3. Validar Dados Exportados (Opcional)

```bash
uv run python scripts/validate_export.py
```

- Verifica integridade dos arquivos JSON
- Conta rows por tabela
- Identifica arquivos corrompidos
- Mostra summary antes do import

### 4. Importar Dados no Projeto Novo

```bash
uv run python scripts/migrate_supabase.py --import-only
```

- Importa dados de `scripts/migration_data/` para o novo projeto
- Usa service role key (bypass RLS)
- Batches de 100 rows por request
- Respeita ordem de dependências FK
- Usa `Prefer: resolution=merge-duplicates` para upsert

### 5. Migração Completa (Export + Import)

```bash
uv run python scripts/migrate_supabase.py
```

Executa export e import em sequência.

## Tabelas Migradas (em ordem FK)

1. profiles
2. clientes
3. clientes_contact_info
4. alert_rules
5. cargas
6. envios_processados
7. carga_sales_orders
8. carga_historico
9. shipment_history
10. tracking_master
11. customer_assignments
12. active_alerts
13. notificacoes
14. notification_queue
15. auth_attempts
16. security_audit_log
17. user_roles

## Configuração

As credenciais estão hardcoded no script:

```python
OLD_PROJECT_URL = "https://aldwmdfveivkfxxvfoua.supabase.co"
OLD_ANON_KEY = "eyJ..."

NEW_PROJECT_URL = "https://stkwoqcrrecwzeajhhxi.supabase.co"
NEW_ANON_KEY = "sb_publishable_..."
NEW_SERVICE_ROLE_KEY = "sb_secret_..."
```

**⚠️ Nunca commite service role keys para o repositório.**

Se precisar alterar, edite as constantes no topo do script.

## Troubleshooting

### Tabela não encontrada (404)

Normal. O script pula automaticamente. Algumas tabelas podem não existir no projeto antigo.

### Erro de permissão no import

Verifique se `NEW_SERVICE_ROLE_KEY` está correto. O import usa service role para bypass de RLS.

### Timeout em tabelas grandes

Ajuste os batch sizes no script:

```python
EXPORT_BATCH_SIZE = 1000  # Reduza se necessário
IMPORT_BATCH_SIZE = 100   # Reduza se necessário
```

### UTF-8 encoding errors (Windows)

O script configura `PYTHONIOENCODING=utf-8` automaticamente. Se ainda houver problemas:

```cmd
set PYTHONIOENCODING=utf-8
uv run python scripts/migrate_supabase.py
```

## Outputs

- `scripts/full_schema.sql` — Schema consolidado para aplicar manualmente
- `scripts/migration_data/*.json` — Dados exportados (um arquivo por tabela)
- Summary no terminal com estatísticas de rows exportados/importados

## Workflow Recomendado

```bash
# Passo 0: Testar conexões
python scripts/test_migration_connection.py

# Passo 1: Gerar schema
python scripts/migrate_supabase.py --schema-only

# Passo 2: Aplicar schema manualmente no SQL Editor do Supabase
# (Copiar scripts/full_schema.sql e colar no SQL Editor)

# Passo 3: Exportar dados
python scripts/migrate_supabase.py --export-only

# Passo 4: Validar exports
python scripts/validate_export.py

# Passo 5: Importar dados
python scripts/migrate_supabase.py --import-only

# Passo 6: Verificar dados no novo projeto (via dashboard ou queries)
```

## Notas

- **Export** usa `anon_key` (subject to RLS do projeto antigo)
- **Import** usa `service_role_key` (bypass RLS no projeto novo)
- Retry automático em erros 429, 500, 502, 503, 504
- Continua import mesmo se algum batch falhar
- Estatísticas detalhadas ao final
