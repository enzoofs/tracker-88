# Visual Overhaul Design — Síntese Tracker

**Date:** 2026-03-01
**Status:** Approved
**Approach:** Hybrid (Token redefinition + targeted component refinement)
**Style:** Corporate Polido — professional, restrained, identity-preserving

## Objective

Remove "AI slop" aesthetics (excessive gradients, glass effects, emoji icons, inconsistent styling) and replace with a polished, professional corporate design. Frontend-only changes.

## 1. Color Palette

### Primary Colors

| Token | Current | New | Rationale |
|---|---|---|---|
| `--primary` | `#39BDE6` (HSL 198 77% 56%) | `#2563EB` (HSL 217 91% 53%) — blue-600 | More professional, less "template" |
| `--secondary` | `#253786` (HSL 230 54% 34%) | `#1E40AF` (HSL 224 76% 48%) — blue-800 | Harmonizes with new primary |
| `--background` | `hsl(0 0% 98%)` | `hsl(220 14% 96%)` | Subtle blue tint for cohesion |
| `--muted` | `hsl(210 40% 96%)` | `hsl(220 14% 96%)` | Align with background |

### Status Colors (desaturated)

- Production: amber-600
- Shipping/Transit: primary blue
- Delivered: green-600
- Alert: red-600

### Eliminated

- All `--gradient-*` CSS variables
- `--shadow-corporate`, `--shadow-tech` tokens
- `glow-accent` animation

## 2. Typography

- Header title: `text-3xl` → `text-xl font-semibold`
- KPI values: `text-3xl` → `text-2xl font-semibold tabular-nums`
- Labels: standardize `text-sm text-muted-foreground`
- Font family: keep Roboto + Source Code Pro (tracking numbers)
- Prefer `font-semibold` over `font-bold` for headers

## 3. Shadows & Borders

### Two shadow levels only

- `shadow-sm`: `0 1px 2px 0 rgb(0 0 0 / 0.05)` — cards at rest
- `shadow-md`: `0 4px 6px -1px rgb(0 0 0 / 0.07)` — hover/elevation

### Border cleanup

- Standardize `border-border` (remove `border-border/50`)
- Standardize `--radius: 0.5rem` (remove ad-hoc `rounded-2xl`)

## 4. Component Changes

### Header

- Remove Globe icon with gradient container
- Title: `text-xl font-semibold`, plain text
- Background: `bg-card border-b` (no gradient)
- Bell badge: simple `bg-red-500 text-white` dot (no glow/gradient)
- User dropdown: `bg-card border` (no glass effect)

### KPI Cards

- Icon: flat `text-primary` (no gradient container)
- Value: `text-2xl font-semibold tabular-nums`
- Card: `bg-card border shadow-sm` (no `corporate-card`, no hover lift)
- Remove staggered `animate-fade-in`

### SO Table

- Header: `bg-muted/50`, `text-xs font-medium uppercase tracking-wider`
- Row hover: `bg-muted/50` subtle
- Remove `bg-destructive/10` full-row highlight (keep `border-l-4` only)
- Status badges: consistent padding, `font-medium text-xs`

### Cargo Cards

- Remove amber/primary ring around card
- Package icon: flat `text-primary` (no bg container)
- Cleaner internal layout: `text-sm` label + `font-medium` value

### Timeline (SO Details)

- Replace emojis with Lucide icons: Factory, Package, Truck, Plane, FileCheck, CheckCircle
- Completed step: `bg-primary text-white`
- Current step: `bg-primary ring-4 ring-primary/20`
- Future step: `bg-muted text-muted-foreground`

## 5. Global Eliminations

| What | Replace with |
|---|---|
| `glass` class (backdrop-blur) | `bg-card border` |
| `hover-corporate` (translateY lift) | `hover:bg-muted/50` or nothing |
| `glow-accent` | Remove |
| `animate-fade-in` on cards | Remove |
| `--gradient-*` CSS vars | Flat colors |
| `corporate-card`, `shadow-corporate`, `shadow-tech` | `shadow-sm` |
| Raw Tailwind colors (`text-green-500`, `text-yellow-500`) | Semantic tokens |
| Emoji icons in Timeline | Lucide icons |

## Files to Modify

### Global (tokens + config)
- `src/index.css` — CSS variables, custom classes, gradient definitions
- `tailwind.config.ts` — color tokens, shadow config

### Components (targeted refinement)
- `src/components/dashboard/DashboardHeader.tsx`
- `src/components/dashboard/Overview.tsx` (KPI cards)
- `src/components/dashboard/SOTable.tsx`
- `src/components/dashboard/CargoCard.tsx`
- `src/components/dashboard/Timeline.tsx`
- `src/components/dashboard/StatusBadge.tsx` or badge utilities
- Any component using `glass`, `hover-corporate`, `corporate-card` classes
