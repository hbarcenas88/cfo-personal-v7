# Operational Chart Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the operational-spending chart with the approved mobile pattern: category and amount on one line, a thin percentage-faithful bar below, and a secondary percentage outside the bar.

**Architecture:** Keep financial logic in `financeService` by deriving a filtered operational distribution once, including each row's share of the same total used by the chart. `summary.js` consumes that presentation-ready distribution without recalculating percentages; `screens.css` owns the two-line row layout. Existing budget, account, transfer and extraordinary behavior remain unchanged.

**Tech Stack:** Browser-native ES modules, Node `assert/strict` tests, HTML string rendering, CSS, Browser mobile validation at 390 × 844.

## Global Constraints

- The card shows at most five rows, ordered by included operational spending.
- Amount, percentage and bar width must use the same filtered operational total.
- Extraordinary and excluded-category filters remain analytical only; they never alter balances, KPIs, budgets, transfers or traceability.
- Do not add native `<select>` elements, new chips, circular charts or row-level tap actions.
- No text may be rendered inside a bar fill.
- Each bar is at least 8 px high; color is accompanied by the category name, amount and percentage.
- Preserve the empty state and both explicit actions: `Análisis` and `Ver categorías`.
- Validate syntax, focused regressions, full existing tests and mobile layout at 390 × 844 before publishing.

---

### Task 1: Derive a single operational distribution

**Files:**
- Modify: `src/services/financeService.js:256-261`
- Modify: `tests/capacity-summary.test.mjs:1-76`

**Interfaces:**
- Consumes: `operationalCategoryRows(state, period, { includeExtraordinary })`, `canon`, and category filters from `state.filters.summary.excludedCategories`.
- Produces: `operationalCategoryDistribution(state, period, { includeExtraordinary, excludedCategories })`, returning `Array<{ name, spent, share, planned, pct, available, icon, color, subcategories }>` sorted by `spent` descending.
- The returned `share` is a decimal from `0` to `1`, calculated from the sum of all included operational rows. A no-spend distribution returns an empty array.

- [ ] **Step 1: Write the failing distribution regression**

  In `tests/capacity-summary.test.mjs`, import the new helper and add this deterministic fixture after the existing pace assertions:

  ```js
  const distributionState = {
    ...state,
    transactions: [
      ...state.transactions,
      { id: 'grocery', date: '2026-07-06', account: 'Caja', movement: 'Gasto', category: 'Hogar', amount: 50 }
    ]
  };
  const distribution = operationalCategoryDistribution(distributionState, state.period, {
    excludedCategories: []
  });
  assert.deepEqual(distribution.map(row => [row.name, row.spent, row.share]), [
    ['Comida', 200, 0.8],
    ['Hogar', 50, 0.2]
  ]);
  assert.deepEqual(
    operationalCategoryDistribution(distributionState, state.period, {
      excludedCategories: ['Comida']
    }).map(row => [row.name, row.share]),
    [['Hogar', 1]]
  );
  ```

- [ ] **Step 2: Run the focused test to verify it fails**

  Run:

  ```powershell
  node tests/capacity-summary.test.mjs
  ```

  Expected: failure because `operationalCategoryDistribution` is not exported.

- [ ] **Step 3: Add the minimal pure helper**

  Add this export immediately after `operationalCategoryRows` in `src/services/financeService.js`:

  ```js
  export function operationalCategoryDistribution(state, period = state.period, {
    includeExtraordinary = false,
    excludedCategories = []
  } = {}) {
    const rows = operationalCategoryRows(state, period, { includeExtraordinary })
      .filter(row => !excludedCategories.some(category => canon(category) === canon(row.name)));
    const total = sum(rows.map(row => row.spent));
    return total
      ? rows.map(row => ({ ...row, share: row.spent / total }))
      : [];
  }
  ```

  Do not modify `budgetSummary`, `operationalBudgetTotal`, `dailyBudgetPace`, account balances, or transaction normalization.

- [ ] **Step 4: Run the focused regression to verify it passes**

  Run:

  ```powershell
  node tests/capacity-summary.test.mjs
  ```

  Expected: `capacity-summary.test.mjs passed`.

- [ ] **Step 5: Commit the independently tested domain change**

  ```powershell
  git add src/services/financeService.js tests/capacity-summary.test.mjs
  git commit -m "feat: derive operational spending distribution"
  ```

### Task 2: Render the approved two-line chart rows

**Files:**
- Modify: `src/screens/summary.js:1-4, 6-17, 66-125`
- Modify: `styles/screens.css:1780-1815`
- Modify: `tests/mobile-ui-contract.test.mjs:1-18`

**Interfaces:**
- Consumes: `operationalCategoryDistribution` from `financeService` and rows that include `share` from Task 1.
- Produces: semantic `.operational-chart-total`, `.operational-chart-row`, `.operational-chart-row-head`, `.operational-chart-scale`, `.operational-chart-track`, and `.operational-chart-share` markup.
- The bar receives `style="width:${(row.share * 100).toFixed(1)}%"` and `role="progressbar"`; its `aria-valuenow` uses the same rounded percentage.

- [ ] **Step 1: Write failing markup and styling contracts**

  Append the following assertions to `tests/mobile-ui-contract.test.mjs`:

  ```js
  const summary = await readFile(new URL('../src/screens/summary.js', import.meta.url), 'utf8');
  assert.match(summary, /operationalCategoryDistribution/);
  assert.match(summary, /class="operational-chart-total"/);
  assert.match(summary, /class="operational-chart-row"/);
  assert.match(summary, /class="operational-chart-share"/);
  assert.match(summary, /role="progressbar"/);
  assert.doesNotMatch(summary, /bar-fill[^]*?<span>\$\{formatMoney\(row\.spent\)\}/);
  assert.match(styles, /\.operational-chart-track\s*\{[\s\S]*?height:\s*8px/);
  assert.match(styles, /\.operational-chart-row-head\s*\{[\s\S]*?grid-template-columns:\s*auto minmax\(0, 1fr\) auto/);
  ```

- [ ] **Step 2: Run the UI contract test to verify it fails**

  Run:

  ```powershell
  node tests/mobile-ui-contract.test.mjs
  ```

  Expected: failure because the Summary renderer still emits `.bar-row` and places the monetary value inside `.bar-fill`.

- [ ] **Step 3: Replace Summary's chart data path and renderer**

  In `src/screens/summary.js`:

  1. Replace the `operationalCategoryRows` import with `operationalCategoryDistribution`.
  2. Replace the existing `rows` assignment with:

     ```js
     const rows = operationalCategoryDistribution(state, state.period, {
       includeExtraordinary: analysis.includeExtraordinary,
       excludedCategories: analysis.excludedCategories
     });
     ```

  3. In `renderOperationalChart`, keep `const topRows = rows.slice(0, 5);`, calculate `const total = rows.reduce((sum, row) => sum + row.spent, 0);`, and render `topRows.map(row => operationalBarRow(row)).join('')`.
  4. Directly after the chart-card heading, add the compact total surface:

     ```js
     <div class="operational-chart-total">
       <small>Analizado en el período</small>
       <strong class="money">${formatMoney(total)}</strong>
     </div>
     ```

     Render this surface only when `topRows.length` is non-zero; preserve the existing empty state when there is no operational spending.
  5. Replace `barRow` with:

     ```js
     function operationalBarRow(row) {
       const percent = row.share * 100;
       const label = `${row.name}: ${formatMoney(row.spent)}, ${percent.toFixed(0)}% del gasto operativo`;
       return `
         <div class="operational-chart-row">
           <div class="operational-chart-row-head">
             <span class="operational-category"><i style="background:${row.color}"></i><span>${html(row.name)}</span></span>
             <strong class="money">${formatMoney(row.spent)}</strong>
           </div>
           <div class="operational-chart-scale">
             <div class="operational-chart-track" role="progressbar" aria-label="${html(label)}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${percent.toFixed(1)}">
               <span style="width:${percent.toFixed(1)}%;background:${row.color}"></span>
             </div>
             <span class="operational-chart-share">${percent.toFixed(0)}%</span>
           </div>
         </div>
       `;
     }
     ```

  Remove `chartColor`; the category's existing configured color is the only visual accent.

- [ ] **Step 4: Add the approved mobile CSS**

  Replace the obsolete `.summary-chart-card .bar-fill span` rule with:

  ```css
  .operational-chart-row {
    display: grid;
    gap: 8px;
    padding: 12px 0;
    border-top: 1px solid var(--line);
  }

  .operational-chart-total {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 12px;
    margin: 16px 0 4px;
    padding: 11px 12px;
    border-radius: var(--radius-md);
    background: var(--surface-soft);
  }

  .operational-chart-total small {
    color: var(--text-muted);
    font-size: 11px;
    font-weight: 760;
  }

  .operational-chart-total .money {
    font-size: 18px;
    font-variant-numeric: tabular-nums;
  }

  .operational-chart-row:first-child { border-top: 0; padding-top: 2px; }

  .operational-chart-row-head {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto;
    align-items: center;
    gap: 8px;
  }

  .operational-category {
    min-width: 0;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-size: 14px;
    font-weight: 780;
  }

  .operational-category > span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .operational-category i {
    width: 10px;
    height: 10px;
    flex: 0 0 10px;
    border-radius: 4px;
  }

  .operational-chart-row-head .money {
    font-size: 14px;
    font-variant-numeric: tabular-nums;
  }

  .operational-chart-scale {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 38px;
    align-items: center;
    gap: 8px;
  }

  .operational-chart-track {
    height: 8px;
    overflow: hidden;
    border-radius: 999px;
    background: var(--surface-soft);
  }

  .operational-chart-track > span {
    display: block;
    height: 100%;
    min-width: 2px;
    border-radius: inherit;
  }

  .operational-chart-share {
    color: var(--text-muted);
    text-align: right;
    font-size: 12px;
    font-weight: 780;
    font-variant-numeric: tabular-nums;
  }
  ```

- [ ] **Step 5: Run syntax and UI contracts**

  Run:

  ```powershell
  node --check src/screens/summary.js
  node tests/mobile-ui-contract.test.mjs
  node tests/capacity-summary.test.mjs
  ```

  Expected: each command exits `0`, and both named tests print `passed`.

- [ ] **Step 6: Commit the rendered chart**

  ```powershell
  git add src/screens/summary.js styles/screens.css tests/mobile-ui-contract.test.mjs
  git commit -m "feat: refine operational spending chart"
  ```

### Task 3: Record the pattern and verify delivery quality

**Files:**
- Modify: `DESIGN_SYSTEM.md:84-88`
- Modify: `VERIFIER.md:21-30`
- Test: `tests/storage-scope.test.mjs`, `tests/transaction-edit.test.mjs`, `tests/capacity-summary.test.mjs`, `tests/mobile-ui-contract.test.mjs`

**Interfaces:**
- Consumes: the rendered pattern from Task 2 and the existing mobile verification checklist.
- Produces: an explicit design-system agreement and a delivery criterion for share-faithful bars.

- [ ] **Step 1: Add the design-system agreement**

  Replace the `Gasto operativo por categoría` bullet in `DESIGN_SYSTEM.md` with:

  ```markdown
  - **Gasto operativo por categoría:** máximo cinco filas ordenadas por gasto. Cada fila usa marcador de color, nombre y monto en la primera línea; una barra fina y su porcentaje secundario en la segunda. El largo de la barra y el porcentaje representan la misma participación sobre el total operativo incluido. No usar texto dentro de la barra ni una nube de chips debajo de la gráfica.
  ```

- [ ] **Step 2: Add a verifier criterion**

  Add this unchecked item under `### Revisión visual obligatoria a 390 × 844` in `VERIFIER.md`:

  ```markdown
  - [ ] En Gasto operativo, confirmar que monto, porcentaje y ancho de barra corresponden al mismo total filtrado; que no hay texto dentro de barras y que los nombres largos no desplazan el monto ni el porcentaje.
  ```

- [ ] **Step 3: Run the complete local verification suite**

  Run:

  ```powershell
  $files = Get-ChildItem -Path src -Recurse -Filter *.js
  foreach ($file in $files) {
    node --check $file.FullName
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
  }
  node --check service-worker.js
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
  node tests/storage-scope.test.mjs
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
  node tests/transaction-edit.test.mjs
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
  node tests/capacity-summary.test.mjs
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
  node tests/mobile-ui-contract.test.mjs
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
  git diff --check
  ```

  Expected: all commands exit `0`; the three named tests print `passed`.

- [ ] **Step 4: Perform the required Browser review**

  Start the local server from the repository root, open `http://127.0.0.1:8787/`, set the viewport to `390 × 844`, then seed or use non-personal test data with at least four included categories.

  Check and record in `VERIFIER.md`:

  ```text
  - No horizontal overflow (`document.documentElement.scrollWidth === 390`).
  - Each amount and percentage is fully visible.
  - The visual bar width matches the displayed percentage, including a category below 10%.
  - Long category names truncate before the amount; neither value overlaps the next card or bottom navigation.
  - The `Análisis` sheet still filters the card and the pace chart without changing financial totals.
  ```

- [ ] **Step 5: Commit delivery evidence**

  ```powershell
  git add DESIGN_SYSTEM.md VERIFIER.md
  git commit -m "docs: verify operational chart pattern"
  ```
