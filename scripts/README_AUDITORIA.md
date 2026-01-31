# Script de Auditoria de Dados de Cargas (SNT-16)

## Visão Geral

Este script automatiza a auditoria e validação de dados de cargas, extraindo datas de envio FedEx das planilhas `Dados {nº}.xlsx` e validando/preenchendo no banco de dados Supabase.

**Problema que resolve:**
- Muitas SOs não têm `data_envio` preenchida no banco
- Sem `data_envio`, o cálculo de SLA não funciona corretamente
- Divergências entre dados nas planilhas e no sistema

**Solução:**
- Escaneia automaticamente todas as pastas de cargas
- Extrai dados da aba **SR1** (Ship Date na coluna C, SO na coluna E)
- Valida contra o banco de dados
- Gera relatório detalhado de divergências
- Pode preencher dados faltantes automaticamente

---

## Pré-requisitos

### 1. Python 3.8+

Verifique a versão:
```bash
python --version
```

### 2. Instalar Dependências

```bash
pip install pandas openpyxl supabase
```

### 3. Configurar Credenciais Supabase

Você precisa das credenciais do Supabase. Crie um arquivo `.env` ou configure variáveis de ambiente:

**Windows (CMD):**
```cmd
set SUPABASE_URL=https://xxxxx.supabase.co
set SUPABASE_KEY=eyJhbGc...
```

**Windows (PowerShell):**
```powershell
$env:SUPABASE_URL="https://xxxxx.supabase.co"
$env:SUPABASE_KEY="eyJhbGc..."
```

**Obter credenciais:**
1. Acesse o painel Supabase do projeto
2. Settings → API
3. Copie `Project URL` e `anon/public key`

---

## Modos de Uso

### 1. Modo DRY-RUN (Recomendado para primeira execução)

Faz preview sem modificar nada no banco:

```bash
python scripts/audit_cargo_data.py --dry-run
```

**Saída esperada:**
```
🚀 Iniciando Auditoria de Dados de Cargas (SNT-16)
📁 Pasta base: C:\IMPORTAÇÕES
ℹ️  Modo: DRY-RUN (sem modificações)

📁 Escaneando: IMPORTAÇÃO 2025
📁 Escaneando: IMPORTAÇÃO 2026

✅ 15 cargas encontradas

🔍 Auditando CARGA 906: CARGA 906 - IDT - GS
  ✅ Planilha encontrada: Dados 906.xlsx
  📊 25 SOs extraídas da aba SR1
  ⚠️  SO 12345: data_envio AUSENTE no banco (planilha: 24/11/2025)
  ⚠️  SO 12346: DIVERGÊNCIA - DB: 20/11/2025 vs Planilha: 22/11/2025 (2 dias)
  ...

📄 Relatório gerado: audit_report.csv
   Total de issues: 47

📊 RESUMO DA AUDITORIA
============================================================
Cargas escaneadas:           15
Planilhas encontradas:       15
SOs extraídas:               320
SOs sem data_envio:          47
Divergências encontradas:    12
Preenchimentos automáticos:  0
Erros:                       0
============================================================
```

### 2. Modo REPORT-ONLY

Gera apenas relatório CSV sem preencher dados:

```bash
python scripts/audit_cargo_data.py --report-only --output relatorio_auditoria.csv
```

O arquivo CSV terá as colunas:
- **Carga**: Número da carga
- **SO**: Sales Order
- **Tipo**: FALTANTE ou DIVERGÊNCIA
- **Data_Planilha**: Data extraída da planilha
- **Data_DB**: Data no banco de dados
- **Diferenca_Dias**: Diferença em dias (para divergências)
- **Status**: Pendente, Preenchido ou Revisar

### 3. Modo AUTO-FILL

Preenche automaticamente dados faltantes:

```bash
python scripts/audit_cargo_data.py --auto-fill
```

**⚠️ ATENÇÃO:**
- Este modo **modifica o banco de dados**
- Use primeiro `--dry-run` para verificar o que será alterado
- Recomendado fazer backup do banco antes

### 4. Modo INTERACTIVE (Futuro)

Pergunta antes de cada preenchimento:

```bash
python scripts/audit_cargo_data.py --interactive
```

---

## Estrutura de Pastas Esperada

O script procura por:

```
C:\IMPORTAÇÕES\
├── IMPORTAÇÃO 2024\
│   ├── CARGA 850 - IDT - GS\
│   │   └── Dados 850.xlsx  ← Aba SR1: Col C (Ship Date), Col E (SO)
│   ├── CARGA 851 - IDT - GS\
│   │   └── Dados 851.xlsx
│   └── ...
├── IMPORTAÇÃO 2025\
│   ├── CARGA 900 - IDT - GS\
│   │   └── Dados 900.xlsx
│   └── ...
└── IMPORTAÇÃO 2026\
    ├── CARGA 915 - IDT - GS\
    │   └── Dados 915.xlsx
    └── ...
```

**Aba SR1 da planilha:**
| A | B | C (Ship Date) | D | E (Sales Order) | F |
|---|---|---------------|---|-----------------|---|
| ... | ... | 11/24/2025 12:00:00 AM | ... | 23184474 | ... |
| ... | ... | 11/25/2025 12:00:00 AM | ... | 23184475 | ... |

---

## Opções Avançadas

### Mudar Pasta Base

Se suas importações estão em outro local:

```bash
python scripts/audit_cargo_data.py --base-path "D:\Minhas Importações"
```

### Personalizar Nome do Relatório

```bash
python scripts/audit_cargo_data.py --report-only --output "auditoria_jan2026.csv"
```

---

## Troubleshooting

### Erro: "Biblioteca necessária não instalada"

Instale as dependências:
```bash
pip install pandas openpyxl supabase
```

### Erro: "Configure as variáveis de ambiente SUPABASE_URL e SUPABASE_KEY"

Configure as credenciais conforme a seção [Pré-requisitos](#3-configurar-credenciais-supabase).

### Planilha não encontrada

Certifique-se de que:
1. A planilha está nomeada como `Dados {nº}.xlsx` (ex: `Dados 906.xlsx`)
2. O número da carga no nome da pasta corresponde ao número do arquivo
3. A planilha tem a aba **SR1**

### Erro ao ler aba SR1

Verifique:
1. A aba se chama exatamente **SR1** (case-sensitive)
2. A coluna **C** contém Ship Date
3. A coluna **E** contém Sales Order Number

---

## Fluxo de Trabalho Recomendado

### Primeira Auditoria

1. **Preview dos dados:**
   ```bash
   python scripts/audit_cargo_data.py --dry-run
   ```

2. **Gerar relatório:**
   ```bash
   python scripts/audit_cargo_data.py --report-only --output inicial_audit.csv
   ```

3. **Analisar relatório:**
   - Abrir `inicial_audit.csv` no Excel
   - Revisar divergências
   - Identificar padrões de problemas

4. **Preencher dados (se tudo estiver ok):**
   ```bash
   python scripts/audit_cargo_data.py --auto-fill
   ```

### Auditoria Mensal

Execute mensalmente para manter dados atualizados:

```bash
python scripts/audit_cargo_data.py --report-only --output audit_$(date +%Y%m).csv
```

---

## Impacto no SLA

Após preencher os dados com este script, o cálculo de SLA ([useSLACalculator.ts](../src/hooks/useSLACalculator.ts)) funcionará corretamente:

**ANTES do script:**
- ❌ SOs sem `data_envio` → SLA não é calculado (retorna `null`)
- ❌ Usuários não veem ETA correto
- ❌ Alertas de atraso não funcionam

**DEPOIS do script:**
- ✅ SOs com `data_envio` preenchido
- ✅ Cálculo de SLA em **15 dias ÚTEIS** a partir do envio FedEx
- ✅ Alertas de urgência funcionam corretamente
- ✅ Dashboard mostra ETAs realistas

---

## Contribuindo

Se encontrar bugs ou quiser melhorias:
1. Abra uma issue no Linear (projeto Síntese Tracker)
2. Use a label `bug` ou `enhancement`
3. Mencione SNT-16 na descrição

---

## Changelog

### v1.0.0 (2026-01-29)
- ✅ Implementação inicial
- ✅ Escaneamento de pastas
- ✅ Leitura de aba SR1
- ✅ Validação contra Supabase
- ✅ Relatório CSV
- ✅ Modo dry-run
- ✅ Modo auto-fill
