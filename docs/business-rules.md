# Regras de Negócio

## Regras Críticas

### RN001: Cálculo de SLA (Service Level Agreement)
**Descrição**: Todas as Sales Orders devem ser entregues dentro de 15 dias úteis após o envio para a FedEx.

**Justificativa**:
- Compromisso contratual com clientes
- Em licitações, atrasos podem resultar em multas
- Clientes insatisfeitos podem encerrar parceria

**Implementação Atual** (⚠️ INCORRETA):
- **Arquivo**: [useSLACalculator.ts](../src/hooks/useSLACalculator.ts)
- **Lógica atual**: Calcula 15 dias CORRIDOS a partir de `data_armazem`
```tsx
const slaDeadline = addDays(new Date(so.dataArmazem), 15);
```

**Implementação Esperada** (🔧 PRECISA CORREÇÃO):
- **Lógica correta**: Calcular 15 dias ÚTEIS a partir de `data_envio` (data_envio para FedEx)
- **Função**: Usar `addBusinessDays` da biblioteca `date-fns`
```tsx
// Exemplo de correção necessária
import { addBusinessDays } from 'date-fns';
const slaDeadline = addBusinessDays(new Date(so.dataEnvio), 15);
```

**Validações**:
- Se `data_envio` não existir, não calcular SLA (marcar como "Dados Insuficientes")
- Considerar apenas dias úteis (segunda a sexta)
- Não considerar feriados nacionais brasileiros (implementação futura)

**Exceções**:
- Produtos controlados pela ANVISA podem ter prazos diferenciados (futuro)
- Cargas com problemas alfandegários têm SLA suspenso (manual)

**Níveis de Urgência**:
- 🔴 **Overdue**: SLA vencido (daysLeft < 0) - AÇÃO IMEDIATA REQUERIDA
- 🟡 **Critical**: ≤ 1 dia útil restante - PRIORIDADE ALTA
- 🟠 **Warning**: ≤ 3 dias úteis restantes - MONITORAR DE PERTO
- 🟢 **Ok**: > 3 dias úteis restantes - OPERAÇÃO NORMAL

**Impacto de Violação**:
- Cliente insatisfeito → risco de perda de parceria
- Licitações → multas contratuais
- Imagem da empresa → reputação afetada

---

### RN002: Consolidação de Cargas
**Descrição**: Múltiplas Sales Orders são consolidadas em uma única carga para otimizar custos de transporte internacional.

**Justificativa**:
- Redução de custos de frete aéreo/marítimo
- Melhor negociação com agentes de carga
- Otimização de espaço em containers/pallets

**Regras**:
1. **Separação por Temperatura**:
   - Cargas de temperatura ambiente NÃO podem ser misturadas com cargas controladas
   - Tipos válidos: "Ambiente" ou "Controlada"

2. **Frequência de Embarques**:
   - Normalmente 1 embarque ambiente + 1 embarque controlado por semana
   - Pode variar conforme demanda

3. **Status da Carga Prevalece**:
   - Quando uma SO está vinculada a uma carga, o status da CARGA prevalece sobre o status individual da SO
   - Exemplo: SO com status "Enviado" + Carga "Em Trânsito" → Exibir "Em Trânsito"

**Implementação**:
- **Tabela**: `carga_sales_orders` (relacionamento N:N)
- **Arquivo**: [LogisticsDashboard.tsx:174-196](../src/components/dashboard/LogisticsDashboard.tsx#L174-L196)
```tsx
// Override de status quando SO está em carga
const cargoStatus = cargoNum ? cargoStatusMap[cargoNum] : null;
statusAtual: cargoStatus || envio.status_atual
```

**Validações**:
- Uma SO pode pertencer a no máximo 1 carga ativa
- Uma carga deve ter pelo menos 1 SO vinculada
- Não permitir vincular SO já entregue a nova carga

---

### RN003: Tipos de Temperatura de Produtos
**Descrição**: Produtos biotecnológicos requerem controle rigoroso de temperatura durante transporte.

**Justificativa**:
- Preservação da integridade de produtos biológicos
- Requisitos regulatórios (ANVISA, FDA)
- Evitar perda total da carga por quebra de cold chain

**Tipos de Temperatura**:
1. **Ambiente** (15°C - 25°C)
   - Produtos químicos estáveis
   - Reagentes secos
   - Materiais de laboratório

2. **Controlada** (2°C - 8°C ou -20°C)
   - Enzimas e proteínas
   - Anticorpos
   - Kits de diagnóstico molecular
   - Produtos biológicos sensíveis

**Regras**:
- Tipo de temperatura definido no nível da CARGA (não da SO individual)
- Todas as SOs de uma carga devem ser compatíveis com o tipo de temperatura
- Cargas controladas exigem monitoramento contínuo (não implementado ainda)

**Monitoramento** (🔄 Planejado):
- Data loggers para registrar temperatura durante transporte
- Alertas se temperatura sair do range aceitável
- Registro de excursões térmicas

---

### RN004: Atualização Automática via n8n
**Descrição**: Dados de rastreamento são atualizados automaticamente via workflows do n8n.

**Justificativa**:
- Reduzir trabalho manual de atualização
- Dados sempre atualizados em tempo real
- Histórico completo de eventos

**Fontes de Dados**:
1. **Emails do Fornecedor**:
   - Workflow: `0-Email Orchestrator.json`
   - Emails com "Daily Order Report" são parseados
   - Extraídos: Número de SO, produtos, status, datas

2. **Scraping FedEx**:
   - Workflow: `2-Scrapper FedEx Tracking.json`
   - Busca status de trackings no site da FedEx
   - Atualiza localização e status

3. **Planilhas Excel**:
   - Workflow: `1-Processar Daily Order Report.json`
   - Processa anexos de emails
   - Importa dados em lote

**Regras de Atualização**:
- Dados do n8n sempre sobrescrevem dados manuais (exceto se marcado como "Não Atualizar")
- Timestamp de atualização registrado em `data_ultima_atualizacao`
- Mudanças de status geram entrada no histórico

**Validações**:
- Não atualizar SOs já marcadas como "Entregue" (lock)
- Validar formato de dados antes de inserir
- Log de erros no n8n para auditoria

---

### RN005: Dados Obrigatórios para Cálculo de SLA
**Descrição**: Certas datas são obrigatórias para cálculo correto de SLA e métricas.

**Justificativa**:
- SLA incorreto gera decisões operacionais erradas
- Falta de dados impede análise de performance
- Rastreabilidade completa é requisito de auditoria

**Campos Obrigatórios**:

Para **Sales Orders**:
- ✅ `sales_order` (número do pedido)
- ✅ `cliente` (nome do cliente)
- ✅ `data_envio` (envio para FedEx) - CRÍTICO para SLA
- ⚠️ `data_ordem` (data do pedido no sistema)
- ⚠️ `tracking_numbers` (rastreamento FedEx)

Para **Cargas**:
- ✅ `numero_carga` (identificador único)
- ✅ `tipo_temperatura` (Ambiente ou Controlada)
- ✅ `status` (status atual da carga)
- ⚠️ `data_armazem` (chegada no armazém do agente) - CRÍTICO
- ⚠️ `data_embarque` (embarque aéreo/marítimo)
- ⚠️ `data_entrega` (entrega final na Síntese)

**Implementação**:
- **Arquivo**: [CargoCard.tsx:728-776](../src/components/dashboard/CargoCard.tsx#L728-L776)
- Alerta visual quando dados estão faltando
```tsx
const cargasComDadosFaltantes = cargas.filter(carga => {
  const missingArmazem = !carga.data_armazem;
  const missingEmbarque = !carga.data_embarque;
  const missingEntrega = status === 'entregue' && !carga.data_entrega;
  return missingArmazem || missingEmbarque || missingEntrega;
});
```

**Validações**:
- Banner amarelo exibido quando existem cargas com dados faltantes
- Lista das cargas problemáticas com link para edição
- SLA não calculado se `data_envio` ausente

---

## Validações e Restrições

### Validação de Datas
**Regra**: Datas devem seguir ordem cronológica lógica.

**Ordem Esperada**:
```
data_ordem < data_envio < data_armazem < data_embarque < data_chegada_prevista < data_entrega
```

**Validações Implementadas**:
- ⚠️ Validação manual (não automatizada ainda)
- Toast de erro se datas fora de ordem
- Destaque visual em campos com problema

**Validações Pendentes** (🔧 Melhorias Futuras):
- Validação automática no formulário
- Impedir salvar se datas inválidas
- Sugerir correção automática baseada em histórico

---

### Validação de Tracking Numbers
**Regra**: Tracking numbers da FedEx seguem formato específico.

**Formato FedEx**:
- 12 dígitos numéricos OU
- 14 dígitos começando com "96" OU
- 15 dígitos começando com "74"

**Implementação**:
- ⚠️ Não validado atualmente
- 🔄 Planejado: Regex validation
```tsx
const fedexRegex = /^(\d{12}|96\d{12}|74\d{13})$/;
```

**Múltiplos Trackings**:
- Uma SO pode ter múltiplos tracking numbers (múltiplos pacotes)
- Separados por vírgula ou ponto-e-vírgula
- Todos devem ser rastreados individualmente

---

### Validação de Números de Carga
**Regra**: Número da carga deve ser único e seguir padrão da empresa.

**Formato Esperado**:
- Prefixo + Sequencial (ex: "CAR-2024-001")
- ⚠️ Atualmente aceita qualquer string

**Validações**:
- Unicidade garantida pelo banco (UNIQUE constraint)
- Não permitir caracteres especiais (exceto hífen)

---

## Políticas e Workflows

### Política de Entregas
**Regra**: SOs são marcadas como entregues apenas após confirmação física.

**Processo**:
1. Carga chega na Síntese
2. Conferência física dos produtos
3. Assinatura de recebimento
4. Atualização manual do status para "Entregue"
5. SO travada para edição (lock)

**Campos Atualizados**:
- `status_atual` → "Entregue"
- `isDelivered` → `true`
- `data_entrega` → Data atual
- `ultima_localizacao` → "Síntese - Recebido"

---

### Workflow de Status

**Fluxo Completo de uma SO**:
```
1. Em Produção (fornecedor fabricando)
   ↓
2. Enviado (enviado para FedEx)
   ↓
3. Em Trânsito FedEx (indo para armazém do agente)
   ↓
4. Em Consolidação (no armazém, aguardando outras SOs)
   ↓
5. Embarcado (em voo/navio para Brasil)
   ↓
6. Chegada no Brasil (aeroporto/porto brasileiro)
   ↓
7. Em Desembaraço (liberação alfandegária)
   ↓
8. Liberado pela Aduana (pronto para entrega)
   ↓
9. Em Trânsito Local (transportadora indo para Síntese)
   ↓
10. Entregue (recebido na Síntese)
```

**Status Ignorados para SLA**:
- "Em Produção": SLA ainda não iniciou
- "Em Consolidação": Pausa esperada, não conta como atraso

---

## Cálculos e Algoritmos

### Cálculo de Métricas do Overview

**SOs Ativas**:
```tsx
activeSOs = sos.filter(so => !so.isDelivered).length
```

**Em Trânsito**:
```tsx
inTransit = sos.filter(so => so.statusAtual === 'Em Trânsito').length
```

**Chegadas Esperadas (próximos 7 dias)**:
```tsx
expectedArrivals = cargas.filter(carga => {
  const isNotDelivered = carga.status !== 'entregue';
  const hasArrivalDate = !!carga.data_chegada_prevista;
  const arrivalDate = new Date(carga.data_chegada_prevista);
  const isWithinWeek = arrivalDate >= today && arrivalDate <= sevenDaysFromNow;
  return isNotDelivered && hasArrivalDate && isWithinWeek;
}).length
```

**Atrasadas**:
```tsx
atrasadas = sos.filter(so => {
  if (so.isDelivered) return false;
  const sla = useSLACalculator(so);
  return sla?.urgency === 'overdue';
}).length
```

---

### Algoritmo de Priorização (Futuro)

**Objetivo**: Sugerir ordem de ação para equipe de importação.

**Fatores de Priorização**:
1. SLA (peso 40%): Quanto menor o daysLeft, maior a prioridade
2. Valor da SO (peso 30%): SOs de alto valor têm prioridade
3. Cliente VIP (peso 20%): Clientes estratégicos
4. Tipo de produto (peso 10%): Produtos refrigerados têm urgência

**Fórmula** (🔄 A ser implementada):
```
Priority Score =
  (15 - daysLeft) * 0.4 +
  (valorTotal / maxValor) * 0.3 +
  (isVIP ? 1 : 0) * 0.2 +
  (isControlled ? 1 : 0) * 0.1
```

---

## Compliance e Regulamentações

### ANVISA (Agência Nacional de Vigilância Sanitária)
**Aplicabilidade**: Produtos biológicos e reagentes para diagnóstico.

**Requisitos**:
- Licença de Importação (LI) obrigatória
- Certificado de Boas Práticas de Fabricação (BPF)
- Registro do produto na ANVISA

**Impacto no Sistema**:
- 🔄 Futuro: Campo para número da LI
- 🔄 Futuro: Alerta se LI está próxima do vencimento
- 🔄 Futuro: Integração com sistemas ANVISA

---

### LGPD (Lei Geral de Proteção de Dados)
**Aplicabilidade**: Dados de clientes e usuários do sistema.

**Dados Sensíveis no Sistema**:
- Nomes de clientes
- Informações comerciais (valores, produtos)
- Emails de usuários

**Medidas de Conformidade**:
- ✅ Dados armazenados com criptografia (Supabase)
- ✅ Acesso controlado por autenticação
- ✅ Logs de auditoria habilitados
- ⚠️ Política de retenção de dados não definida
- ⚠️ Processo de exclusão de dados não automatizado

---

## Regras de Domínio

### Conceito de "Carga Ativa"
**Definição**: Carga que ainda não foi entregue.

**Critérios**:
- `status` ≠ "Entregue"
- `status` ≠ "Cancelada"
- `data_entrega` = null OU vazio

---

### Conceito de "SO Crítica"
**Definição**: SO que requer atenção imediata da equipe.

**Critérios**:
- SLA com urgency = "overdue" OU "critical"
- OU status = "Parado em Alfândega"
- OU sem atualização há mais de 7 dias

---

### Conceito de "Carga com Dados Faltantes"
**Definição**: Carga que não tem informações suficientes para rastreamento completo.

**Critérios**:
```tsx
const hasIncompleteDat = (carga) => {
  const notInConsolidation = !carga.status.includes('consolidação');
  if (!notInConsolidation) return false; // Ignore se em consolidação

  const missingArmazem = !carga.data_armazem;
  const missingEmbarque = !carga.data_embarque;
  const missingEntrega = carga.status === 'entregue' && !carga.data_entrega;

  return missingArmazem || missingEmbarque || missingEntrega;
};
```

---

## Exceções e Casos Especiais

### SOs em "Quarentena"
**Cenário**: SO parada em alfândega por problema documental ou fiscal.

**Tratamento**:
- Status especial "Em Quarentena Fiscal"
- SLA suspenso (não conta como atraso)
- Notificação diária para equipe fiscal
- Prioridade alta assim que liberada

---

### Cargas Parcialmente Entregues
**Cenário**: Algumas SOs da carga foram entregues, outras ainda em trânsito.

**Tratamento Atual**:
- ⚠️ Não suportado (carga é tratada como unidade)
- 🔧 Melhoria futura: Permitir entrega parcial
- 🔧 Status individual por SO dentro da carga

---

### Mudança de Prioridade Manual
**Cenário**: Cliente solicita urgência extraordinária.

**Tratamento**:
- 🔄 Futuro: Campo `prioridade_manual` (alta/normal/baixa)
- Override sobre prioridade calculada
- Registro de quem alterou e motivo

---

## Regras Futuras (Planejadas)

### Integração com ERP (SAP)
**Objetivo**: Sincronização bidirecional com sistema SAP da empresa.

**Regras**:
- SAP é source of truth para dados mestres (clientes, produtos)
- Tracker atualiza status de entrega no SAP
- Evitar duplicação de SOs

---

### Cálculo de Frete Estimado
**Objetivo**: Estimar custo de frete baseado em peso, volume e destino.

**Regras**:
- Cotação automática com múltiplas transportadoras
- Considerar tipo de temperatura (frete refrigerado mais caro)
- Atualizar custos reais após fechamento da carga

---

### SLA Diferenciado por Cliente
**Objetivo**: Clientes premium têm SLA mais curto.

**Regras**:
- Cliente VIP: 10 dias úteis
- Cliente Standard: 15 dias úteis
- Cliente Licitação: Conforme contrato

---

*Estas regras de negócio são revisadas trimestralmente e atualizadas conforme evolução do sistema*
