# Síntese Tracker — Diretrizes Claude Code

## Projeto

Sistema de rastreamento logístico para importação de produtos biotecnológicos. Frontend React/TypeScript + Supabase + n8n.

- **Repositório**: `c:\sintese-tracker\tracker-88`
- **Deploy**: Lovable (frontend) + Supabase Cloud (backend) + n8n (automação)
- **Documentação completa**: `docs/` (stack, features, business-rules, integrations, patterns)
- **Metaspec resumo**: `technical/tracker-88.md`
- **Fluxo Product on Rails**: `docs/PRODUCT-ON-RAILS.md`

## Stack

- React 18 + TypeScript 5.5 + Vite + TailwindCSS + shadcn/ui
- Supabase (PostgreSQL + Realtime + Auth + Edge Functions)
- n8n (email parsing, FedEx scraping, data ingestion)
- Python scripts em `scripts/` (auditoria de cargas, processamento Excel/PDF)

## Regras de Negócio Críticas

- **SLA**: 15 dias úteis a partir de `data_envio` (data de saída FedEx). Use `date-fns/differenceInBusinessDays`.
- **Consolidação**: 1 carga = N Sales Orders. Temperatura ambiente ≠ controlada.
- **Tabelas principais**: `envios_processados` (SOs), `cargas`, `carga_sales_orders` (link N:N).
- **Edge Functions usam `SUPABASE_SERVICE_ROLE_KEY`** internamente para bypass de RLS. Nunca exponha essa chave no frontend.

## Convenções de Código

### React/TypeScript
- Componentes em `src/components/dashboard/` (19 componentes)
- Custom hooks em `src/hooks/` (ex: `useSLACalculator`)
- shadcn/ui components em `src/components/ui/`
- State: TanStack Query (server), Context API (global), useState (local)
- Formulários: React Hook Form + Zod

### Supabase
- Edge Functions em `supabase/functions/` (Deno, TypeScript)
- Todas as Edge Functions têm `verify_jwt = false` — usam service_role internamente
- Migrations em `supabase/migrations/`

### Python
- Scripts em `scripts/` com `.env` para credenciais
- Chamam Edge Functions via HTTP (não SDK direto, por causa do RLS)
- Encoding: sempre usar `PYTHONIOENCODING=utf-8` no Windows

### Git
- Commits em formato convencional (feat, fix, refactor, docs, etc.)
- Não mencionar Claude Code em commits ou PRs
- Usar `gh cli` para operações GitHub

## Abordagem de Desenvolvimento

- Pergunte antes de implementar quando os requisitos não forem claros
- Pesquise bibliotecas/APIs antes de tentar implementação — evite trial-and-error
- Não implemente o que não foi solicitado. Sugira melhorias, mas peça aprovação
- Se travar, liste 5-7 hipóteses, reduza a 2, e teste antes de corrigir
- Use Context7 MCP para documentação atualizada de bibliotecas
- Sempre visite URLs fornecidas como referência antes de implementar

## Fluxo de Trabalho

### Feature nova
```
/product:spec → /engineer:start → /engineer:work → /engineer:pre-pr → /engineer:pr
```

### Bug fix rápido
```
Investigar → Corrigir → /engineer:pr
```

### Auditoria de dados
```
python scripts/audit_cargo_data.py --dry-run    # validar
python scripts/audit_cargo_data.py --auto-fill   # corrigir
```

### Atualizar documentação
```
/engineer:docs → /metaspecs:build-tech-docs
```

## Acesso ao Banco de Dados

- **Frontend**: usa anon key (`VITE_SUPABASE_ANON_KEY`) — sujeito a RLS
- **Edge Functions**: usam `SUPABASE_SERVICE_ROLE_KEY` (bypass RLS)
- **Scripts Python**: chamam Edge Functions via HTTP com anon key nos headers
- **Lovable gerencia o Supabase** — não temos acesso direto ao dashboard. Para deploy de Edge Functions, enviar prompt ao Lovable.

## Qualidade

- Código deve compilar sem erros (`npm run build`)
- Trate erros com toast notifications (padrão shadcn/ui)
- Nomes claros para variáveis e funções
- Não introduza vulnerabilidades (XSS, injection, etc.)
- TypeScript strict está desligado — mas prefira tipos explícitos

## Alertas Conhecidos

- ⚠️ SLA calculation em `useSLACalculator.ts` foi corrigido parcialmente — validar
- ⚠️ Analytics/AdvancedAnalytics: componentes UI prontos, lógica incompleta
- ⚠️ Notificações: botão existe, backend incompleto
- ⚠️ Zero testes automatizados — prioridade para implementar
