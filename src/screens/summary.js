import { icon } from '../icons.js';
import { budgetSummary, capacitySummary, dailyBudgetPace, operationalBudgetTotal, operationalCategoryRows } from '../services/financeService.js';
import { card, emptyState, iconBubble } from '../components/ui.js';
import { formatMoney, html } from '../utils/format.js';

export function renderSummary(state) {
  const analysis = state.filters.summary || { excludedCategories: [], includeExtraordinary: false };
  const capacity = capacitySummary(state);
  const budget = budgetSummary(state);
  const rows = operationalCategoryRows(state, state.period, { includeExtraordinary: analysis.includeExtraordinary })
    .filter(row => !analysis.excludedCategories.includes(row.name));
  const isMonthly = state.period.mode === 'month';
  const pace = isMonthly ? dailyBudgetPace(state, state.period, {
    includeExtraordinary: analysis.includeExtraordinary,
    excludedCategories: analysis.excludedCategories
  }) : [];
  const paceBudget = isMonthly ? operationalBudgetTotal(state, state.period, {
    excludedCategories: analysis.excludedCategories
  }) : 0;
  return `
    ${renderCapacityCard(capacity)}
    ${renderBudgetHealthCard(budget)}
    ${renderOperationalChart(rows, analysis)}
    ${renderPaceChart(pace, paceBudget, isMonthly)}
  `;
}

function renderCapacityCard(capacity) {
  const isPositive = capacity.projectedBalance >= 0;
  return card(`
    <div class="summary-card-head">
      ${iconBubble('wallet', isPositive ? 'var(--green)' : 'var(--red)', false, 'summary-card-icon')}
      <div class="card-heading-block"><h2 class="card-heading">Capacidad de pago</h2><div class="metric-note">Después de reservas, plan pendiente y deuda.</div></div>
      <span class="status-dot ${isPositive ? 'good' : 'alert'}"></span>
    </div>
    <div class="capacity-hero">
      <small>Saldo proyectado</small>
      <strong class="money ${isPositive ? 'success' : 'danger'}">${formatSignedMoney(capacity.projectedBalance)}</strong>
    </div>
    <div class="summary-stat-grid">
      ${summaryStat('Liquidez utilizable', capacity.liquidityUsable)}
      ${summaryStat('Por ejecutar', capacity.planRemaining)}
      ${summaryStat('Deuda neta', capacity.debt)}
    </div>
    <div class="summary-card-actions">
      <button class="text-button" data-open-capacity-calculation>${icon('calculator')} Ver cálculo</button>
      <button class="text-button" data-settings="capacity">Configurar</button>
    </div>
  `, 'summary-capacity-card');
}

function renderBudgetHealthCard(budget) {
  const hasDeviation = budget.excessTotal > 0;
  const progress = Math.min(100, budget.executedPct);
  return card(`
    <div class="summary-card-head">
      ${iconBubble('heartPulse', hasDeviation ? 'var(--amber)' : 'var(--blue)', false, 'summary-card-icon')}
      <div class="card-heading-block"><h2 class="card-heading">Salud presupuestaria</h2><div class="metric-note">Ejecución del período seleccionado.</div></div>
      <span class="summary-percent">${budget.executedPct.toFixed(0)}%</span>
    </div>
    <div class="progress budget-progress"><span style="width:${progress}%;background:${hasDeviation ? 'var(--amber)' : 'var(--blue)'}"></span></div>
    <div class="summary-stat-grid budget-summary-grid">
      ${summaryStat('Plan', budget.totalBudget)}
      ${summaryStat('Ejecutado', budget.used)}
      ${summaryStat('Por ejecutar', budget.pending)}
      ${summaryStat('Desviación del plan', budget.excessTotal, hasDeviation ? 'danger' : 'success')}
    </div>
    <div class="summary-card-note">${hasDeviation ? 'Incluye gasto sin presupuesto o excedente sobre la categoría presupuestada.' : 'Sin gasto fuera del plan en este período.'}</div>
  `, 'summary-budget-card');
}

function renderOperationalChart(rows, analysis) {
  const topRows = rows.slice(0, 5);
  const total = rows.reduce((sum, row) => sum + row.spent, 0);
  const details = [];
  if (!analysis.includeExtraordinary) details.push('extraordinarios fuera');
  if (analysis.excludedCategories.length) details.push(`${analysis.excludedCategories.length} categoría${analysis.excludedCategories.length === 1 ? '' : 's'} fuera`);
  return card(`
    <div class="summary-card-head">
      ${iconBubble('barChart', 'var(--blue)', false, 'summary-card-icon')}
      <div class="card-heading-block"><h2 class="card-heading">Gasto operativo por categoría</h2><div class="metric-note">${details.length ? details.join(' · ') : 'Gastos registrados del período.'}</div></div>
      <button class="ghost-icon" data-open-summary-analysis aria-label="Ajustar análisis">${icon('settings')}</button>
    </div>
    ${topRows.length ? `<div class="chart-bars summary-chart-bars">${topRows.map((row, index) => barRow(row, total, chartColor(index))).join('')}</div>` : emptyState('barChart', 'Sin gasto operativo', 'Registra gastos o revisa los filtros de análisis.')}
    <div class="summary-card-actions"><button class="text-button" data-open-summary-analysis>${icon('settings')} Análisis</button><button class="text-button" data-view-categories>Ver categorías ${icon('chevronRight')}</button></div>
  `, 'chart-card summary-chart-card');
}

function renderPaceChart(rows, totalBudget, isMonthly) {
  const actualTotal = rows.at(-1)?.actual || 0;
  return card(`
    <div class="summary-card-head">
      ${iconBubble('chart', 'var(--green)', false, 'summary-card-icon')}
      <div class="card-heading-block"><h2 class="card-heading">Ritmo presupuestario</h2><div class="metric-note">Acumulado día a día frente a una guía lineal del plan.</div></div>
    </div>
    ${!isMonthly ? emptyState('calendar', 'Disponible por mes', 'Selecciona un período mensual para ver el ritmo día a día.') : totalBudget ? renderPaceSvg(rows) : emptyState('chart', 'Sin presupuesto para comparar', 'Crea un presupuesto mensual para ver el ritmo de gasto.')}
    ${isMonthly && totalBudget ? `<div class="pace-legend"><span><i class="legend-dot actual"></i>Gasto operativo ${formatMoney(actualTotal)}</span><span><i class="legend-line"></i>Guía del plan</span></div>` : ''}
  `, 'chart-card pace-card');
}

function renderPaceSvg(rows) {
  const max = Math.max(1, ...rows.map(row => Math.max(row.actual, row.expected)));
  const x = index => 12 + index * (276 / Math.max(1, rows.length - 1));
  const y = amount => 112 - (amount / max * 88);
  const points = key => rows.map((row, index) => `${x(index).toFixed(1)},${y(row[key]).toFixed(1)}`).join(' ');
  const mid = Math.ceil(rows.length / 2);
  return `
    <div class="pace-chart-wrap">
      <svg class="pace-chart" viewBox="0 0 300 136" role="img" aria-label="Ritmo presupuestario acumulado">
        <path class="pace-grid-line" d="M12 24H288M12 68H288M12 112H288"></path>
        <polyline class="pace-guide" points="${points('expected')}"></polyline>
        <polyline class="pace-actual" points="${points('actual')}"></polyline>
        <circle class="pace-last-point" cx="${x(rows.length - 1).toFixed(1)}" cy="${y(rows.at(-1)?.actual || 0).toFixed(1)}" r="3.8"></circle>
        <text x="12" y="130">1</text><text x="${x(mid - 1).toFixed(1)}" y="130" text-anchor="middle">${mid}</text><text x="288" y="130" text-anchor="end">${rows.length}</text>
      </svg>
    </div>
  `;
}

function summaryStat(label, value, tone = '') {
  return `<div class="summary-stat"><small>${label}</small><strong class="money ${tone}">${formatSignedMoney(value)}</strong></div>`;
}

function barRow(row, total, color) {
  const pct = total ? row.spent / total * 100 : 0;
  return `
    <div class="bar-row">
      <div class="bar-label">${html(row.name)}</div>
      <div class="bar-track"><div class="bar-fill" style="width:${Math.max(6, pct)}%;background:${color}"><span>${formatMoney(row.spent)}</span></div></div>
      <div class="bar-pct">${pct.toFixed(0)}%</div>
    </div>
  `;
}

export function renderSummaryAnalysisSheet(state) {
  const filters = state.filters.summary || { excludedCategories: [], includeExtraordinary: false };
  const rows = operationalCategoryRows(state, state.period, { includeExtraordinary: true });
  return `
    <div class="sheet-backdrop open" data-sheet-close>
      <section class="sheet wide summary-analysis-sheet" onclick="event.stopPropagation()">
        <div class="sheet-head-row"><button class="ghost-icon" data-sheet-close aria-label="Cerrar">${icon('x')}</button><h2 class="sheet-title">Análisis operativo</h2><span></span></div>
        <p class="muted tight">Estos controles sólo cambian las gráficas de Resumen. No modifican cuentas, totales, presupuesto ni trazabilidad.</p>
        <label class="analysis-toggle">
          <span class="row-icon" style="background:var(--amber-soft);color:var(--amber)">${icon('sparkles')}</span>
          <span><strong>Incluir extraordinarios</strong><small>Por defecto se excluyen para revelar el gasto operativo recurrente.</small></span>
          <input type="checkbox" data-summary-include-extraordinary ${filters.includeExtraordinary ? 'checked' : ''}><i></i>
        </label>
        <h3 class="sheet-section-title">Categorías incluidas</h3>
        <div class="analysis-category-list">
          ${rows.length ? rows.map(row => {
            const included = !filters.excludedCategories.includes(row.name);
            return `<button class="analysis-category-row ${included ? 'selected' : ''}" data-summary-category-toggle="${html(row.name)}"><span class="row-icon" style="background:${row.color}18;color:${row.color}">${icon(row.icon || 'folder')}</span><span><strong>${html(row.name)}</strong><small>${formatMoney(row.spent)}</small></span>${included ? icon('check') : icon('x')}</button>`;
          }).join('') : emptyState('barChart', 'Sin categorías con gasto')}
        </div>
        <button class="secondary-button mt-md" data-sheet-close>Listo</button>
      </section>
    </div>
  `;
}

export function renderCapacityCalculationSheet(state) {
  const capacity = capacitySummary(state);
  return `
    <div class="sheet-backdrop open" data-sheet-close>
      <section class="sheet wide capacity-sheet" onclick="event.stopPropagation()">
        <div class="sheet-head-row"><button class="ghost-icon" data-sheet-close aria-label="Cerrar">${icon('x')}</button><h2 class="sheet-title">Cálculo de capacidad</h2><span></span></div>
        <p class="muted tight">Una lectura conservadora de lo que queda para afrontar el mes. Puedes configurar qué cuentas y provisiones participan.</p>
        <div class="calculation-list">
          ${calculationLine('Liquidez de cuentas', capacity.liquidity, 'plus', 'Cuentas clasificadas como liquidez.')}
          ${calculationLine('Provisiones seleccionadas', capacity.selectedProvisions, 'minus', 'Sus saldos conceptuales se reservan antes de proyectar.')}
          ${calculationLine('Liquidez utilizable', capacity.liquidityUsable, 'result', 'Liquidez después de provisiones.')}
          ${calculationLine('Por ejecutar', capacity.planRemaining, 'minus', 'Presupuesto que aún falta consumir, sin restar desviaciones dos veces.')}
          ${calculationLine('Deuda neta', capacity.debt, 'minus', 'Saldos negativos de cuentas configuradas como deuda.')}
          ${calculationLine('Saldo proyectado', capacity.projectedBalance, 'final', 'Resultado tras cubrir las obligaciones configuradas.')}
        </div>
        <button class="primary-button" data-open-capacity-settings>Configurar capacidad</button>
        <button class="secondary-button mt-sm" data-sheet-close>Cerrar</button>
      </section>
    </div>
  `;
}

function calculationLine(label, value, kind, note) {
  const amount = kind === 'minus' ? `−${formatMoney(value)}` : formatSignedMoney(value);
  return `<div class="calculation-line ${kind}"><div><strong>${label}</strong><small>${note}</small></div><strong class="money">${amount}</strong></div>`;
}

function formatSignedMoney(value) {
  return `${value < 0 ? '−' : ''}${formatMoney(value)}`;
}

function chartColor(index) {
  return ['#0A8FE8', '#07966F', '#7C5CFF', '#C68000', '#DC3F61'][index % 5];
}
