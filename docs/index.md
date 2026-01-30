# Documentação do Síntese Tracker

## Visão Geral

O **Síntese Tracker** é um sistema de rastreamento logístico desenvolvido internamente pela Síntese (empresa de biotecnologia) para monitorar cargas internacionais de produtos químicos e biológicos desde a produção até a entrega final.

**Criado por**: Analista de Importação da Síntese
**Objetivo**: Centralizar e automatizar o rastreamento de 200+ Sales Orders/mês vindas de fornecedores internacionais
**Status**: Em produção desde 2024

### Problema Resolvido

Antes do sistema, o rastreamento era manual via planilhas e emails dispersos. O Síntese Tracker automatiza:
- Coleta de dados de rastreamento FedEx via scraping
- Processamento de emails de fornecedores e agentes de carga
- Cálculo automático de SLA (15 dias úteis)
- Alertas de atrasos e chegadas
- Consolidação de múltiplas SOs em cargas únicas
- Visibilidade para equipes de importação, gerência e comercial

## Documentação Disponível

### Arquitetura e Stack
- [Stack Tecnológica](stack.md) - React, TypeScript, Supabase, n8n e ferramentas utilizadas
- [Padrões de Design](patterns.md) - Organização de código, componentes e convenções

### Funcionalidades e Regras
- [Funcionalidades](features.md) - Descrição das funcionalidades implementadas e planejadas
- [Regras de Negócio](business-rules.md) - Cálculo de SLA, validações e regras críticas

### Integrações
- [Integrações](integrations.md) - Supabase, n8n, FedEx, Outlook e serviços externos

### Desenvolvimento e Fluxo de Trabalho
- [Product on Rails](PRODUCT-ON-RAILS.md) - Framework de desenvolvimento com Claude Code
- [MCPs](../MCPs.md) - Referência de MCP Servers para desenvolvimento
- [Auditoria de Cargas](../scripts/README_AUDITORIA.md) - Script Python de validação de dados

## Conceitos Principais

### Sales Order (SO)
Pedido individual de um cliente contendo um ou mais produtos. Cada SO tem:
- Número de pedido (Sales Order)
- Cliente
- Produtos
- Status atual
- Tracking numbers da FedEx
- Datas de produção, envio e atualização

### Carga
Consolidação de múltiplas SOs em um embarque aéreo ou marítimo. Uma carga contém:
- Número da carga
- Tipo de temperatura (ambiente ou controlada)
- Data de chegada prevista
- MAWB/HAWB (números de embarque)
- Lista de SOs vinculadas

**Relação**: 1 Carga = N Sales Orders (consolidação)

### Fluxo Operacional
1. **Produção** (fornecedor internacional)
2. **FedEx** (coleta e transporte até armazém do agente)
3. **Armazém do Agente** (consolidação de múltiplas SOs)
4. **Embarque** (aéreo/marítimo)
5. **Brasil** (chegada no país)
6. **Desembaraço** (alfândega)
7. **Entrega na Síntese**
8. **Envio ao Cliente Final** *(não rastreado ainda)*

### SLA (Service Level Agreement)
- **Regra**: 15 dias úteis após envio para FedEx
- **Status atual do código**: Calcula como 15 dias corridos (precisa ajuste)
- **Urgência**: Crítico quando faltam ≤1 dia, Warning quando ≤3 dias
- **Impacto**: Clientes insatisfeitos, perda de parcerias, multas em licitações

## Links Rápidos

- **Repositório**: Local (c:\sintese-tracker\tracker-88)
- **Frontend Deploy**: [Lovable](https://lovable.dev/projects/8fd524cc-6a33-4a16-acee-60ff60b6e6e8)
- **Backend**: Supabase Cloud
- **Automação**: n8n (workflows JSON na raiz do projeto)

## Como Começar

### Desenvolvimento Local
```bash
# Instalar dependências
npm install

# Rodar em modo desenvolvimento
npm run dev

# Build para produção
npm run build
```

### Variáveis de Ambiente
Configure `.env` com:
- `VITE_SUPABASE_URL`: URL do projeto Supabase
- `VITE_SUPABASE_ANON_KEY`: Chave pública do Supabase

## Usuários do Sistema

### Perfis de Acesso
- **Admin**: Analistas de importação (acesso completo)
- **User**: Gerência, diretoria e área comercial (visualização e relatórios)

### Acessos
- Equipe de importação/logística (cadastro e gestão de cargas)
- Gerência e diretoria (dashboards executivos)
- Área comercial/vendas (acompanhamento de entregas)

## Roadmap

### Funcionalidades em Desenvolvimento
⚠️ Sistema de notificações (botão existe, lógica incompleta)
⚠️ Analytics avançados (componentes criados, algoritmos em desenvolvimento)
⚠️ Previsão de atrasos usando ML

### Planejado para Futuro
- Rastreamento até entrega ao cliente final
- Portal self-service para clientes consultarem suas cargas
- Integração com mais transportadoras (além da FedEx)
- Automação de desembaraço aduaneiro
- Mobile app para notificações push

## Estrutura do Repositório

```
tracker-88/
├── .claude/                # Configuração Claude Code
│   ├── agents/            # 11 agentes especializados
│   ├── commands/          # Skills (engineer, product, metaspecs, repodocs)
│   └── settings.local.json
├── src/
│   ├── components/
│   │   ├── auth/          # Autenticação e controle de acesso
│   │   ├── dashboard/     # 19 componentes do dashboard
│   │   └── ui/            # 30+ componentes shadcn/ui
│   ├── hooks/             # Custom hooks (useSLACalculator)
│   ├── integrations/      # Cliente Supabase
│   ├── lib/               # Utilitários e validações Zod
│   └── pages/             # Rotas (Index, Login, NotFound)
├── supabase/
│   ├── functions/         # 9 Edge Functions (Deno/TypeScript)
│   └── migrations/        # 39 migrações SQL
├── scripts/               # Scripts Python (auditoria de cargas)
├── docs/                  # Documentação técnica (esta pasta)
├── technical/             # Metaspec resumo do projeto
├── *.json                 # Workflows n8n (0 a 5)
└── CLAUDE.md              # Diretrizes Claude Code
```

---

*Documentação gerada automaticamente pelo comando `/repodocs:generate-docs`*
*Última atualização: Janeiro 2026*
