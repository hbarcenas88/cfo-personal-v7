import { icon } from '../icons.js';
import { budgetSummary, categoryRows, kpis, monthlySeries } from '../services/financeService.js';
import { card, emptyState, metricCard } from '../components/ui.js';
import { formatMoney } from '../utils/format.js';

export function renderSummary(state) {
  const data = kpis(state);
  const budget = budgetSummary(state);
  const rows = categoryRows(state).filter(row => row.spent > 0);
  const visibleRows = rows.filter(row => !state.filters.excludedChartCategories.includes(row.name));
  return `
    <div class="metric-grid">
      ${metricCard({ title: 'Ingresos período', value: formatMoney(data.income), note: 'Comparado contra período anterior', iconName: 'arrowUpRight', color: 'var(--green)', delta: data.incomeDelta })}
      ${metricCard({ title: 'Gastos período', value: formatMoney(data.expense), note: 'Sin transferencias', iconName: 'arrowDownRight', color: 'var(--red)', delta: data.expenseDelta })}
    </div>
    ${renderBudgetCard(budget)}
    ${renderCategoryChart(visibleRows, rows)}
    ${renderTrendChart(state)}
    ${renderFlowChart(state)}
  `;
}

function renderBudgetCard(budget) {
  return card(`
    <div class="metric-top">
      <div>
        <div class="metric-title" style="font-weight:850;color:var(--text)">Presupuesto del período</div>
        <div class="metric-value money" style="font-size:28px;">${formatMoney(budget.totalBudget)}</div>
      </div>
      <div class="metric-value blue" style="font-size:30px;">${budget.executedPct.toFixed(0)}%</div>
    </div>
    <div class="progress" style="margin:12px 0;"><span style="width:${Math.min(100, budget.executedPct)}%;background:${budget.executedPct > 100 ? 'var(--red)' : 'var(--blue)'}"></span></div>
    <div class="budget-stats">
      <div class="budget-stat"><small>Usado</small><strong>${formatMoney(budget.used)}</strong></div>
      <div class="budget-stat"><small>Pendiente</small><strong>${formatMoney(budget.pending)}</strong></div>
      <div class="budget-stat"><small>Exceso</small><strong class="danger">${formatMoney(budget.excessTotal)}</strong></div>
    </div>
  `);
}

function renderCategoryChart(rows, allRows) {
  const total = rows.reduce((sum, row) => sum + row.spent, 0);
  return card(`
    <div class="metric-top">
      <div><h2 style="margin:0;font-size:19px;">Gasto por categoría</h2><div class="metric-note">Desmarca una categoría para recalcular porcentajes.</div></div>
      <span class="chip active">${rows.length} categorías</span>
    </div>
    ${rows.length ? `<div class="chart-bars">${rows.map((row, index) => barRow(row, total, palette(index))).join('')}</div>` : emptyState('barChart', 'Sin gastos por categoría')}
    ${allRows.length ? `<div class="chip-row" style="margin-top:14px;">${allRows.map(row => `<button class="chip ${rows.includes(row) ? 'active' : ''}" data-chart-toggle="${row.name}">${row.name}</button>`).join('')}</div>` : ''}
  `);
}

function barRow(row, total, color) {
  const pct = total ? (row.spent / total) * 100 : 0;
  return `
    <div class="bar-row">
      <div class="bar-label">${row.name}</div>
      <div class="bar-track"><div class="bar-fill" style="width:${Math.max(5, pct)}%;background:${color};">${formatMoney(row.spent)}</div></div>
      <div class="bar-pct">${pct.toFixed(0)}%</div>
    </div>
  `;
}

function renderTrendChart(state) {
  const rows = monthlySeries(state);
  const max = Math.max(1, ...rows.map(row => Math.max(row.expense, row.budget)));
  return card(`
    <div class="metric-top"><div><h2 style="margin:0;font-size:19px;">Real vs presupuesto</h2><div class="metric-note">Comparación mensual del año visible</div></div>${icon('barChart')}</div>
    <div class="mini-chart">${rows.map(row => `<div class="mini-col"><span style="height:${row.expense / max * 118}px;background:var(--red)"></span><span style="height:${row.budget / max * 118}px;background:var(--blue)"></span></div>`).join('')}</div>
    <div class="chip-row"><span class="chip"><span style="width:10px;height:10px;background:var(--red);border-radius:50%"></span>Real</span><span class="chip"><span style="width:10px;height:10px;background:var(--blue);border-radius:50%"></span>Presupuesto</span></div>
  `);
}

function renderFlowChart(state) {
  const rows = monthlySeries(state);
  const max = Math.max(1, ...rows.map(row => Math.max(row.income, row.expense)));
  return card(`
    <div class="metric-top"><div><h2 style="margin:0;font-size:19px;">Ingresos vs gastos</h2><div class="metric-note">Evolución mensual</div></div>${icon('chart')}</div>
    <div class="mini-chart">${rows.map(row => `<div class="mini-col"><span style="height:${row.income / max * 118}px;background:var(--green)"></span><span style="height:${row.expense / max * 118}px;background:var(--red)"></span></div>`).join('')}</div>
  `);
}

function palette(index) {
  return ['#0A8FE8', '#07966F', '#DC3F61', '#7C5CFF', '#C68000', '#00A6C8', '#E0569B'][index % 7];
}
