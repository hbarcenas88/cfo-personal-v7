# V7 Summary Capacity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Deliver the first harmonized CFO Personal V7 flow: configurable capacity of payment, a decision-oriented Summary, and a simplified Categories screen.

**Architecture:** Add a small persisted `capacityRules` configuration to the state, expose pure financial helpers for capacity and analytical-only extraordinary exclusions, then consume those helpers from settings, Summary, and Categories. Existing accounting totals, transfer handling, and budget calculations remain authoritative and unchanged.

**Tech Stack:** Browser-native ES modules, IndexedDB/local state, Node `assert/strict` tests, CSS.

## Global Constraints

- V7 remains mobile-first at 390×844; do not use native `<select>` controls.
- Transfers never affect income, expense, budget, or analytical category charts.
- `isExtraordinary` affects analytical visualizations only; it never changes balances, KPIs, budgets, or traceability.
- Capacity rules use explicit account roles (`liquidity`, `debt`, `exclude`) and selected provision catalog balances; no formula builder.
- Default migration: accounts currently included in `available` become liquidity, all provisions are selected, and debt is empty.
- No personal data, exports, or screenshots are committed.

### Task 1: Capacity and analytical domain helpers

**Files:** `src/state.js`, `src/services/financeService.js`, `tests/capacity-summary.test.mjs`

- [ ] Add and migrate persisted `capacityRules` with account-role and provision-selection defaults.
- [ ] Preserve `isExtraordinary` in transaction normalization and edit paths.
- [ ] Add pure `capacitySummary`, `operationalCategoryRows`, and daily in-period pace helpers.
- [ ] Test liquidity, selected provision balances, debt normalization, plan remaining, projected balance, and extraordinary-only analytical exclusion.

### Task 2: Capacity configuration and shared shell

**Files:** `src/screens/settings.js`, `src/main.js`, `src/components/ui.js`, `styles/components.css`

- [ ] Add a compact “Capacidad de pago” configuration flow under settings rules.
- [ ] Let users set account roles and provision participation through custom mobile controls.
- [ ] Add the existing calendar icon to the period control and replace the Summary nav icon with the trend icon.
- [ ] Keep account balances and existing KPI switches unchanged.

### Task 3: Summary and Categories redesign

**Files:** `src/screens/summary.js`, `src/screens/categories.js`, `src/main.js`, `styles/screens.css`, `styles/components.css`

- [ ] Render capacity and budget-health cards with `Ver cálculo` and an analysis sheet.
- [ ] Render the top-five operational category bars and the daily cumulative budget pace; remove the standalone income-versus-expense chart.
- [ ] Remove the global expandable budget block from Categories while retaining category-level detail.
- [ ] Add an edit-flow control for marking a transaction extraordinary; preserve totals and budget figures.

### Task 4: Design governance and delivery evidence

**Files:** `DESIGN_SYSTEM.md`, `PRODUCT_SPEC.md`, `V7_ROADMAP.md`, `BACKLOG.md`, `PROGRESS.md`, `VERIFIER.md`

- [ ] Record the approved visual direction, financial terms, phased adoption matrix, and deferred Stage 2–3 work.
- [ ] Run Node tests, syntax checks, and a 390×844 mobile review.
- [ ] Record actual verification evidence and PWA cache implications.
