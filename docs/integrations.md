# Integrações

## Repositórios e Serviços Relacionados

### Supabase (Backend-as-a-Service)
**Tipo**: PostgreSQL Database + Realtime + Authentication
**Propósito**: Backend completo do sistema sem necessidade de servidor próprio
**Protocolo**: REST API (PostgREST) + WebSocket (Realtime)
**Dependência**: Crítica - Sistema não funciona sem Supabase

**Dados Trocados**:
- **Leitura**: Sales Orders, Cargas, Notificações, Usuários
- **Escrita**: Inserção e atualização de SOs, cargas, notificações
- **Realtime**: Subscriptions para mudanças em tempo real

**Tratamento de Falhas**:
- Retry automático (3 tentativas)
- Cache local via TanStack Query (5 minutos)
- Toast notification se erro persistir
- Fallback para dados em cache se offline

**Configuração**:
```tsx
// src/integrations/supabase/client.ts
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);
```

**Tabelas Utilizadas**:
- `envios_processados`: Sales Orders
- `cargas`: Cargas consolidadas
- `carga_sales_orders`: Relacionamento N:N
- `notification_queue`: Fila de notificações
- `profiles`: Perfis de usuários
- `shipment_history`: Histórico de eventos
- `auth_attempts`: Rastreamento de login
- `auth.users`: Autenticação (gerenciada pelo Supabase)

### Edge Functions (9 funções)

Todas as Edge Functions estão em `/supabase/functions/` e usam `SUPABASE_SERVICE_ROLE_KEY` para bypass de RLS.

| Função | Propósito |
|---|---|
| `ingest-envios` | Ingestion de SOs via HTTP POST (usado pelo n8n) |
| `update-tracking` | Atualização de status/tracking de SOs |
| `update-envio-data` | Atualização de datas de SO |
| `query-envios` | Consulta de SOs com filtros e paginação |
| `upsert-carga` | Inserção/atualização de cargas |
| `link-sos-to-carga` | Vinculação de SOs a cargas |
| `bulk-update-cargas` | Update em lote de múltiplas cargas |
| `generate-report` | Geração de relatório em PDF |
| `export-data` | Export completo de dados (CSV, XLSX, JSON) |

**Código Compartilhado** (`_shared/`):
- `rate-limiter.ts`: Proteção contra abuso de API
- `translations.ts`: Mapeamento de status FedEx → português
- `security.ts`: Funções de segurança e validação

**Realtime Subscriptions**:
```tsx
// LogisticsDashboard.tsx:322-356
const enviosChannel = supabase
  .channel('envios-changes')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'envios_processados'
  }, (payload) => {
    toast({ title: "Dados Atualizados" });
    loadDashboardData();
  })
  .subscribe();
```

**Segurança**:
- Row Level Security (RLS) habilitada
- JWT tokens para autenticação
- API keys públicas (anon key) - segurança via RLS
- Políticas de acesso por role (admin/user)

**Monitoramento**:
- Supabase Dashboard: Queries, latência, erros
- Logs de auditoria automáticos
- Métricas de uso (storage, bandwidth)

---

### n8n (Workflow Automation)
**Tipo**: Ferramenta de automação no-code
**Propósito**: Automatizar coleta de dados de emails, scraping FedEx, processamento de planilhas
**Protocolo**: HTTP Webhooks, API calls
**Dependência**: Alta - Principal fonte de dados automáticos

**Workflows Implementados**:

#### 1. Email Orchestrator (`0-Email Orchestrator.json`)
**Função**: Orquestrar processamento de emails recebidos do fornecedor.

**Fluxo**:
1. Conecta ao Microsoft Outlook via IMAP/Graph API
2. Filtra emails com assunto contendo "Daily Order Report"
3. Extrai anexos (planilhas Excel)
4. Chama workflow "Processar Daily Order Report"
5. Marca email como lido

**Trigger**: Cron (a cada 30 minutos)

**Dados Extraídos**:
- Remetente (fornecedor)
- Data do email
- Anexos (arquivos .xlsx ou .xls)

**Tratamento de Erros**:
- Retry em caso de falha IMAP
- Log de emails não processados
- Notificação para admin se falha persistir

---

#### 2. Processar Daily Order Report (`1-Processar Daily Order Report.json`)
**Função**: Processar planilhas Excel anexadas aos emails.

**Fluxo**:
1. Recebe arquivo Excel do Email Orchestrator
2. Parse da planilha (biblioteca `xlsx`)
3. Validação de dados (campos obrigatórios, formatos)
4. Transformação de dados para formato do Supabase
5. Inserção/atualização em `envios_processados`
6. Registro de log no n8n

**Campos Parseados**:
- Sales Order
- Cliente
- Produtos
- Status Atual
- Data de Ordem
- Data de Envio
- Valor Total

**Validações**:
- Sales Order não vazio
- Data em formato válido (DD/MM/YYYY ou ISO)
- Status em lista permitida

**Tratamento de Erros**:
- Linhas com erro são logadas mas não travam o processo
- Email para admin com resumo de erros
- Dados válidos são importados mesmo com erros parciais

---

#### 3. Scraper FedEx Tracking (`2-Scrapper FedEx Tracking.json`)
**Função**: Buscar status de rastreamento no site da FedEx.

**Fluxo**:
1. Busca tracking numbers pendentes no Supabase
2. Para cada tracking:
   - Acessa página de rastreamento FedEx
   - Extrai status, localização, data de atualização
   - Parseia histórico de eventos
3. Atualiza `envios_processados` com novos dados
4. Marca tracking como "verificado"

**Técnica**:
- HTTP requests com User-Agent simulado
- Parsing de HTML com n8n HTML node
- Rate limiting: 1 request a cada 3 segundos (evitar ban)

**Dados Extraídos**:
- Status atual ("In Transit", "Delivered", etc.)
- Localização atual
- Data e hora da última atualização
- Histórico completo de movimentações

**Tratamento de Erros**:
- Se FedEx retornar CAPTCHA: aguardar 5 minutos e tentar novamente
- Se tracking não encontrado: marcar como "inválido"
- Máximo de 3 tentativas por tracking

**Limitações**:
- ⚠️ Pode quebrar se FedEx mudar layout do site
- ⚠️ Rate limiting manual (não usa API oficial)
- ⚠️ Não funciona para todos os tipos de tracking

---

#### 4. Atualizar Cargas (`3-Atualizar Cargas.json`)
**Função**: Sincronizar status de cargas com base nas SOs vinculadas.

**Fluxo**:
1. Lista todas as cargas ativas
2. Para cada carga:
   - Busca SOs vinculadas
   - Calcula status predominante
   - Atualiza `data_ultima_atualizacao`
3. Se todas as SOs entregues → marca carga como "Entregue"

**Regras de Cálculo de Status**:
- Se pelo menos 1 SO "Em Trânsito" → Carga "Em Trânsito"
- Se todas "Chegada no Brasil" → Carga "Chegada no Brasil"
- Se todas "Entregue" → Carga "Entregue"

**Trigger**: Cron (diariamente às 6h)

---

#### 5. FedEx Tracking Check (`FedEx Tracking Check.json`)
**Função**: Verificação periódica de status de trackings críticos.

**Fluxo**:
1. Filtra SOs com SLA < 3 dias (críticas)
2. Força update de tracking via scraping
3. Envia notificação se houver mudança de status

**Trigger**: Cron (a cada 2 horas)

---

**Integração n8n ↔ Supabase**:
```
n8n → HTTP Request → Supabase REST API → Database
```

**Autenticação n8n**:
- Service Role Key do Supabase (com bypass de RLS)
- Armazenada como credencial no n8n
- Nunca exposta no frontend

**Logs e Monitoramento**:
- n8n Dashboard: Execuções, erros, timing
- Webhook para Slack em caso de falhas (planejado)

---

### FedEx (Rastreamento de Envios)
**Tipo**: Scraping de site público (não API oficial)
**Propósito**: Obter status de rastreamento de pacotes em tempo real
**Protocolo**: HTTP (scraping via n8n)
**Dependência**: Média - Importante mas não crítica

**Dados Consumidos**:
- Tracking numbers de envios internacionais
- Frequência: A cada 2-4 horas (SOs críticas)

**Dados Obtidos**:
- Status da entrega ("In Transit", "Out for Delivery", "Delivered")
- Localização atual do pacote
- Histórico de movimentações
- Data estimada de entrega

**Limitações**:
- Não usa API oficial FedEx (custo alto)
- Rate limiting manual para evitar bloqueio
- Dependente de estrutura HTML do site
- Pode requerer CAPTCHA em alguns casos

**Alternativa Futura**:
- 🔄 Migrar para FedEx API oficial (custo ~$500/mês)
- Benefícios: Dados mais confiáveis, sem risco de bloqueio
- Desafio: Aprovação comercial do custo

---

### Microsoft Outlook (Processamento de Emails)
**Tipo**: Cliente de email (via IMAP ou Microsoft Graph API)
**Propósito**: Receber e processar emails automáticos de fornecedores
**Protocolo**: IMAP ou Graph API REST
**Dependência**: Média - Importante para automação

**Integração**:
- n8n conecta ao Outlook corporativo
- Filtra emails por remetente e assunto
- Baixa anexos (.xlsx, .pdf)

**Emails Processados**:
- **Daily Order Report**: Planilha com SOs do dia
- **Shipping Notification**: Confirmação de embarque
- **Arrival Notice**: Notificação de chegada no Brasil

**Configuração**:
```json
{
  "credentials": {
    "email": "importacao@sintese.com",
    "method": "OAuth2" // ou IMAP
  },
  "filters": {
    "from": ["fornecedor@supplier.com"],
    "subject": ["Daily Order", "Shipping"]
  }
}
```

**Tratamento de Anexos**:
- Anexos salvos temporariamente no n8n
- Processados via workflow "Processar Daily Order Report"
- Deletados após processamento bem-sucedido

**Segurança**:
- OAuth2 para autenticação (sem senha hardcoded)
- Acesso read-only (não envia emails)
- Logs de todos os emails processados

---

## Dependências Externas Críticas

### Lovable (Plataforma de Deploy)
**Tipo**: Plataforma de desenvolvimento e deploy
**Propósito**: Hospedagem do frontend e CI/CD automático
**URL**: https://lovable.dev/projects/8fd524cc-6a33-4a16-acee-60ff60b6e6e8

**Funcionalidades**:
- Build automático ao fazer commit
- Deploy para CDN global
- Integração com Git (bidirecional)
- Preview environments

**Dependência**: Crítica - Frontend hospedado na plataforma

**Alternativas**:
- Vercel
- Netlify
- Self-hosted (Nginx + Docker)

---

### date-fns (Biblioteca de Datas)
**Tipo**: Biblioteca JavaScript
**Propósito**: Manipulação e cálculo de datas (SLA, dias úteis)

**Uso Principal**:
- Cálculo de diferença entre datas
- Formatação de datas em pt-BR
- Adição/subtração de dias úteis (futura correção do SLA)

**Importância**: Alta - Essencial para regra de negócio de SLA

---

### XLSX (SheetJS)
**Tipo**: Biblioteca JavaScript
**Propósito**: Leitura e escrita de arquivos Excel

**Uso**:
- Export de SOs para `.xlsx`
- Import de cargas via bulk upload
- Parsing de planilhas de fornecedores (n8n)

**Importância**: Média - Funcionalidade importante mas tem alternativas

---

### Recharts
**Tipo**: Biblioteca de gráficos React
**Propósito**: Visualização de dados analíticos

**Uso**:
- Gráficos de linha (tendências)
- Gráficos de barra (comparações)
- Gráficos de pizza (distribuições)

**Importância**: Baixa - Funcionalidade secundária

---

## Integrações Futuras (Planejadas)

### DHL / UPS (Rastreamento)
**Prioridade**: Média
**Objetivo**: Diversificar transportadoras internacionais além da FedEx

**Integração Planejada**:
- APIs oficiais DHL e UPS
- Scraping como fallback
- Unificação de dados de múltiplas transportadoras

---

### SAP (ERP da Síntese)
**Prioridade**: Alta
**Objetivo**: Sincronização bidirecional de dados

**Dados do SAP → Tracker**:
- Clientes (cadastro mestre)
- Produtos (catálogo)
- Sales Orders (pedidos novos)

**Dados do Tracker → SAP**:
- Status de entrega
- Datas de chegada real
- Custos de frete (quando implementado)

**Desafios**:
- SAP on-premise (não cloud)
- Firewall corporativo
- Necessidade de connector ou middleware

---

### Receita Federal (Siscomex)
**Prioridade**: Média-Baixa
**Objetivo**: Automação de consultas de desembaraço

**Funcionalidades Planejadas**:
- Consulta de status de DI (Declaração de Importação)
- Download de documentos fiscais
- Alertas sobre pendências documentais

**Desafios**:
- API Siscomex complexa
- Certificado digital A1/A3 necessário
- Regulamentações rigorosas

---

### Transportadoras Locais (Jamef, Braspress, etc.)
**Prioridade**: Média
**Objetivo**: Rastrear última milha (Síntese → Cliente Final)

**Integração**:
- APIs de rastreamento
- Webhooks para atualizações automáticas
- Geração de etiquetas de envio

---

### WhatsApp Business API
**Prioridade**: Baixa
**Objetivo**: Notificações via WhatsApp para clientes

**Funcionalidades**:
- Notificação de chegada de carga
- Status on-demand via chatbot
- Link de rastreamento

---

### Context7 & Linear (Gerenciamento de Projeto)
**Prioridade**: Baixa (uso interno)
**Objetivo**: Organizar issues e documentação do projeto

**Integração Mencionada pelo Usuário**:
> "conectei também as API's do context 7 e linear para que você possa organizar tudo em tempo real lá também"

**Uso Potencial**:
- Sincronizar bugs e features com Linear
- Documentar contexto do projeto no Context7
- Rastreabilidade de mudanças

---

## Contratos de Integração

### Formato de Dados: Sales Order (Supabase)
```typescript
interface SalesOrder {
  id: number;
  sales_order: string;          // Unique identifier
  cliente: string;
  produtos: string | object;
  valor_total?: number;
  status_atual: string;
  ultima_localizacao?: string;
  data_ultima_atualizacao: string;
  data_ordem?: string;
  data_envio?: string;
  created_at: string;
  updated_at: string;
  erp_order?: string;
  web_order?: string;
  tracking_numbers?: string[];
}
```

---

### Formato de Dados: Carga (Supabase)
```typescript
interface Carga {
  id: number;
  numero_carga: string;         // Unique identifier
  tipo_temperatura: 'Ambiente' | 'Controlada';
  status: string;
  data_chegada_prevista?: string;
  data_armazem?: string;
  data_embarque?: string;
  data_entrega?: string;
  origem?: string;
  destino?: string;
  transportadora?: string;
  mawb?: string;                // Master Air Waybill
  hawb?: string;                // House Air Waybill
  created_at: string;
  updated_at: string;
}
```

---

### Webhook Format (n8n → Supabase)
```json
{
  "event": "so_updated",
  "timestamp": "2026-01-29T10:00:00Z",
  "data": {
    "sales_order": "SO-2024-001",
    "status_atual": "Em Trânsito",
    "ultima_localizacao": "São Paulo, SP - Brasil",
    "data_ultima_atualizacao": "2026-01-29T10:00:00Z"
  },
  "source": "n8n-fedex-scraper"
}
```

---

## Resiliência e Recuperação

### Circuit Breaker Pattern (Planejado)
**Objetivo**: Evitar sobrecarga quando serviços externos falham.

**Implementação Futura**:
```tsx
if (failureCount > 5) {
  // Open circuit, stop calling Supabase
  return cachedData;
}
```

---

### Retry Strategy
**Implementação Atual**:
- 3 tentativas com backoff exponencial
- Delay: 1s, 2s, 4s

**Código** (TanStack Query):
```tsx
useQuery({
  queryKey: ['envios'],
  queryFn: fetchEnvios,
  retry: 3,
  retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000)
});
```

---

### Fallback para Cache Local
Se Supabase estiver offline:
1. TanStack Query retorna dados do cache (até 5 minutos)
2. Banner amarelo: "Usando dados em cache, última atualização: ..."
3. Botão "Tentar Novamente"

---

### Timeouts
- Supabase queries: 10s timeout
- n8n workflows: 60s timeout
- Scraping FedEx: 30s por tracking

---

## Monitoramento de Integrações

### Health Checks
**Supabase**:
- Endpoint: `https://[project].supabase.co/rest/v1/`
- Verificação: A cada 5 minutos
- Alerta se: > 3 falhas consecutivas

**n8n**:
- Endpoint: Webhook de health check
- Verificação: A cada 15 minutos
- Alerta se: workflow não executado nas últimas 2 horas

---

### Logs de Integração
**Onde**:
- Supabase: Logs de queries no dashboard
- n8n: Logs de execução de workflows
- Frontend: Console.log (debugging)

**Retenção**:
- Supabase: 7 dias (plano free)
- n8n: 30 dias
- Frontend: Não persistido

---

### Métricas Importantes
- Latência de queries Supabase (média < 200ms)
- Taxa de sucesso n8n workflows (> 95%)
- Taxa de sucesso scraping FedEx (> 80%)
- Uptime do sistema (> 99.5%)

---

*Documentação de integrações atualizada conforme novas integrações são adicionadas*
