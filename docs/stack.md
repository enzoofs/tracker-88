# Stack Tecnológica

## Linguagens e Runtime

### Frontend
- **TypeScript 5.5.3**: Linguagem principal para type-safety e melhor DX
- **JavaScript (ES2020+)**: Runtime no navegador
- **HTML5/CSS3**: Markup e estilos

### Node.js
- **Versão recomendada**: 18.x ou superior
- **Package Manager**: npm
- **Module System**: ESM (ECMAScript Modules)

## Frameworks Principais

### React 18.3.1
Framework principal para construção da interface do usuário.

**Características utilizadas**:
- Hooks (useState, useEffect, useContext, custom hooks)
- React Router DOM 6.26.2 para navegação SPA
- Suspense e lazy loading (futuro)
- Context API para state management global

### Vite 5.4.1
Build tool e dev server ultra-rápido.

**Plugins**:
- `@vitejs/plugin-react-swc`: React com SWC compiler (extremamente rápido)
- `lovable-tagger`: Dev tool para ambiente Lovable

**Configuração**:
- Hot Module Replacement (HMR)
- Path aliasing (`@/` aponta para `src/`)
- Server rodando na porta 8080

## Bibliotecas de UI

### shadcn/ui + Radix UI
Sistema de componentes acessíveis e customizáveis.

**Componentes Radix utilizados**:
- Dialog, AlertDialog, Dropdown, Popover
- Tabs, Accordion, Collapsible
- Select, Checkbox, Switch, Slider
- Toast/Sonner para notificações
- Scroll Area, Progress, Avatar
- Tooltip, HoverCard, Context Menu

### TailwindCSS 3.4.11
Framework CSS utility-first para estilização.

**Plugins**:
- `@tailwindcss/typography`: Tipografia aprimorada
- `tailwindcss-animate`: Animações pré-configuradas

**Customizações**:
- Temas dark/light mode via `next-themes`
- Gradientes personalizados (`gradient-tech`, `gradient-dark`)
- Efeitos de glass morphism e blur
- Animações customizadas (fade-in, glow-pulse)

### Lucide React 0.462.0
Biblioteca de ícones SVG otimizados.

**Ícones principais**:
- Package, Plane, Box (logística)
- BarChart3, TrendingUp (analytics)
- Bell, AlertCircle (notificações)
- RefreshCw, Download, Upload (ações)

## Banco de Dados e Backend

### Supabase 2.58.0
Backend-as-a-Service baseado em PostgreSQL.

**Serviços utilizados**:
- **PostgreSQL**: Banco de dados relacional
- **Realtime**: WebSocket para updates em tempo real
- **Authentication**: Sistema de autenticação JWT
- **Row Level Security (RLS)**: Controle de acesso granular
- **Edge Functions**: Serverless functions (futuro)

**Tabelas principais**:
- `envios_processados`: Sales Orders processadas
- `cargas`: Cargas consolidadas
- `carga_sales_orders`: Relacionamento N:N entre cargas e SOs
- `notification_queue`: Fila de notificações
- `profiles`: Perfis de usuários

**Deploy**: Supabase Cloud (gerenciado)

## Automação e Integração

### n8n
Ferramenta de automação de workflows (self-hosted ou cloud).

**Workflows implementados** (arquivos JSON na raiz):
- `0-Email Orchestrator.json`: Orquestra processamento de emails
- `1-Processar Daily Order Report.json`: Processa relatórios diários
- `2-Scrapper FedEx Tracking.json`: Scraping de tracking FedEx
- `3-Atualizar Cargas.json`: Atualiza status de cargas
- `FedEx Tracking Check.json`: Verificação periódica de trackings

**Integrações**:
- Microsoft Outlook (leitura de emails)
- FedEx (scraping de tracking)
- Supabase (inserção/atualização de dados)
- HTTP Webhooks (comunicação com o frontend)

## Bibliotecas de Dados e Formulários

### React Hook Form 7.53.0
Gerenciamento performático de formulários.

**Features**:
- Validação com Zod schemas
- `@hookform/resolvers`: Integração com Zod
- Uncontrolled components para performance

### TanStack Query 5.56.2
Data fetching, caching e sincronização de estado do servidor.

**Uso**:
- Cache de queries do Supabase
- Invalidação automática após mutações
- Refetch em background
- Optimistic updates

### Zod 3.23.8
Schema validation e type inference.

**Aplicações**:
- Validação de formulários
- Type-safe parsing de dados da API
- Runtime validation de configs

## Bibliotecas de Visualização

### Recharts 2.15.4
Biblioteca de charts para React baseada em D3.

**Gráficos utilizados**:
- Line Charts: Tendências de entregas
- Bar Charts: Status counts, comparações
- Area Charts: Volumes ao longo do tempo
- Pie Charts: Distribuição de status

### date-fns 3.6.0
Biblioteca moderna para manipulação de datas.

**Funções principais**:
- Cálculo de diferenças entre datas (SLA)
- Formatação de datas em pt-BR
- Adição/subtração de dias úteis

## Export e Relatórios

### XLSX 0.18.5
Leitura e escrita de planilhas Excel.

**Funcionalidades**:
- Export de SOs para `.xlsx`
- Import de cargas via bulk upload
- Parsing de planilhas de fornecedores

### jsPDF 3.0.1
Geração de PDFs no client-side.

**Uso**:
- Export de relatórios executivos
- Geração de documentos de carga

### html2canvas 1.4.1
Captura de screenshots de elementos HTML.

**Aplicação**:
- Export de dashboards como imagens
- Geração de reports visuais

## Ferramentas de Desenvolvimento

### ESLint 9.9.0
Linter para identificar problemas no código.

**Plugins**:
- `@eslint/js`: Regras JavaScript/TypeScript
- `eslint-plugin-react-hooks`: Regras dos hooks do React
- `eslint-plugin-react-refresh`: Validação de HMR

### TypeScript ESLint 8.0.1
Integração entre ESLint e TypeScript.

### Lovable Tagger 1.1.7
Ferramenta de desenvolvimento para ambiente Lovable.

## Arquitetura Geral

### Estrutura em Camadas

```
┌─────────────────────────────────────┐
│         UI Components               │
│   (Dashboard, Tables, Cards)        │
├─────────────────────────────────────┤
│      Business Logic Layer           │
│   (Hooks: useSLACalculator, etc)    │
├─────────────────────────────────────┤
│      Data Access Layer              │
│   (Supabase Client, TanStack Query) │
├─────────────────────────────────────┤
│      External Integrations          │
│   (n8n workflows, FedEx, Outlook)   │
└─────────────────────────────────────┘
```

### Fluxo de Dados

**Entrada de Dados**:
1. n8n processa emails e scraping → Insere no Supabase
2. Usuário faz upload via Excel → BulkCargoUpload → Supabase
3. Usuário cadastra manualmente → Formulários → Supabase

**Realtime Updates**:
1. Supabase Realtime detecta mudanças
2. Subscription no componente `LogisticsDashboard`
3. UI atualiza automaticamente + toast notification

**Cálculo de Métricas**:
1. Dados brutos do Supabase
2. Hook `useSLACalculator` processa lógica de negócio
3. Componentes renderizam badges e alertas visuais

### State Management

**Global State**:
- `AuthProvider`: Contexto de autenticação (Supabase Auth)
- `ThemeProvider`: Dark/Light mode (next-themes)

**Local State**:
- `useState`: State específico de componentes
- TanStack Query: Cache de dados do servidor

**Forma Store**: Não utiliza Redux ou Zustand (preferência por Context API)

## Infraestrutura e Deploy

### Hospedagem

**Frontend**:
- **Plataforma**: Lovable (https://lovable.dev)
- **Build**: Vite production build
- **CDN**: Automático via Lovable
- **Domínio**: Pode ser customizado

**Backend**:
- **Plataforma**: Supabase Cloud
- **Região**: Não especificada (provavelmente US East)
- **Backup**: Gerenciado pela Supabase

**Automação**:
- **n8n**: Instância própria (self-hosted ou cloud)
- **Conectividade**: Webhooks e APIs

### CI/CD

**Git Flow**:
- Commits automáticos via Lovable
- Push para GitHub
- Deploy automático no Lovable

**Build Pipeline**:
```bash
npm install → vite build → deploy to Lovable CDN
```

## Decisões Arquiteturais Importantes

### Por que React + TypeScript?
- **Tipagem estática**: Reduz bugs em produção
- **Ecossistema rico**: shadcn/ui, TanStack Query
- **Performance**: Virtual DOM e Vite build

### Por que Supabase?
- **Rapidez de desenvolvimento**: Backend pronto sem infraestrutura
- **Realtime nativo**: Essencial para tracking ao vivo
- **PostgreSQL**: Banco robusto e relacional
- **RLS**: Segurança granular sem backend customizado

### Por que n8n?
- **Automação no-code**: Analista pode criar workflows
- **Flexibilidade**: Scraping, emails, webhooks
- **Manutenibilidade**: Visual workflow editor

### Por que Vite (não CRA)?
- **Velocidade**: Dev server instantâneo
- **Build otimizado**: Code splitting automático
- **HMR**: Hot reload extremamente rápido

### Trade-offs

**Lovable vs. Vercel/Netlify**:
- ✅ Deploy automático e integrado com desenvolvimento
- ⚠️ Menos controle sobre infraestrutura

**Supabase vs. Backend customizado**:
- ✅ Desenvolvimento 10x mais rápido
- ✅ Custos operacionais baixos
- ⚠️ Limitações em lógica de negócio complexa

**n8n Scraping vs. API oficial FedEx**:
- ✅ Sem custos de API
- ✅ Dados mais completos (visual do site)
- ⚠️ Pode quebrar se FedEx mudar layout
- ⚠️ Rate limiting manual necessário

## Segurança

### Frontend
- **Sanitização**: Validação com Zod
- **HTTPS**: Forçado em produção
- **CORS**: Configurado no Supabase

### Backend (Supabase)
- **Row Level Security**: Controle de acesso por usuário
- **JWT Authentication**: Tokens seguros
- **Rate Limiting**: Proteção contra abuso
- **Auditoria**: Logs de todas as operações

### Dados Sensíveis
- Variáveis de ambiente (`.env`) não commitadas
- API keys no Supabase (server-side)
- Dados de clientes protegidos por RLS

## Monitoramento e Logs

### Frontend
- `console.log` para debugging (deve ser removido em prod)
- Toast notifications para usuário
- Error boundaries (a implementar)

### Backend
- Supabase Dashboard: Logs de queries
- n8n: Logs de execução de workflows
- Sem APM (Application Performance Monitoring) ainda

## Próximas Evoluções Técnicas

- **Testes**: Jest + React Testing Library (não implementado)
- **E2E**: Playwright (planejado)
- **Monitoring**: Sentry para error tracking
- **Analytics**: Posthog para product analytics
- **Mobile**: React Native (futuro distante)
