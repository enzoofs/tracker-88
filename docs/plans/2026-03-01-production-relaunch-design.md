# Design: Re-launch Tracker-88 para Produção

**Data:** 2026-03-01
**Abordagem:** Fundação primeiro (confiabilidade antes de features)
**Meta:** Sistema estável em produção até final da semana

---

## Contexto do Negócio

### O que é
Sistema de rastreamento logístico para importação de produtos biotecnológicos (IDT DNA). Rastreia Sales Orders desde o pedido até a entrega final ao cliente.

### Fluxo logístico completo
1. Cliente pede → Vendedoras lançam no sistema do fornecedor (IDT DNA)
2. Fornecedor envia **Standard Daily Order** (planilha com pedidos do dia)
3. SOs saem do fornecedor → **Automated Daily Shipment** (2-3x/semana)
4. Carga vai para **armazém em Miami** → email com warehouse receipt + invoices
5. Avaliação de valor → autorização de consolidação
6. Armazém consolida por **temperatura** (Ambiente, Dry Ice, Gel Pack)
7. Preenchimento de planilha para o **despachante** (DI)
8. **Agente de cargas** organiza embarque → envia HAWB para aprovação
9. Aprovação → data de embarque + previsão de chegada definidas
10. Chegada no Brasil → **despachante** faz liberação aduaneira
11. **Empresa terceira** faz coleta
12. Expedição recebe → entrada + emissão de NF via XML
13. Faturamento → envio ao cliente via **transportadora terceira**

### Status das cargas (6 etapas lineares)
1. Em Consolidação (aguardando no armazém Miami)
2. Aguardando Embarque (HAWB aprovado, esperando voo)
3. Em Trânsito (voando)
4. No Brasil / Desembaraço (liberação aduaneira)
5. Em Rota de Entrega (coleta feita, a caminho)
6. Entregue

### Volumes
- ~30-50 SOs/semana
- ~8-12 cargas consolidadas/mês
- 100+ clientes finais
- 1 fornecedor principal (IDT DNA), outros secundários para futuro

### Usuários
- **Admin (gestão logística):** visão completa + ações de escrita
- **Vendedoras/representantes:** consulta dos seus clientes (read-only)
- **Diretores:** relatórios gerenciais

### SLA
- 15 dias úteis a partir de `data_envio` — promessa ao cliente
- Objetivo: reduzir esse número
- Gargalos principais: tempo no armazém + tempo de desembaraço

### Motivação do re-launch
Sistema já esteve em produção. Foi retirado por:
- SOs duplicadas
- Workflow 5 perdia informações
- Workflow 0 errava na classificação de emails
- Dados limpos: marco zero a partir da carga 925

---

## Fase 1 — Limpeza e Migração

### 1.1 Limpeza de dados
- Deletar cargas com `numero_carga` < 925 de `cargas`
- Deletar vínculos correspondentes em `carga_sales_orders`
- Manter SOs soltas em `envios_processados` (limpeza manual depois via planilha)
- Limpar registros órfãos em `carga_historico`, `shipment_history`, `notification_queue`

### 1.2 Remoção do Lovable
- Remover `lovable-tagger` de `package.json` e `vite.config.ts`
- Atualizar `index.html` (meta tags autor/twitter)
- Atualizar `ThemeProvider.tsx` (storageKey → `logistics-theme`)
- Atualizar `CLAUDE.md` — deploy é Vercel, acesso direto ao Supabase
- Atualizar `docs/` (stack.md, integrations.md, patterns.md, index.md)
- Atualizar `technical/tracker-88.md`
- Renomear nodes nos JSONs do n8n que referenciam "Lovable"

### 1.3 Atualizar CLAUDE.md
- Deploy: Vercel (frontend) + Supabase Cloud (backend) + n8n Cloud (automação)
- Acesso direto ao dashboard Supabase
- Remover referências a limitações do Lovable

---

## Fase 2 — Correção dos Workflows n8n

### 2.1 Bugs críticos

**Workflow 0 — Classificação errada de emails:**
- Revisar lógica de roteamento (subject patterns, remetentes, body)
- Adicionar fallback: emails não classificados → fila de revisão manual

**Workflow 2 — Duplicação de SOs:**
- Eliminar escrita dupla (Edge Function + Supabase direto) → uma via só
- Deduplicação por `sales_order` antes do upsert
- Substituir `returnAll: true` por query filtrada

**Workflow 5 — Dados perdidos / carga não criada:**
- Adicionar criação de carga quando `deve_criar_carga: true`
- Melhorar regex de extração do número de carga

### 2.2 Hardening
- Mover API keys para n8n Credentials Store (todos os workflows)
- Remover `neverError: true`, adicionar error handling real
- Verificar/corrigir filtro `hasAttachments` no Workflow 0
- Adicionar `continueOnFail` nos nodes de logging
- Rate limiting no FedEx Scraper (Workflow 3)
- Corrigir detecção de armazém no Workflow 3 (remover "IT" dos status de warehouse)
- Reconectar logger no Workflow 4
- Limpar `pinData` de todos os JSONs

---

## Fase 3 — Melhorias no Frontend

### 3.1 Analytics de gargalos (prioridade alta)
- Tempo por etapa usando datas da carga (`created_at` → `data_armazem` → `data_embarque` → `data_entrega`)
- Destaque dos 2 gargalos: tempo no armazém + desembaraço
- Visualização: barras horizontais por carga (tempo em cada etapa)
- Alertas visuais: cargas acima do tempo médio

### 3.2 Relatórios gerenciais (prioridade média)
- Tempo médio de entrega (porta-a-porta) por período
- SLA compliance rate (% dentro do prazo)
- Comparativo mensal de volumes e tempos
- Export PDF/XLSX (dependências já instaladas)

### 3.3 Ajustes UX para consulta
- View read-only funcional para role `user`
- Busca por SO com previsão de chegada em destaque
- Ocultar ações admin (delete, import, bulk upload) para não-admins

---

## Fase 4 — Deploy

- Deploy frontend na Vercel
- Importar workflows corrigidos no n8n Cloud
- Teste end-to-end com dados reais
- Validação: dados fluindo corretamente

---

## Ordem de Execução

| Fase | Escopo | Checkpoint |
|------|--------|------------|
| 1 | Limpeza + Lovable + docs | `npm run build` passa, docs atualizadas |
| 2 | Workflows n8n (bugs + hardening) | JSONs prontos para importar no n8n Cloud |
| 3 | Frontend (analytics + relatórios + UX) | `npm run build` passa, dashboard funcional |
| 4 | Deploy + teste end-to-end | Sistema em produção, dados fluindo |

---

## Itens Futuros (pós-launch)

- [ ] Automação "Em Rota de Entrega" via WhatsApp
- [ ] Filtro por vendedora (requer mapeamento cliente→vendedora)
- [ ] Dashboard executivo separado para diretores
- [ ] Notificações backend completo
- [ ] Suporte a fornecedores além do IDT DNA
- [ ] Testes automatizados
