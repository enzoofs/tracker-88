# Funcionalidades

## Funcionalidades Principais

### 1. Dashboard Executivo em Tempo Real
**Status**: ✅ Implementado
**Componente**: [LogisticsDashboard.tsx](../src/components/dashboard/LogisticsDashboard.tsx)

**Descrição**: Dashboard centralizado com visão geral de todas as cargas e sales orders em tempo real.

**Casos de Uso**:
- Visualizar status geral das operações (SOs ativas, em trânsito, entregas esperadas)
- Monitorar cargas críticas e atrasadas
- Identificar rapidamente gargalos operacionais

**Componentes Envolvidos**:
- `LogisticsDashboard`: Container principal
- `Overview`: Cards de métricas (SOs ativas, em trânsito, chegadas esperadas)
- `ParticleBackground`: Efeito visual de fundo

**Dependências**:
- Supabase Realtime (updates automáticos)
- TanStack Query (cache de dados)

**Métricas Exibidas**:
- SOs Ativas (não entregues)
- Cargas em Trânsito
- Chegadas Esperadas (próximos 7 dias)
- SOs Críticas (com atraso)
- Status Counts: Em Produção, Em Importação, Atrasadas

---

### 2. Rastreamento de Sales Orders (SOs)
**Status**: ✅ Implementado
**Componente**: [SOTable.tsx](../src/components/dashboard/SOTable.tsx)

**Descrição**: Tabela completa de todas as sales orders com filtros, ordenação e busca.

**Casos de Uso**:
- Consultar status de uma SO específica por número de pedido
- Filtrar SOs por cliente, status ou data
- Ver histórico completo de uma SO
- Exportar lista de SOs para Excel

**Componentes Envolvidos**:
- `SOTable`: Tabela principal com paginação
- `SODetails`: Modal com detalhes completos da SO
- `Timeline`: Histórico de eventos da SO

**Funcionalidades da Tabela**:
- **Busca**: Por número de SO, cliente ou produto
- **Ordenação**: Por qualquer coluna (data, status, cliente)
- **Filtros**: Por status, cliente, data de envio
- **Paginação**: 20 SOs por página
- **Toggle**: Mostrar/ocultar SOs entregues
- **Export**: Para arquivo XLSX

**Campos Exibidos**:
- Número da Sales Order
- Cliente
- Produtos
- Status Atual (com badge colorido)
- Última Localização
- Data de Atualização
- SAP SO (ERP Order)
- WO (Web Order)
- Tracking Numbers

**Badges de Status**:
- 🟢 **Em Produção**: Verde
- 🔵 **Em Trânsito**: Azul
- 🟡 **Em Importação**: Amarelo
- 🟠 **Desembaraço**: Laranja
- ✅ **Entregue**: Verde escuro
- 🔴 **Atrasado**: Vermelho (calculado dinamicamente)

---

### 3. Gestão de Cargas Consolidadas
**Status**: ✅ Implementado
**Componente**: [CargoCard.tsx](../src/components/dashboard/CargoCard.tsx)

**Descrição**: Visualização e gestão de cargas consolidadas que agrupam múltiplas SOs.

**Casos de Uso**:
- Visualizar todas as cargas em andamento
- Ver quais SOs estão vinculadas a cada carga
- Monitorar data de chegada prevista
- Identificar cargas com dados faltantes

**Componentes Envolvidos**:
- `CargoCard`: Card visual de cada carga
- `CargoDetails`: Modal detalhado com todas as SOs vinculadas
- `BulkCargoUpload`: Upload em massa de cargas

**Informações da Carga**:
- Número da Carga
- Tipo de Temperatura (Ambiente / Controlada)
- Status Atual
- Data de Chegada Prevista
- Origem / Destino
- Transportadora
- MAWB / HAWB (números de embarque)
- Número de SOs Vinculadas

**Relacionamento**:
- 1 Carga → N Sales Orders
- Tabela de junção: `carga_sales_orders`

**Alerta de Dados Faltantes**:
- Sistema detecta cargas sem data de armazém, embarque ou entrega
- Exibe banner amarelo alertando sobre cargas incompletas
- Permite clicar para editar cargas com problemas

---

### 4. Cálculo Automático de SLA
**Status**: ✅ Implementado
**Hook**: [useSLACalculator.ts](../src/hooks/useSLACalculator.ts)

**Descrição**: Calcula automaticamente o SLA (15 dias úteis) de cada SO e identifica atrasos.

**Casos de Uso**:
- Identificar SOs atrasadas automaticamente
- Priorizar ações com base na urgência (critical, warning, ok)
- Calcular dias restantes até vencimento do SLA

**Lógica Implementada** (✅ Corrigido):
```
SLA = 15 dias ÚTEIS a partir de data_envio (envio para FedEx)
Usa: differenceInBusinessDays da date-fns
```

**Níveis de Urgência**:
- 🔴 **Overdue**: SLA vencido (daysLeft < 0)
- 🟡 **Critical**: ≤ 1 dia útil restante
- 🟠 **Warning**: ≤ 3 dias úteis restantes
- 🟢 **Ok**: > 3 dias úteis restantes

**Componentes que Usam**:
- `SOTable`: Badge de urgência em cada linha
- `Overview`: Contagem de SOs atrasadas
- `CargoCard`: Indicador visual de urgência

**Retorno do Hook**:
```tsx
interface SLAResult {
  daysRemaining: number;           // Dias restantes para entrega
  urgency: 'ok' | 'warning' | 'critical' | 'overdue';
  expectedDays: number;            // SLA interno (15 dias)
  deliveryForecastDays: number;    // Previsão ao cliente
  daysSinceUpdate: number;         // Dias úteis desde envio
  stage: string;                   // Estágio atual
}
```

---

### 5. Sistema de Notificações
**Status**: ⚠️ Parcialmente Implementado
**Componente**: [NotificationCenter.tsx](../src/components/dashboard/NotificationCenter.tsx)

**Descrição**: Central de notificações para alertas de chegadas e atrasos.

**Casos de Uso** (planejados):
- Notificar quando carga chega no Brasil
- Alertar sobre atrasos de SLA
- Informar sobre mudanças de status críticas

**Estado Atual**:
- ✅ Botão de notificações com contador no header
- ✅ Modal de NotificationCenter implementado
- ✅ Tabela `notification_queue` no Supabase
- ⚠️ Lógica de disparo de notificações não implementada
- ⚠️ Realtime subscription configurada mas não totalmente funcional

**Componentes Envolvidos**:
- `NotificationCenter`: Modal com lista de notificações
- `notification_queue` (tabela Supabase)
- Realtime subscription para INSERT na tabela

**Campos da Notificação**:
- Título
- Mensagem
- Prioridade (baixa, média, alta)
- Status (pendente, lida, arquivada)
- Timestamp

**Próximos Passos**:
- Implementar triggers no Supabase para disparar notificações
- Conectar n8n para enviar notificações por email
- Adicionar filtros por prioridade e status

---

### 6. Analytics e Relatórios
**Status**: ⚠️ Parcialmente Implementado
**Componentes**: [Charts.tsx](../src/components/dashboard/Charts.tsx), [Reports.tsx](../src/components/dashboard/Reports.tsx)

**Descrição**: Visualizações de dados e relatórios operacionais para análise de tendências.

**Casos de Uso**:
- Analisar tendências de entregas ao longo do tempo
- Identificar fornecedores/clientes com mais atrasos
- Gerar relatórios executivos mensais
- Visualizar distribuição de status das cargas

**Componentes Implementados**:
- `Charts`: Gráficos interativos com Recharts
- `Reports`: Geração de relatórios em PDF/Excel
- `AdvancedAnalytics`: Análises mais profundas (em desenvolvimento)
- `TrendsAnalysis`: Identificação de padrões (em desenvolvimento)
- `StageTimingAnalysis`: Análise de tempo por etapa (em desenvolvimento)

**Gráficos Disponíveis**:
- Line Chart: Entregas ao longo do tempo
- Bar Chart: Status counts por período
- Area Chart: Volume de SOs por mês
- Pie Chart: Distribuição de status

**Tipos de Relatórios**:
- Relatório de SOs Ativas
- Relatório de Atrasos
- Relatório de Performance por Cliente
- Relatório Executivo Mensal

**Estado Atual**:
- ✅ Componentes criados e UI implementada
- ⚠️ Lógica de análise preditiva incompleta
- ⚠️ Identificação de gargalos em desenvolvimento
- ⚠️ Previsão de atrasos ainda não funcional

---

### 7. Upload em Massa de Cargas (Excel)
**Status**: ✅ Implementado
**Componente**: [BulkCargoUpload.tsx](../src/components/dashboard/BulkCargoUpload.tsx)

**Descrição**: Permite atualizar múltiplas cargas simultaneamente via upload de planilha Excel.

**Casos de Uso**:
- Atualizar datas de embarque de múltiplas cargas de uma vez
- Sincronizar dados de cargas com planilhas de fornecedores
- Corrigir dados em massa quando necessário

**Funcionalidades**:
- Upload de arquivo `.xlsx` ou `.xls`
- Parsing automático da planilha
- Validação de dados antes da inserção
- Preview dos dados antes de confirmar
- Inserção/atualização em lote no Supabase

**Formato da Planilha**:
```
| numero_carga | tipo_temperatura | status | data_chegada_prevista | origem | destino | transportadora | mawb | hawb |
```

**Validações**:
- Campos obrigatórios: `numero_carga`, `tipo_temperatura`, `status`
- Formato de datas: DD/MM/YYYY ou YYYY-MM-DD
- Tipo de temperatura: "Ambiente" ou "Controlada"

**Tratamento de Erros**:
- Exibe linhas com erro na prévia
- Permite corrigir ou ignorar linhas problemáticas
- Toast notification de sucesso/erro

**Histórico de Uso**:
- Criado para atualização em massa após período offline
- Usado ocasionalmente para grandes atualizações
- Planejado para uso regular com planilhas de fornecedores

---

### 8. Exportação de Dados
**Status**: ✅ Implementado
**Localização**: Múltiplos componentes

**Descrição**: Exportar dados de SOs e cargas em formatos Excel e PDF.

**Casos de Uso**:
- Gerar relatórios para gerência
- Enviar status de cargas para clientes
- Backup manual de dados
- Análise offline no Excel

**Funcionalidades**:
- **Export para Excel**: Botão no header do dashboard
  - Exporta todas as SOs visíveis (filtradas)
  - Formato: `.xlsx`
  - Biblioteca: `xlsx` (SheetJS)
  - Nome do arquivo: `sintese-tracker-{data}.xlsx`

- **Export para PDF**: Via componente Reports
  - Gera PDFs formatados
  - Biblioteca: `jspdf` + `html2canvas`
  - Inclui gráficos e tabelas

**Campos Exportados (Excel)**:
- Sales Order
- Cliente
- Produtos
- Valor Total
- Status Atual
- Última Localização
- Data Atualização
- SAP SO
- WO
- Tracking Numbers

---

### 9. Autenticação e Controle de Acesso
**Status**: ✅ Implementado
**Componentes**: [AuthProvider.tsx](../src/components/auth/AuthProvider.tsx), [ProtectedRoute.tsx](../src/components/auth/ProtectedRoute.tsx)

**Descrição**: Sistema de autenticação com controle de acesso por roles.

**Casos de Uso**:
- Login seguro com email e senha
- Controle de acesso ao dashboard
- Diferentes permissões por tipo de usuário
- Logout e gerenciamento de sessão

**Roles Implementadas**:
- **Admin**: Acesso completo (cadastro, edição, exclusão)
- **User**: Visualização e relatórios (sem edição)

**Funcionalidades**:
- Login com Supabase Auth
- JWT tokens para autenticação
- Session management automática
- Refresh token rotation
- Logout seguro
- Route guards (ProtectedRoute)

**Segurança**:
- Senhas hasheadas pelo Supabase
- Row Level Security (RLS) no banco
- Controle de tentativas de login (security.ts)
- Session timeout automático

---

### 10. Tema Dark/Light Mode
**Status**: ✅ Implementado
**Provider**: [ThemeProvider.tsx](../src/components/auth/ThemeProvider.tsx)

**Descrição**: Alternância entre modo claro e escuro para conforto visual.

**Casos de Uso**:
- Uso noturno com tema dark
- Preferência pessoal do usuário
- Redução de cansaço visual

**Funcionalidades**:
- Toggle button no header
- Persistência da preferência (localStorage)
- Transições suaves entre temas
- Cores adaptadas para ambos os modos

**Implementação**:
- Biblioteca: `next-themes`
- CSS variables para cores
- TailwindCSS dark mode utilities

---

## Funcionalidades Secundárias

### Timeline de Eventos
**Status**: ✅ Implementado
**Componente**: [Timeline.tsx](../src/components/dashboard/Timeline.tsx)

Exibe histórico cronológico de eventos de uma SO ou carga.

**Eventos Capturados**:
- Mudanças de status
- Atualizações de localização
- Datas importantes (embarque, chegada, entrega)

### Smart Alerts
**Status**: 🔄 Em Desenvolvimento
**Componente**: [SmartAlerts.tsx](../src/components/dashboard/SmartAlerts.tsx)

Alertas inteligentes baseados em padrões e anomalias.

**Tipos de Alertas**:
- Atraso previsto (baseado em histórico)
- Carga parada há muito tempo em uma etapa
- Documentação faltante
- SLA próximo do vencimento

### Status Detail Dialog
**Status**: ✅ Implementado
**Componente**: [StatusDetailDialog.tsx](../src/components/dashboard/StatusDetailDialog.tsx)

Modal detalhado que mostra todas as SOs de um determinado status.

**Uso**:
- Clicar em um card de status no Overview
- Ver lista completa de SOs naquele status
- Filtrar e ordenar dentro do modal

---

## Funcionalidades Planejadas

### 🔄 Rastreamento até Cliente Final
**Prioridade**: Alta
**Estimativa**: Q1 2026

Estender rastreamento para incluir a etapa final de entrega ao cliente.

**Requisitos**:
- Integração com transportadoras locais
- Captura de comprovante de entrega
- Notificação ao cliente quando entregue

### 🔄 Portal Self-Service para Clientes
**Prioridade**: Média
**Estimativa**: Q2 2026

Permitir que clientes consultem suas próprias cargas sem intermediação.

**Funcionalidades**:
- Login separado para clientes
- Visualização filtrada (apenas suas cargas)
- Notificações por email/SMS
- Download de documentos

### 🔄 Integração com Mais Transportadoras
**Prioridade**: Média
**Estimativa**: Q2-Q3 2026

Além da FedEx, integrar com:
- DHL
- UPS
- Transportadoras locais brasileiras
- Frete marítimo

### 🔄 Previsão de Atrasos com Machine Learning
**Prioridade**: Baixa
**Estimativa**: Q3-Q4 2026

Usar ML para prever atrasos antes que aconteçam.

**Dados de Treinamento**:
- Histórico de cargas anteriores
- Tempos médios por etapa
- Fornecedores com padrão de atraso
- Época do ano, feriados

### 🔄 Automação de Desembaraço Aduaneiro
**Prioridade**: Média-Baixa
**Estimativa**: Q4 2026

Integração com sistemas da Receita Federal para agilizar desembaraço.

**Funcionalidades**:
- Upload automático de documentos
- Consulta de status de DI (Declaração de Importação)
- Alertas sobre pendências documentais

### 🔄 Mobile App
**Prioridade**: Baixa
**Estimativa**: 2027

Aplicativo móvel para notificações push e consultas rápidas.

**Plataformas**:
- iOS e Android
- Tecnologia: React Native (reutilizar código)

---

## Funcionalidades Deprecated ou Removidas

### Mapa de Cargas (CargoMap)
**Status**: ❌ Removido
**Motivo**: Performance issues e complexidade de manutenção

Mapa interativo que mostrava localização geográfica das cargas. Foi removido para simplificar a interface e melhorar performance.

---

*Esta documentação é atualizada conforme novas funcionalidades são adicionadas*
