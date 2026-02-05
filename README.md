# Síntese Tracker

Sistema de rastreamento logístico interno para a Síntese, empresa de biotecnologia brasileira. Gerencia 200+ Sales Orders por mês, fornecendo visibilidade completa do fluxo logístico desde a produção internacional até a entrega final.

## Funcionalidades Principais

- **Dashboard Executivo**: Métricas em tempo real (SOs ativas, em trânsito, chegadas esperadas)
- **Rastreamento de Sales Orders**: Tabela com busca, filtros, ordenação e exportação Excel
- **Gestão de Cargas Consolidadas**: 1 carga = N Sales Orders (ambiente vs. controlada)
- **Cálculo Automático de SLA**: 15 dias úteis a partir do envio FedEx
- **Upload em Massa**: Importação de planilhas Excel para atualização de cargas
- **Analytics e Relatórios**: Gráficos interativos e exportação PDF

## Stack

| Camada | Tecnologia |
|--------|------------|
| **Frontend** | React 18.3 + TypeScript 5.5 + Vite 7.3 |
| **UI** | TailwindCSS + shadcn/ui (40+ componentes) |
| **Estado** | TanStack Query + Context API |
| **Backend** | Supabase (PostgreSQL + Realtime + Auth) |
| **Automação** | n8n (email parsing, FedEx scraping) |

## Estrutura do Projeto

```
src/
├── components/
│   ├── auth/          # Autenticação e controle de acesso
│   ├── dashboard/     # 21 componentes do dashboard
│   └── ui/            # Componentes shadcn/ui
├── hooks/             # 11 custom hooks (~2240 linhas)
├── integrations/      # Cliente Supabase + tipos
├── lib/               # Utilitários, formatters, security
└── pages/             # Rotas (Index, NotFound)

supabase/
├── functions/         # 9 Edge Functions (Deno/TypeScript)
└── migrations/        # Migrações SQL

scripts/               # Scripts Python (auditoria, migração)
docs/                  # Documentação técnica completa
```

## Desenvolvimento Local

### Pré-requisitos

- Node.js 18+
- npm ou pnpm

### Setup

```bash
# Clone o repositório
git clone <URL_DO_REPOSITORIO>
cd tracker-88

# Instale as dependências
npm install

# Configure as variáveis de ambiente
cp .env.example .env
# Edite .env com suas credenciais Supabase

# Inicie o servidor de desenvolvimento
npm run dev
```

### Scripts Disponíveis

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Servidor de desenvolvimento com HMR |
| `npm run build` | Build de produção |
| `npm run preview` | Preview do build de produção |
| `npm run lint` | Verificação de lint |

## Deploy

- **Frontend**: [Lovable](https://lovable.dev/projects/8fd524cc-6a33-4a16-acee-60ff60b6e6e8) (CI/CD automático)
- **Alternativo**: Vercel (configurado em `vercel.json`)
- **Backend**: Supabase Cloud

## Documentação

- **Documentação Técnica**: [docs/](docs/)
- **Metaspec Resumo**: [technical/tracker-88.md](technical/tracker-88.md)
- **Diretrizes Claude Code**: [CLAUDE.md](CLAUDE.md)

### Principais Documentos

| Arquivo | Conteúdo |
|---------|----------|
| [docs/index.md](docs/index.md) | Índice e visão geral |
| [docs/stack.md](docs/stack.md) | Stack tecnológica detalhada |
| [docs/features.md](docs/features.md) | Funcionalidades implementadas |
| [docs/business-rules.md](docs/business-rules.md) | Regras de negócio |
| [docs/integrations.md](docs/integrations.md) | Integrações (Supabase, n8n, FedEx) |
| [docs/patterns.md](docs/patterns.md) | Padrões de design |

## Regras de Negócio Críticas

1. **SLA de 15 Dias Úteis**: Todas as SOs devem ser entregues em 15 dias úteis após envio para FedEx
2. **Consolidação por Temperatura**: Cargas ambiente não podem misturar com controladas
3. **Controle de Temperatura**: Ambiente (15°C-25°C) ou Controlada (2°C-8°C / -20°C)

## Licença

Proprietário - Síntese Biotecnologia
