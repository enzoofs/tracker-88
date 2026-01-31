# Síntese Tracker

## Propósito e Papel

O **Síntese Tracker** é um sistema de rastreamento logístico interno desenvolvido para a Síntese, empresa de biotecnologia brasileira. Este sistema resolve o problema crítico de rastreamento manual de cargas internacionais de produtos químicos e biológicos, substituindo processos baseados em planilhas Excel e emails dispersos por uma solução centralizada e automatizada.

O sistema gerencia 200+ Sales Orders por mês, fornecendo visibilidade completa do fluxo logístico desde a produção internacional até a entrega final. Os principais usuários são a equipe de importação/logística (que gerencia as cargas), gerência e diretoria (que consomem dashboards executivos), e a área comercial/vendas (que acompanha entregas para clientes).

**Tipo de repositório**: Frontend Web Application (SPA) com automação backend via n8n

## Funcionalidades Principais

### Dashboard Executivo em Tempo Real
Painel centralizado com métricas operacionais atualizadas automaticamente: SOs ativas, cargas em trânsito, chegadas esperadas nos próximos 7 dias, shipments críticos e contagens por status (Em Produção, Em Importação, Atrasadas). Usa Supabase Realtime para updates instantâneos.

### Rastreamento de Sales Orders
Tabela completa com busca, filtros e ordenação de todas as SOs. Permite consultar status individual, visualizar histórico de eventos, filtrar por cliente/status/data, toggle de SOs entregues, e exportação para Excel. Cada SO exibe número de pedido, cliente, produtos, status com badges coloridos, localização, datas e tracking numbers FedEx.

### Gestão de Cargas Consolidadas
Sistema de consolidação onde 1 carga = N Sales Orders. Visualização em cards de cargas ativas com tipo de temperatura (Ambiente/Controlada), status, data de chegada prevista, MAWB/HAWB, e lista de SOs vinculadas. Inclui alerta visual para cargas com dados faltantes (data de armazém, embarque ou entrega).

### Cálculo Automático de SLA
Hook React que calcula automaticamente o SLA de 15 dias úteis para cada SO e classifica urgência (🔴 Overdue, 🟡 Critical ≤1 dia, 🟠 Warning ≤3 dias, 🟢 Ok >3 dias). **IMPORTANTE**: Implementação atual está incorreta (calcula 15 dias corridos a partir de data_armazem), deve ser corrigida para 15 dias úteis a partir de data_envio.

### Upload em Massa de Cargas
Funcionalidade de bulk upload via planilhas Excel (.xlsx/.xls) para atualizar múltiplas cargas simultaneamente. Inclui validação de dados, preview antes de confirmar, e tratamento de erros por linha. Criado para atualizações massivas após períodos offline.

### Exportação de Dados
Export de SOs visíveis para Excel (.xlsx) com todos os campos relevantes. Também suporta geração de relatórios em PDF via jsPDF e html2canvas.

### Analytics e Relatórios
Gráficos interativos (Line, Bar, Area, Pie) para análise de tendências de entregas, distribuição de status e volumes ao longo do tempo. **Status**: Componentes UI implementados, mas lógica de análise preditiva e identificação de gargalos ainda em desenvolvimento.

## Stack Básica

**Linguagem**: TypeScript 5.5.3
**Framework Principal**: React 18.3.1 com Vite 5.4.1
**Banco de Dados**: PostgreSQL 15 (via Supabase Cloud)
**Infraestrutura**: Frontend hospedado no Lovable, Backend no Supabase Cloud, Automação via n8n

### Tecnologias Chave
- **shadcn/ui + Radix UI**: Sistema de componentes acessíveis com 30+ componentes (Dialog, Tabs, Card, etc.)
- **TailwindCSS 3.4.11**: Framework CSS utility-first com dark/light mode
- **@supabase/supabase-js 2.58.0**: Cliente oficial para PostgreSQL + Realtime + Auth
- **TanStack Query 5.56.2**: Cache e sincronização de estado do servidor
- **Recharts 2.15.4**: Biblioteca de gráficos para visualizações de dados
- **xlsx 0.18.5**: Leitura/escrita de arquivos Excel
- **date-fns 3.6.0**: Manipulação de datas (cálculo de SLA)
- **React Hook Form 7.53.0 + Zod 3.23.8**: Formulários com validação type-safe

## Integrações e Dependências

### Repositórios/Serviços Relacionados

#### Supabase (Backend-as-a-Service)
- **Tipo**: PostgreSQL Database + Realtime WebSocket + Authentication (JWT)
- **Relação**: Backend completo do sistema - DEPENDÊNCIA CRÍTICA
- **Dados trocados**: CRUD de Sales Orders (`envios_processados`), Cargas (`cargas`), relacionamentos N:N (`carga_sales_orders`), notificações (`notification_queue`), autenticação de usuários
- **Recursos**: Row Level Security (RLS) para controle de acesso, Realtime subscriptions para updates automáticos, PostgREST API auto-gerada

#### n8n (Workflow Automation)
- **Tipo**: Ferramenta de automação no-code/low-code - DEPENDÊNCIA ALTA
- **Relação**: Principal fonte de dados automáticos via workflows
- **Dados trocados**: Recebe emails de fornecedores, faz scraping de tracking FedEx, processa planilhas Excel, insere/atualiza dados no Supabase
- **Workflows** (arquivos JSON na raiz):
  - `0-Email Orchestrator.json`: Processa emails do Outlook
  - `1-Processar Daily Order Report.json`: Parse de planilhas Excel
  - `2-Scrapper FedEx Tracking.json`: Scraping de status FedEx
  - `3-Atualizar Cargas.json`: Sincroniza status de cargas
  - `FedEx Tracking Check.json`: Verificação periódica de trackings críticos

#### FedEx (Rastreamento de Envios)
- **Tipo**: Scraping de site público (não API oficial) - DEPENDÊNCIA MÉDIA
- **Relação**: Consome tracking numbers, retorna status/localização/histórico
- **Dados trocados**: Status de entrega, localização atual, histórico de movimentações, data estimada de entrega
- **Limitação**: Dependente de estrutura HTML do site, rate limiting manual, pode requerer CAPTCHA

#### Microsoft Outlook (Processamento de Emails)
- **Tipo**: Cliente de email via IMAP ou Microsoft Graph API - DEPENDÊNCIA MÉDIA
- **Relação**: n8n conecta ao Outlook para processar emails automáticos de fornecedores
- **Dados trocados**: Emails com "Daily Order Report", planilhas Excel anexadas, notificações de embarque

### Dependências Externas Críticas
- **Lovable**: Plataforma de deploy do frontend com CI/CD automático
- **date-fns**: Biblioteca essencial para cálculo de SLA e manipulação de datas
- **XLSX (SheetJS)**: Parsing e geração de planilhas Excel para bulk upload e export

## Domínio de Responsabilidade

O Síntese Tracker é responsável pela **visibilidade e gestão do ciclo de vida logístico** de produtos biotecnológicos importados. Seu bounded context abrange:

- **Agregados Principais**: Sales Order (SO) e Carga Consolidada
- **Fluxo Operacional Completo**: Produção → FedEx → Armazém Agente → Embarque → Brasil → Desembaraço → Entrega na Síntese → (Futuro: Cliente Final)
- **Responsabilidades**: Rastreamento de status em tempo real, cálculo de SLA, consolidação de cargas, alertas de atrasos, reportes executivos, integração com fornecedores e transportadoras

**Não é responsável por**: Sistema ERP (SAP), gestão de estoque interno, faturamento, gestão de compras (apenas rastreia após compra aprovada)

## Regras de Negócio Críticas

- **RN001 - SLA de 15 Dias Úteis**: Todas as SOs devem ser entregues em 15 dias úteis após envio para FedEx. Violação resulta em clientes insatisfeitos, perda de parcerias e multas em licitações. **⚠️ IMPLEMENTAÇÃO INCORRETA**: Código atual calcula 15 dias corridos a partir de data_armazem, deve ser corrigido para dias úteis a partir de data_envio.

- **RN002 - Consolidação por Temperatura**: Múltiplas SOs são consolidadas em 1 carga (1:N). Cargas de temperatura ambiente NÃO podem misturar com cargas controladas. Frequência típica: 1 embarque ambiente + 1 controlado por semana. Status da carga prevalece sobre status individual da SO.

- **RN003 - Controle de Temperatura**: Produtos biológicos exigem cold chain rigorosa. Tipos: Ambiente (15°C-25°C) ou Controlada (2°C-8°C ou -20°C). Requisitos regulatórios ANVISA/FDA aplicam-se.

- **RN004 - Atualização Automática via n8n**: Dados de rastreamento atualizados automaticamente via workflows. Dados do n8n sobrescrevem dados manuais (exceto se marcado "Não Atualizar"). SOs "Entregues" são travadas para edição.

- **RN005 - Dados Obrigatórios para SLA**: Campos críticos para cálculo correto: `data_envio` (para SLA), `data_armazem`, `data_embarque`, `data_entrega`. Sistema exibe alerta visual quando cargas têm dados faltantes.

## Arquitetura e Padrões

**Padrão Arquitetural**: Component-Based Architecture (React) com separação Container/Presentational

**Principais Padrões**:
- **Custom Hooks Pattern**: Lógica de negócio extraída em hooks reutilizáveis (useSLACalculator, useAuth, useToast)
- **Provider Pattern**: Contextos React para estado global (AuthProvider, ThemeProvider, QueryClientProvider)
- **Compound Components**: Componentes complexos compostos via shadcn/ui
- **State Management**: Local state (useState), Server state (TanStack Query), Global state (Context API)
- **Error Handling**: Try-catch com toast notifications, Supabase error objects, retry automático (3 tentativas)

**Organização de Código**:
```
src/
├── components/
│   ├── auth/           # Autenticação (AuthProvider, ProtectedRoute)
│   ├── dashboard/      # Dashboard principal (19 componentes)
│   └── ui/             # shadcn/ui components (30+ componentes)
├── hooks/              # Custom hooks (useSLACalculator)
├── integrations/       # Cliente Supabase
├── lib/                # Utilitários
└── pages/              # Rotas (Index, Login)
```

## Informações de Referência

**Repositório**: Local (`c:\sintese-tracker\tracker-88`)
**Caminho Local**: `c:\sintese-tracker\tracker-88`
**Documentação Completa**: [docs/](../docs/) na raiz do repositório
**Tipo**: Frontend (SPA) + Automação Backend
**Deploy**: [Lovable Production](https://lovable.dev/projects/8fd524cc-6a33-4a16-acee-60ff60b6e6e8)
**Status**: Em produção desde 2024

---

*Este resumo foi gerado a partir da documentação em `docs/`. Para informações detalhadas, consulte os arquivos específicos na pasta de documentação do repositório.*
