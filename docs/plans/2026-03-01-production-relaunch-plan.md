# Production Re-launch Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Prepare tracker-88 for stable production re-launch with clean data, fixed n8n workflows, and improved analytics.

**Architecture:** React 18 + Supabase (PostgreSQL + Realtime + Auth + Edge Functions) + n8n Cloud for automation. Frontend deployed on Vercel, backend on independent Supabase instance.

**Tech Stack:** React, TypeScript, Vite, TailwindCSS, shadcn/ui, Supabase JS SDK, Recharts, date-fns, xlsx, jspdf

---

## Phase 1: Cleanup & Migration

### Task 1: Remove Lovable from vite.config.ts

**Files:**
- Modify: `vite.config.ts`

**Step 1: Remove lovable-tagger import and plugin usage**

Replace the entire file with:

```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
```

**Step 2: Remove lovable-tagger from package.json**

In `package.json`, remove the line:
```
"lovable-tagger": "^1.1.7",
```

**Step 3: Run npm install to update lock file**

Run: `npm install`
Expected: `package-lock.json` updated, no lovable-tagger in node_modules

**Step 4: Verify build passes**

Run: `npm run build`
Expected: Build succeeds with no errors

**Step 5: Commit**

```bash
git add vite.config.ts package.json package-lock.json
git commit -m "chore: remove lovable-tagger dependency"
```

---

### Task 2: Clean Lovable references from HTML and ThemeProvider

**Files:**
- Modify: `index.html`
- Modify: `src/components/auth/ThemeProvider.tsx`

**Step 1: Update index.html meta tags**

In `index.html`, replace:
```html
<meta name="author" content="Lovable" />
```
with:
```html
<meta name="author" content="Síntese Biotecnologia" />
```

Remove the twitter:site meta tag:
```html
<meta name="twitter:site" content="@lovable_dev" />
```

**Step 2: Update ThemeProvider.tsx storageKey default**

In `src/components/auth/ThemeProvider.tsx:26`, replace:
```typescript
storageKey = "lovable-ui-theme",
```
with:
```typescript
storageKey = "logistics-theme",
```

**Step 3: Verify build passes**

Run: `npm run build`
Expected: Build succeeds

**Step 4: Commit**

```bash
git add index.html src/components/auth/ThemeProvider.tsx
git commit -m "chore: replace Lovable branding with Síntese"
```

---

### Task 3: Update CLAUDE.md for new infrastructure

**Files:**
- Modify: `CLAUDE.md`

**Step 1: Update deploy and database access sections**

Replace lines referencing Lovable deploy and database access. Key changes:
- Line 8: `- **Deploy**: Vercel (frontend) + Supabase Cloud (backend) + n8n Cloud (automação)`
- Line 88: Replace entire "Lovable gerencia o Supabase" section with:
  `- **Frontend**: Vercel (deploy automático via GitHub)`
  `- **Edge Functions**: deploy via Supabase CLI (npx supabase functions deploy)`
  `- **Acesso direto ao dashboard Supabase** — podemos gerenciar migrations, Edge Functions e dados diretamente`

**Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: update CLAUDE.md for Vercel + independent Supabase"
```

---

### Task 4: Update documentation files

**Files:**
- Modify: `docs/stack.md`
- Modify: `docs/integrations.md`
- Modify: `docs/patterns.md`
- Modify: `docs/index.md`
- Modify: `technical/tracker-88.md`
- Modify: `README.md`

**Step 1: Search and replace Lovable references in all docs**

In each file, replace references to Lovable with Vercel. Remove sections about "Lovable Tagger", "Deploy automático no Lovable", "Lovable CDN", etc.

Key replacements across all files:
- "Lovable" deploy references → "Vercel"
- Remove "lovable-tagger" tool descriptions
- Update deploy URLs from lovable.dev to Vercel
- Update architecture descriptions

**Step 2: Verify no remaining Lovable references**

Run: `grep -ri "lovable" --include="*.md" .`
Expected: Only the n8n JSON files should have remaining references (handled in Task 5)

**Step 3: Commit**

```bash
git add docs/ technical/ README.md
git commit -m "docs: remove all Lovable references from documentation"
```

---

### Task 5: Rename Lovable references in n8n workflow JSONs

**Files:**
- Modify: `2 - Processar Automated Daily Shipment (Atualizado).json`
- Modify: `4 - Acompanhamento de Tracking Pós-Armazém OK (1).json`
- Modify: `5 - Processar Planilha de Lotes OK.json`

**Step 1: Rename node names in each JSON**

In Workflow 2, rename:
- `"Inserir via Lovable Cloud"` → `"Inserir via Supabase"`
- `"Atualizar via Lovable Cloud"` → `"Atualizar via Supabase"`

In Workflow 4, rename:
- `"Inserir Carga via Lovable1"` → `"Inserir Carga via Supabase"`
- `"Atualizar Carga via Lovable1"` → `"Atualizar Carga via Supabase"`

In Workflow 5, rename:
- `"Vincular SO via Lovable"` → `"Vincular SO via Supabase"`

**Important:** Rename in ALL locations within each JSON — node name, connections references, and pinData keys.

**Step 2: Verify JSONs are valid**

Run: `python3 -c "import json; [json.load(open(f)) for f in ['2 - Processar Automated Daily Shipment (Atualizado).json', '4 - Acompanhamento de Tracking Pós-Armazém OK (1).json', '5 - Processar Planilha de Lotes OK.json']]; print('All valid')"`
Expected: "All valid"

**Step 3: Commit**

```bash
git add "2 - Processar Automated Daily Shipment (Atualizado).json" "4 - Acompanhamento de Tracking Pós-Armazém OK (1).json" "5 - Processar Planilha de Lotes OK.json"
git commit -m "chore: rename Lovable node references to Supabase in n8n workflows"
```

---

### Task 6: Clean database — delete cargas < 925

**Files:**
- Create: `scripts/cleanup_old_cargas.py`

**Step 1: Write cleanup script**

Create `scripts/cleanup_old_cargas.py` that:
1. Queries all cargas with `numero_carga` numeric value < 925
2. Deletes related records in `carga_sales_orders`
3. Deletes related records in `carga_historico`
4. Deletes the cargas themselves
5. Supports `--dry-run` flag to preview without deleting

The script should call the Supabase REST API directly (same pattern as `scripts/audit_cargo_data.py`).

**Step 2: Run dry-run to verify**

Run: `python3 scripts/cleanup_old_cargas.py --dry-run`
Expected: Lists cargas to be deleted, shows count of related records

**Step 3: Run actual cleanup (with user confirmation)**

Run: `python3 scripts/cleanup_old_cargas.py`
Expected: Deletes old data, reports counts

**Step 4: Commit**

```bash
git add scripts/cleanup_old_cargas.py
git commit -m "feat: add cleanup script for cargas < 925"
```

---

### PHASE 1 CHECKPOINT

Run: `npm run build`
Run: `grep -ri "lovable" --include="*.ts" --include="*.tsx" --include="*.md" .`

Expected:
- Build passes with zero errors
- No Lovable references in source code or docs (only in n8n JSONs node names which were already renamed)

---

## Phase 2: n8n Workflow Fixes

### Task 7: Fix Workflow 0 — Email classification

**Files:**
- Modify: `0 - Email Orchestrator (MÃE) (1).json`

**Step 1: Review and improve classification logic**

Read the Workflow 0 JSON and identify the routing/switch node. Improve the classification criteria:

1. **Standard Daily Order**: Subject contains "Standard Daily Order" OR "daily order" (case-insensitive)
2. **Automated Daily Shipment**: Subject contains "Automated Daily Shipment" OR "daily shipment" (case-insensitive)
3. **Tracking Pós-Armazém**: Subject/body contains warehouse-related keywords ("warehouse receipt", "WRN", "receipt number")
4. **Planilha de Lotes**: Subject contains "lote" OR attachment filename contains "lote"
5. **Fallback**: Unclassified emails log a warning and skip (do NOT send to wrong workflow)

**Step 2: Remove hardcoded workflow IDs if present**

Replace any hardcoded workflow execution IDs with dynamic references or webhook URLs.

**Step 3: Verify JSON is valid**

Run: `python3 -c "import json; json.load(open('0 - Email Orchestrator (MÃE) (1).json')); print('Valid')"`

**Step 4: Commit**

```bash
git add "0 - Email Orchestrator (MÃE) (1).json"
git commit -m "fix: improve email classification logic in Orchestrator workflow"
```

---

### Task 8: Fix Workflow 2 — SO duplication

**Files:**
- Modify: `2 - Processar Automated Daily Shipment (Atualizado).json`

**Step 1: Remove dual-write pattern**

Identify the two write paths (Edge Function + direct Supabase). Remove the direct Supabase write. Keep only the Edge Function path (`ingest-envios`).

**Step 2: Replace `returnAll: true` with filtered query**

Find the Supabase node that fetches existing SOs with `returnAll: true`. Replace with a filtered query that only fetches SOs matching the ones in the current email batch.

**Step 3: Add deduplication check**

Before the upsert node, add a Function node that deduplicates items by `sales_order`, keeping only the latest entry if duplicates exist in the same batch.

**Step 4: Remove `neverError: true`**

Find all HTTP Request nodes with `"neverError": true` and remove that property. Add error handling branches instead.

**Step 5: Verify JSON is valid**

Run: `python3 -c "import json; json.load(open('2 - Processar Automated Daily Shipment (Atualizado).json')); print('Valid')"`

**Step 6: Commit**

```bash
git add "2 - Processar Automated Daily Shipment (Atualizado).json"
git commit -m "fix: eliminate SO duplication in Automated Daily Shipment workflow"
```

---

### Task 9: Fix Workflow 5 — Missing cargo creation

**Files:**
- Modify: `5 - Processar Planilha de Lotes OK.json`

**Step 1: Add cargo creation logic**

After the node that sets `deve_criar_carga: true`, add a new branch:
- IF `deve_criar_carga === true`: Call `upsert-carga` Edge Function to create the carga record
- THEN proceed with linking SOs to the carga

**Step 2: Fix cargo number regex**

Replace the greedy regex `/(\\d{3,})/` with a more specific pattern that targets the cargo number format. Based on the data (e.g., "925", "926"), use: `/(?:carga|cargo|lote)\s*#?\s*(\d{3,})/i` or extract from a specific cell/column in the spreadsheet.

**Step 3: Verify JSON is valid**

Run: `python3 -c "import json; json.load(open('5 - Processar Planilha de Lotes OK.json')); print('Valid')"`

**Step 4: Commit**

```bash
git add "5 - Processar Planilha de Lotes OK.json"
git commit -m "fix: add cargo creation when missing and improve number extraction"
```

---

### Task 10: Harden all workflows

**Files:**
- Modify: All 6 workflow JSON files

**Step 1: Clean pinData from all workflows**

For each JSON file, find all `"pinData"` keys and set their values to `{}`.

**Step 2: Add `continueOnFail` to logging nodes**

Find all nodes with "Logger" or "Log" in their name. Add `"continueOnFail": true` to their parameters.

**Step 3: Fix Workflow 3 — FedEx warehouse detection**

In Workflow 3, find the warehouse detection logic. Remove "IT" (In Transit) from the list of statuses that trigger warehouse arrival. Keep only: "AR" (Arrived), "DL" (Delivered to warehouse), "OD" (Out for Delivery to warehouse).

**Step 4: Reconnect logger in Workflow 4**

In Workflow 4, find the "Resumo Final1" node with empty output connections `[]`. Connect it to the appropriate downstream logger node.

**Step 5: Verify all JSONs are valid**

Run: `python3 -c "import json, glob; [json.load(open(f)) for f in glob.glob('*.json')]; print('All valid')"`

**Step 6: Commit**

```bash
git add *.json
git commit -m "fix: harden all n8n workflows (pinData, logging, FedEx detection)"
```

---

### PHASE 2 CHECKPOINT

All 6 workflow JSONs should:
- Parse as valid JSON
- Have no `pinData` with test data
- Have no `neverError: true`
- Have proper error handling branches
- Be ready for import into n8n Cloud

---

## Phase 3: Frontend Improvements

### Task 11: Improve stage timing analytics with cargo dates

**Files:**
- Modify: `src/hooks/useStageTimingData.ts`

**Step 1: Rewrite hook to use cargo dates instead of shipment_history**

The current hook reads from `shipment_history` which may have incomplete data. Rewrite to calculate timing from the `cargas` table dates directly:

- **Em Consolidação**: `created_at` → `data_embarque` (time waiting in warehouse — KEY BOTTLENECK)
- **Em Trânsito**: `data_embarque` → `data_armazem` (this is confusing naming — `data_armazem` means arrival date in Brazil warehouse, not Miami)
- **Em Desembaraço**: arrival in Brazil → `data_entrega` (KEY BOTTLENECK)

Update `STAGE_ORDER` and `STAGE_SLAS` to match the actual 6-status flow:
```typescript
const STAGE_ORDER = [
  'No Armazém (Miami)',
  'Em Trânsito',
  'Desembaraço Aduaneiro',
];

const STAGE_SLAS: Record<string, number> = {
  'No Armazém (Miami)': 3,
  'Em Trânsito': 3,
  'Desembaraço Aduaneiro': 5,
};
```

Query `cargas` table and calculate time between date fields for each carga that has the relevant dates populated.

**Step 2: Verify build passes**

Run: `npm run build`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add src/hooks/useStageTimingData.ts
git commit -m "feat: calculate stage timing from cargo dates for accurate bottleneck analysis"
```

---

### Task 12: Add SLA compliance metrics to Reports

**Files:**
- Modify: `src/hooks/useReportsData.ts`
- Modify: `src/components/dashboard/Reports.tsx`

**Step 1: Add SLA compliance calculation to useReportsData.ts**

Add to the `ReportData` interface:
```typescript
slaMetrics: {
  totalDelivered: number;
  withinSLA: number;
  complianceRate: number;
  avgDeliveryDays: number;
  monthlyComparison: Array<{
    month: string;
    delivered: number;
    complianceRate: number;
    avgDays: number;
  }>;
};
```

Calculate using existing `deliveredOrders` data and the 15 business days SLA threshold.

**Step 2: Add SLA tab to Reports.tsx**

Add a third tab "SLA & Tempos" to the existing Tabs component with:
- SLA compliance rate card (percentage within 15 business days)
- Average delivery time in business days
- Monthly comparison table with trends

**Step 3: Verify build passes**

Run: `npm run build`
Expected: Build succeeds

**Step 4: Commit**

```bash
git add src/hooks/useReportsData.ts src/components/dashboard/Reports.tsx
git commit -m "feat: add SLA compliance metrics and monthly comparison to Reports"
```

---

### Task 13: Ensure admin-only actions are hidden for non-admins

**Files:**
- Modify: `src/components/dashboard/LogisticsDashboard.tsx`

**Step 1: Verify admin guard is working**

Review `LogisticsDashboard.tsx:86-103` — the `checkAdminRole` effect already exists and sets `isAdmin`. Verify that:
- `isAdmin` is passed to `SOTable` (line 267-268) ✓
- `isAdmin` is passed to `CargoCard` (line 355) ✓
- Bulk upload button (line 288-294) is visible to all — should be admin-only
- Cargo selection/delete bar (line 386-411) is admin-only ✓

**Step 2: Guard the bulk upload button**

Wrap the "Importar Planilha" button with `{isAdmin && (...)}`:

```tsx
{isAdmin && (
  <Button
    onClick={() => setShowBulkUpload(true)}
    variant="outline"
    size="sm"
    className="gap-2 rounded-xl"
  >
    <Upload className="h-4 w-4" />
    Importar Planilha
  </Button>
)}
```

**Step 3: Verify build passes**

Run: `npm run build`
Expected: Build succeeds

**Step 4: Commit**

```bash
git add src/components/dashboard/LogisticsDashboard.tsx
git commit -m "fix: restrict bulk upload to admin users only"
```

---

### Task 14: Add arrival date prominence in SO search results

**Files:**
- Modify: `src/components/dashboard/SOTable.tsx`

**Step 1: Add cargo arrival date to table display**

The main question for vendedoras is "quando chega?". In `SOTable.tsx`, the search already works well. Enhance by showing the estimated arrival date more prominently:

In each TableRow, after the "Última Atualização" column, show the SLA countdown from `useSLACalculator` results that are already computed in `slaMap`. The SLA info already contains days remaining — display it as a badge:

```tsx
<TableCell>
  {slaInfo && !so.isDelivered ? (
    <Badge variant={slaInfo.urgency === 'overdue' ? 'destructive' : 'outline'}>
      {slaInfo.urgency === 'overdue'
        ? `${slaInfo.daysOverdue}d atrasado`
        : `${slaInfo.daysRemaining}d restantes`}
    </Badge>
  ) : so.isDelivered ? (
    <Badge className="bg-status-delivered/10 text-status-delivered">Entregue</Badge>
  ) : null}
</TableCell>
```

Add corresponding `<TableHead>Previsão</TableHead>` to the header.

**Step 2: Verify build passes**

Run: `npm run build`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add src/components/dashboard/SOTable.tsx
git commit -m "feat: add SLA countdown column to SO table for quick delivery estimates"
```

---

### PHASE 3 CHECKPOINT

Run: `npm run build`

Expected:
- Build passes with zero errors
- Analytics tab shows real bottleneck data from cargo dates
- Reports tab has SLA compliance metrics
- SO table shows delivery countdown
- Non-admin users don't see delete/import buttons

---

## Phase 4: Deploy & Validation

### Task 15: Final build verification and deploy prep

**Files:**
- None (verification only)

**Step 1: Full build test**

Run: `npm run build`
Expected: Build succeeds with zero errors and zero warnings

**Step 2: Verify no Lovable references remain in source**

Run: `grep -ri "lovable" --include="*.ts" --include="*.tsx" --include="*.html" --include="*.md" .`
Expected: No matches (or only in the design doc / plan files)

**Step 3: Verify git status is clean**

Run: `git status`
Expected: Clean working tree, all changes committed

**Step 4: Push to GitHub for Vercel auto-deploy**

Run: `git push origin main`
Expected: Push succeeds, Vercel detects changes and starts build

---

### Task 16: Import workflows to n8n Cloud

**Manual steps (user must do in n8n Cloud):**

1. Backup existing workflows in n8n Cloud
2. Import each corrected JSON:
   - `0 - Email Orchestrator (MÃE) (1).json`
   - `1 - Processar Standard Daily Order.json`
   - `2 - Processar Automated Daily Shipment (Atualizado).json`
   - `3 - FedEx Scraper (Atualizado).json`
   - `4 - Acompanhamento de Tracking Pós-Armazém OK (1).json`
   - `5 - Processar Planilha de Lotes OK.json`
3. Move API keys from plain text in nodes to n8n Credentials Store:
   - Supabase anon key → "Supabase API" credential
   - FedEx client_id/client_secret → "FedEx API" credential
4. Activate Workflow 0 (Orchestrator) and Workflow 3 (FedEx Scraper cron)
5. Send a test email to verify classification works

---

### Task 17: End-to-end validation

**Manual verification checklist:**

- [ ] Dashboard loads and shows data from carga >= 925
- [ ] SO search works (search by SO number, client name)
- [ ] Cargas tab shows consolidated cargoes with correct SO counts
- [ ] Analytics tab shows stage timing with real data
- [ ] Reports tab shows SLA compliance metrics
- [ ] Non-admin user cannot see delete/import buttons
- [ ] n8n Workflow 0 correctly classifies a test email
- [ ] n8n Workflow 3 (FedEx) runs on schedule without errors
- [ ] Realtime updates work (change data in Supabase → dashboard updates)

---

## Future Items (documented, not in scope)

- [ ] Automação "Em Rota de Entrega" via WhatsApp
- [ ] Filtro por vendedora (requer mapeamento cliente→vendedora)
- [ ] Dashboard executivo separado para diretores
- [ ] Notificações backend completo
- [ ] Suporte a fornecedores além do IDT DNA
- [ ] Testes automatizados
