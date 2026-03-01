# Visual Overhaul Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Remove AI slop aesthetics and achieve a polished corporate design across the Síntese Tracker frontend.

**Architecture:** Hybrid approach — redefine CSS tokens/config first (global impact), then surgically fix the 6 most visible components. No logic changes, frontend-only.

**Tech Stack:** React 18, TailwindCSS, shadcn/ui, Lucide icons, CSS custom properties

**Design Doc:** `docs/plans/2026-03-01-visual-overhaul-design.md`

---

### Task 1: Redefine CSS Tokens (index.css)

**Files:**
- Modify: `src/index.css`

**Step 1: Update light theme color tokens**

Replace the `:root` block with new primary/secondary/background/muted values:
- `--primary`: `198 77% 56%` → `217 91% 53%` (blue-600)
- `--secondary`: `230 54% 34%` → `224 76% 48%` (blue-800)
- `--background`: `0 0% 98%` → `220 14% 96%`
- `--muted`: `210 40% 96%` → `220 14% 96%`
- `--accent`: update to match new primary `217 91% 53%`
- `--ring`: update to match new primary `217 91% 53%`
- `--radius`: `0.375rem` → `0.5rem`
- `--status-production`: `45 93% 47%` → `38 92% 50%` (amber-600, slightly desaturated)
- `--status-shipping`: update to match new primary `217 91% 53%`
- `--status-transit`: update to match new secondary `224 76% 48%`

**Step 2: Update dark theme tokens**

Update `.dark` block:
- `--primary`: `198 77% 56%` → `217 91% 60%`
- `--secondary`: `230 54% 34%` → `224 76% 55%`
- `--status-shipping`: update to match dark primary
- `--status-transit`: update to match dark secondary

**Step 3: Remove gradient CSS variables**

Delete all `--gradient-*` lines from both `:root` and `.dark`:
- `--gradient-corporate`, `--gradient-tech`, `--gradient-light`, `--gradient-card`, `--gradient-success`, `--gradient-alert`

**Step 4: Simplify shadow tokens**

Replace 3 shadow tokens with 2:
- `--shadow-card` → `--shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05)`
- `--shadow-corporate` → `--shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.07), 0 2px 4px -2px rgb(0 0 0 / 0.05)`
- Delete `--shadow-hover`

**Step 5: Remove slop utility classes**

Delete these class definitions from `@layer base`:
- `.corporate-card` (replace uses with standard `bg-card border shadow-sm`)
- `.hover-corporate` + `.hover-corporate:hover` (delete entirely)
- `.glass` (replace uses with `bg-card border`)
- `.font-tech` (replace uses with `font-semibold`)
- `.bg-gradient-dark`, `.bg-gradient-tech`, `.bg-gradient-logistics` (delete)
- `.shadow-tech` (delete)
- `.glow-accent` (delete)
- `.animate-glow-pulse` + `@keyframes glow-pulse` (delete)

Keep: `.text-corporate`, `.text-corporate-mono` (used for typography)

**Step 6: Verify build**

Run: `npm run build`
Expected: May fail due to removed CSS classes still referenced in components. That's OK — we fix those in subsequent tasks.

**Step 7: Commit**

```bash
git add src/index.css
git commit -m "refactor: redefine CSS tokens and remove AI slop utility classes"
```

---

### Task 2: Update Tailwind Config

**Files:**
- Modify: `tailwind.config.ts`

**Step 1: Remove gradient background images**

Delete the entire `backgroundImage` section:
```ts
backgroundImage: {
  'gradient-corporate': '...',
  'gradient-light': '...',
  'gradient-card': '...',
  'gradient-success': '...',
  'gradient-alert': '...'
},
```

**Step 2: Simplify box shadows**

Replace:
```ts
boxShadow: {
  'card': 'var(--shadow-card)',
  'corporate': 'var(--shadow-corporate)',
  'hover': 'var(--shadow-hover)'
},
```
With:
```ts
boxShadow: {
  'sm': 'var(--shadow-sm)',
  'md': 'var(--shadow-md)',
},
```

**Step 3: Remove slop animations**

Remove from `keyframes`:
- `glow-pulse`
- `tech-float`

Remove from `animation`:
- `glow-pulse`
- `tech-float`

Keep: `accordion-down/up`, `fade-in/out`, `scale-in/out`, `slide-in-right/out-right` (used by shadcn/ui and notifications).

**Step 4: Clean transition timing**

Remove `transitionTimingFunction` section entirely (uses deleted CSS vars).

**Step 5: Remove font-tech alias**

The `fontFamily` section has `'corporate'` — keep it (it's Roboto, still used). No changes needed here.

**Step 6: Verify build**

Run: `npm run build`

**Step 7: Commit**

```bash
git add tailwind.config.ts
git commit -m "refactor: simplify Tailwind config, remove gradient/glow/float tokens"
```

---

### Task 3: Clean Button Component

**Files:**
- Modify: `src/components/ui/button.tsx`

**Step 1: Remove slop classes from button variants**

In the base class string, replace:
- `font-corporate` → `font-medium` (Roboto is already the body font)
- `transition-hover` → `transition-colors`

In variant classes, replace:
- `shadow-corporate` → `shadow-sm` (for default, destructive, secondary)
- `shadow-card` → `shadow-sm` (for outline)

**Step 2: Verify build**

Run: `npm run build`

**Step 3: Commit**

```bash
git add src/components/ui/button.tsx
git commit -m "refactor: clean button component, remove corporate shadows"
```

---

### Task 4: Redesign DashboardHeader

**Files:**
- Modify: `src/components/dashboard/DashboardHeader.tsx`

**Step 1: Simplify header container**

Replace:
```tsx
<div className="border-b border-border/50 bg-gradient-tech/5 backdrop-blur-sm">
  <div className="container mx-auto px-6 py-8">
```
With:
```tsx
<div className="border-b bg-card">
  <div className="container mx-auto px-6 py-4">
```

**Step 2: Remove Globe icon, simplify title**

Replace the Globe icon + title block:
```tsx
<div className="p-3 rounded-2xl bg-gradient-tech shadow-tech">
  <Globe className="h-8 w-8 text-white" />
</div>
<div>
  <h1 className="text-3xl font-tech text-foreground">Síntese Tracker</h1>
  <p className="text-muted-foreground font-medium">
    Rastreamento Inteligente de Cargas
  </p>
```
With:
```tsx
<div>
  <h1 className="text-xl font-semibold text-foreground">Síntese Tracker</h1>
  <p className="text-sm text-muted-foreground">
    Rastreamento de Cargas
  </p>
```

Remove `Globe` from imports.

**Step 3: Simplify notification badge**

Replace:
```tsx
<Badge className="absolute -top-2 -right-2 px-2 py-1 text-xs bg-gradient-alert glow-accent">
```
With:
```tsx
<Badge className="absolute -top-1 -right-1 h-5 min-w-5 flex items-center justify-center p-0 text-xs bg-destructive text-destructive-foreground">
```

**Step 4: Clean user dropdown trigger**

Replace:
```tsx
<Button variant="ghost" className="flex items-center gap-3 px-4 py-2 rounded-xl glass">
  <div className="w-8 h-8 rounded-lg bg-gradient-tech flex items-center justify-center">
    <User className="h-4 w-4 text-white" />
  </div>
  <div className="text-sm text-left">
    <div className="font-tech text-foreground">{userName}</div>
  </div>
```
With:
```tsx
<Button variant="ghost" className="flex items-center gap-2 px-3 py-2">
  <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center">
    <User className="h-4 w-4 text-primary" />
  </div>
  <span className="text-sm font-medium text-foreground">{userName}</span>
```

**Step 5: Clean bell button**

Replace:
```tsx
className="p-3 rounded-xl hover:bg-primary/10 transition-colors"
```
With:
```tsx
className="p-2 hover:bg-muted transition-colors"
```

**Step 6: Verify build**

Run: `npm run build`

**Step 7: Commit**

```bash
git add src/components/dashboard/DashboardHeader.tsx
git commit -m "refactor: redesign header, remove gradients and glass effects"
```

---

### Task 5: Redesign KPI Overview Cards

**Files:**
- Modify: `src/components/dashboard/Overview.tsx`

**Step 1: Remove outer animate-fade-in**

Replace:
```tsx
<div className="space-y-8 animate-fade-in">
```
With:
```tsx
<div className="space-y-6">
```

**Step 2: Redesign KPI cards**

Replace the KPI card JSX (the `metricCards.map` block):
```tsx
<Card
  key={metric.title}
  className="corporate-card hover-corporate border-border/50 group animate-fade-in"
  style={{ animationDelay: `${index * 100}ms` }}
>
  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
    <CardTitle className="text-sm font-corporate text-muted-foreground">
      {metric.title}
    </CardTitle>
    <div className="p-2 rounded-lg bg-gradient-corporate shadow-corporate">
      <Icon className="h-5 w-5 text-white" />
    </div>
  </CardHeader>
  <CardContent>
    <div className="text-3xl font-corporate font-semibold text-foreground group-hover:text-primary transition-colors">
      {metric.value}
    </div>
    <Badge className="mt-2 bg-primary/10 text-primary border-primary/20 font-corporate">
      {metric.trend}
    </Badge>
  </CardContent>
</Card>
```
With:
```tsx
<Card key={metric.title} className="border shadow-sm">
  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
    <CardTitle className="text-sm font-medium text-muted-foreground">
      {metric.title}
    </CardTitle>
    <Icon className="h-5 w-5 text-primary" />
  </CardHeader>
  <CardContent>
    <div className="text-2xl font-semibold tabular-nums text-foreground">
      {metric.value}
    </div>
    <p className="mt-1 text-xs text-muted-foreground">
      {metric.trend}
    </p>
  </CardContent>
</Card>
```

**Step 3: Clean "Status em Tempo Real" card**

Replace:
```tsx
<Card className="shadow-corporate bg-gradient-card">
```
With:
```tsx
<Card className="border shadow-sm">
```

Replace `font-corporate` with `font-medium` in CardTitle and status labels.

**Step 4: Clean status mini-cards**

Replace:
```tsx
className="text-center p-4 rounded-lg bg-card border border-border/50 hover-corporate cursor-pointer transition-all hover:shadow-md hover:scale-105"
```
With:
```tsx
className="text-center p-4 rounded-lg bg-card border cursor-pointer transition-colors hover:bg-muted/50"
```

Replace `font-corporate font-bold` with `font-semibold` in the status value divs.
Replace `font-corporate` with `font-medium` in the label divs.

**Step 5: Update gap**

Replace `gap-6` with `gap-4` in the KPI grid.

**Step 6: Verify build**

Run: `npm run build`

**Step 7: Commit**

```bash
git add src/components/dashboard/Overview.tsx
git commit -m "refactor: redesign KPI cards, remove gradients and hover lifts"
```

---

### Task 6: Clean LogisticsDashboard (Tabs + Loading)

**Files:**
- Modify: `src/components/dashboard/LogisticsDashboard.tsx`

**Step 1: Clean TabsList**

Replace:
```tsx
<TabsList className="grid w-full max-w-6xl grid-cols-4 mx-auto glass p-1 rounded-2xl">
  <TabsTrigger value="sos" className="rounded-xl font-tech">
```
With:
```tsx
<TabsList className="grid w-full max-w-6xl grid-cols-4 mx-auto bg-muted p-1 rounded-lg">
  <TabsTrigger value="sos" className="rounded-md font-medium">
```

Do the same for all 4 TabsTrigger elements: `rounded-xl font-tech` → `rounded-md font-medium`.

**Step 2: Remove animate-fade-in from TabsContent**

Replace all 4 `className="animate-fade-in"` on `<TabsContent>` with just removing the className entirely or using empty string.

**Step 3: Clean loading card**

Replace:
```tsx
<Card className="glass p-8 border-border/50">
```
With:
```tsx
<Card className="p-8 border">
```

Replace:
```tsx
<span className="font-tech text-lg text-foreground">
```
With:
```tsx
<span className="text-lg font-medium text-foreground">
```

**Step 4: Verify build**

Run: `npm run build`

**Step 5: Commit**

```bash
git add src/components/dashboard/LogisticsDashboard.tsx
git commit -m "refactor: clean tabs and loading state, remove glass effects"
```

---

### Task 7: Clean CargoCard + Raw Tailwind Colors

**Files:**
- Modify: `src/components/dashboard/CargoCard.tsx`

**Step 1: Replace raw Tailwind colors with semantic tokens**

In `getStatusColor()`, replace:
```tsx
case 'no armazém':
  return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
case 'em preparação':
  return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
case 'despachada':
  return 'bg-green-500/10 text-green-500 border-green-500/20';
```
With:
```tsx
case 'no armazém':
  return 'bg-status-shipping/10 text-status-shipping border-status-shipping/20';
case 'em preparação':
  return 'bg-status-production/10 text-status-production border-status-production/20';
case 'despachada':
  return 'bg-status-delivered/10 text-status-delivered border-status-delivered/20';
```

**Step 2: Clean card container classes**

In the Card component, replace:
```tsx
className={`p-6 cursor-pointer hover:shadow-lg transition-all duration-200 border-border/50 bg-card hover:border-primary/50 ... ${hasMissingData ? 'ring-1 ring-amber-500/30' : ''} ${isSelected ? 'ring-2 ring-primary bg-primary/5' : ''}`}
```
With:
```tsx
className={`p-6 cursor-pointer transition-colors border bg-card hover:bg-muted/30 ... ${hasMissingData ? 'border-amber-500/50' : ''} ${isSelected ? 'ring-2 ring-primary bg-primary/5' : ''}`}
```

**Step 3: Remove icon background container**

Replace:
```tsx
<div className="p-2 rounded-lg bg-primary/10">
  <Package className="h-5 w-5 text-primary" />
</div>
```
With:
```tsx
<Package className="h-5 w-5 text-primary" />
```

**Step 4: Clean typography**

Replace `font-bold text-lg` on cargo title with `font-semibold text-base`.

**Step 5: Replace emoji temp icons**

Replace `getTempIcon` function:
```tsx
const getTempIcon = (temp: string) => {
  return temp?.toLowerCase() === 'controlada' ? '🌡️' : '🏠';
};
```
With:
```tsx
const getTempIcon = (temp: string) => {
  return temp?.toLowerCase() === 'controlada' ? 'Controlada' : 'Ambiente';
};
```

And update the usage to just show the text after the Thermometer icon.

**Step 6: Verify build**

Run: `npm run build`

**Step 7: Commit**

```bash
git add src/components/dashboard/CargoCard.tsx
git commit -m "refactor: clean CargoCard, use semantic tokens, remove slop"
```

---

### Task 8: Replace Emojis in Timeline

**Files:**
- Modify: `src/components/dashboard/Timeline.tsx`

**Step 1: Add Lucide icon imports**

Add to imports:
```tsx
import { Factory, Warehouse, CalendarCheck, PlaneTakeoff, Globe, FileSearch } from 'lucide-react';
```

**Step 2: Replace emoji icon function**

Replace `getEventIcon` to return Lucide icons instead of emoji divs:

```tsx
const getEventIcon = (tipo: string, status: string) => {
  const iconClass = `h-5 w-5 ${
    status === 'completed' ? 'text-white' :
    status === 'current' ? 'text-primary' : 'text-muted-foreground'
  }`;

  const eventStatus = mapEventToStatus(tipo);

  switch (eventStatus) {
    case 'em_producao':
      return <Factory className={iconClass} />;
    case 'fedex':
      return <Package className={iconClass} />;
    case 'no_armazem':
      return <Warehouse className={iconClass} />;
    case 'embarque_agendado':
      return <CalendarCheck className={iconClass} />;
    case 'embarque_confirmado':
      return <PlaneTakeoff className={iconClass} />;
    case 'chegada_brasil':
      return <Globe className={iconClass} />;
    case 'voo_internacional':
      return <Plane className={iconClass} />;
    case 'desembaraco':
      return <FileSearch className={iconClass} />;
    case 'entregue':
      return <CheckCircle className={iconClass} />;
    default:
      return <Circle className={iconClass} />;
  }
};
```

**Step 3: Update timeline step styling**

Replace the step circle styling:
```tsx
className={`relative z-10 p-3 rounded-full border-2 transition-all ${
  event.status === 'completed' ? 'bg-status-delivered/20 border-status-delivered' :
  event.status === 'current' ? 'bg-primary/20 border-primary' :
  'bg-muted border-border'
}`}
```
With:
```tsx
className={`relative z-10 p-2.5 rounded-full transition-all ${
  event.status === 'completed' ? 'bg-primary text-white' :
  event.status === 'current' ? 'bg-primary/10 border-2 border-primary ring-4 ring-primary/10' :
  'bg-muted border border-border'
}`}
```

**Step 4: Remove console.log**

Delete line: `console.log('📊 Timeline recebeu eventos:', events.length, events);`

**Step 5: Verify build**

Run: `npm run build`

**Step 6: Commit**

```bash
git add src/components/dashboard/Timeline.tsx
git commit -m "refactor: replace emoji icons with Lucide in Timeline"
```

---

### Task 9: Clean SOTable

**Files:**
- Modify: `src/components/dashboard/SOTable.tsx`

**Step 1: Clean card wrapper**

Replace:
```tsx
<Card className="shadow-card">
```
With:
```tsx
<Card className="border shadow-sm">
```

**Step 2: Simplify row highlighting**

In the TableRow className, replace:
```tsx
delayed ? 'bg-destructive/10 border-l-4 border-l-destructive' : ''
```
With:
```tsx
delayed ? 'border-l-4 border-l-destructive' : ''
```

(Keep `border-l-4` but remove the full-row background tint.)

**Step 3: Clean filter transitions**

In the Select triggers, replace `transition-all duration-300 hover:border-primary/50` with just removing those extra classes. The shadcn Select already has good defaults.

In the search Input, replace `transition-all duration-300 focus:ring-2 focus:ring-primary/20` with nothing extra.

**Step 4: Clean empty state**

Replace:
```tsx
<div className="text-center py-12 text-muted-foreground animate-fade-in">
```
With:
```tsx
<div className="text-center py-12 text-muted-foreground">
```

**Step 5: Verify build**

Run: `npm run build`

**Step 6: Commit**

```bash
git add src/components/dashboard/SOTable.tsx
git commit -m "refactor: clean SOTable, simplify row styles and remove animations"
```

---

### Task 10: Clean Remaining Components

**Files:**
- Modify: `src/components/dashboard/ReportFilters.tsx`
- Modify: `src/components/dashboard/CargoDetails.tsx`
- Modify: `src/components/dashboard/SODetails.tsx`
- Modify: `src/components/dashboard/ExecutiveDashboard.tsx`
- Modify: `src/components/dashboard/DataAuditPanel.tsx`
- Modify: `src/components/dashboard/BulkCargoUpload.tsx`

**Step 1: ReportFilters — remove font-corporate**

Replace `font-corporate` with `font-medium` in `ReportFilters.tsx`.
Replace `transition-hover hover:scale-105` with `transition-colors` (remove scale effect).

**Step 2: CargoDetails — replace raw Tailwind colors**

Replace in `CargoDetails.tsx`:
- `text-yellow-500` → `text-status-production`
- `text-green-500` → `text-status-delivered`
- `text-blue-500` → `text-primary`
- `text-red-500` → `text-destructive`

**Step 3: SODetails — replace raw colors**

Replace in `SODetails.tsx`:
- `text-green-500` → `text-status-delivered`

**Step 4: ExecutiveDashboard — replace raw colors**

Replace in `ExecutiveDashboard.tsx`:
- `text-yellow-500` → `text-status-production`
- `bg-yellow-50 text-yellow-800 border-yellow-200` → `bg-status-production/10 text-status-production border-status-production/20`

**Step 5: DataAuditPanel — replace raw colors**

Replace in `DataAuditPanel.tsx`:
- `bg-green-500` → `bg-status-delivered`
- `bg-yellow-500` → `bg-status-production`
- `bg-red-500` → `bg-destructive`
- `text-green-500` → `text-status-delivered`

**Step 6: BulkCargoUpload — replace raw colors**

Replace in `BulkCargoUpload.tsx`:
- `bg-green-500/10 text-green-600 border-green-500/20` → `bg-status-delivered/10 text-status-delivered border-status-delivered/20`
- `text-green-500` → `text-status-delivered`

**Step 7: Verify build**

Run: `npm run build`
Expected: PASS — all raw colors should now be semantic.

**Step 8: Commit**

```bash
git add src/components/dashboard/ReportFilters.tsx src/components/dashboard/CargoDetails.tsx src/components/dashboard/SODetails.tsx src/components/dashboard/ExecutiveDashboard.tsx src/components/dashboard/DataAuditPanel.tsx src/components/dashboard/BulkCargoUpload.tsx
git commit -m "refactor: replace raw Tailwind colors with semantic tokens across components"
```

---

### Task 11: Final Build Verification

**Step 1: Full build**

Run: `npm run build`
Expected: Clean build with zero errors.

**Step 2: Scan for remaining slop references**

Run: `grep -rn "glass\|hover-corporate\|corporate-card\|bg-gradient-tech\|bg-gradient-corporate\|shadow-corporate\|shadow-tech\|glow-accent\|font-tech\|bg-gradient-alert\|bg-gradient-card\|bg-gradient-success" src/`
Expected: Zero matches.

Run: `grep -rn "text-green-500\|text-yellow-500\|text-blue-500\|bg-green-500\|bg-yellow-500\|bg-red-500" src/components/dashboard/`
Expected: Zero matches (raw Tailwind colors fully replaced).

**Step 3: Fix any remaining issues found in step 2**

If any matches remain, fix them following the same patterns from previous tasks.

**Step 4: Final commit if needed**

```bash
git commit -m "refactor: final cleanup of remaining slop references"
```
