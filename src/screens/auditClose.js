import { icon } from '../icons.js';
import { buildGuidedAuditReview } from '../services/guidedAuditService.js';
import { card } from '../components/ui.js';
import { formatDate, formatMoney, html } from '../utils/format.js';

const FILE_ACCEPT = '.csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

export function renderAuditCloseEntry(state) {
  const openCount = (state.auditClosures || []).filter(close => buildGuidedAuditReview(close, state).status !== 'balanced').length;
  return card(`
    <div class="guided-audit-entry">
      <div>
        <strong>Auditoría guiada</strong>
        <small>${openCount ? `${openCount} cierres por revisar` : 'Compara una cuenta con su estado de cuenta'}</small>
      </div>
      <button class="primary-button compact guided-audit-action" data-open-audit-close>Nuevo cierre</button>
    </div>
  `);
}

export function renderAuditCloseList(state) {
  const closes = state.auditClosures || [];
  if (!closes.length) return '';
  return card(`
    <div class="guided-audit-list-head"><strong>Cierres guardados</strong><small>Reabre una revisión sin modificar movimientos</small></div>
    <div class="guided-audit-close-list">
      ${closes.map(close => {
        const review = buildGuidedAuditReview(close, state);
        const status = review.status === 'balanced' ? 'Cuadrado' : 'Delta detectado: revisar';
        return `
          <button class="guided-audit-close-row" data-open-audit-close-id="${html(close.id)}">
            <span><strong>${html(close.accountName || 'Cuenta')}</strong><small>${close.cutoffDate ? formatDate(close.cutoffDate) : 'Sin fecha de corte'}</small></span>
            <span class="guided-audit-delta ${review.status === 'balanced' ? 'balanced' : 'pending'}"><strong>${status}</strong><small>${formatSignedMoney(review.delta)}</small></span>
            ${icon('chevronRight')}
          </button>
        `;
      }).join('')}
    </div>
  `);
}

export function renderAuditCloseSheet(state) {
  const draft = auditCloseDraft(state);
  const close = selectedClose(state, draft);
  const step = draft.step || 'data';
  const review = close ? buildGuidedAuditReview(close, state) : null;
  return `
    <div class="sheet-backdrop open" data-sheet-close>
      <section class="sheet wide guided-audit-sheet" onclick="event.stopPropagation()">
        <div class="sheet-head-row">
          <button class="ghost-icon" data-sheet-close aria-label="Cerrar">${icon('x')}</button>
          <h2 class="sheet-title">Cierre guiado</h2>
          ${close?.id ? `<button class="text-button" data-audit-close-delete="${html(close.id)}">Eliminar</button>` : '<span></span>'}
        </div>
        ${stepper(step)}
        ${step === 'data' ? renderDataStep(draft, state) : ''}
        ${step === 'import' ? renderImportStep(draft) : ''}
        ${step === 'mapping' ? renderMappingStep(draft) : ''}
        ${step === 'review' ? renderReviewStep(close, review) : ''}
        ${step === 'result' ? renderResultStep(close, review) : ''}
      </section>
    </div>
  `;
}

export function renderAuditCloseDeleteSheet(state) {
  const close = selectedClose(state);
  if (!close) return '';
  return `
    <div class="sheet-backdrop open" data-sheet-close>
      <section class="sheet" onclick="event.stopPropagation()">
        <div class="sheet-head-row">
          <button class="ghost-icon" data-sheet-close aria-label="Cerrar">${icon('x')}</button>
          <h2 class="sheet-title">Eliminar cierre</h2>
          <span></span>
        </div>
        <p>EliminarÃ¡s la evidencia de este cierre. Los movimientos, saldos, presupuestos y transferencias no cambiarÃ¡n.</p>
        <div class="sheet-actions">
          <button class="secondary-button" data-sheet-close>Cancelar</button>
          <button class="danger-button" data-confirm-delete-audit-close="${html(close.id)}">Eliminar cierre</button>
        </div>
      </section>
    </div>
  `;
}

function auditCloseDraft(state) {
  return {
    step: 'data',
    accountName: '',
    range: { from: '', to: '' },
    cutoffDate: '',
    realBalance: '',
    amountSchema: 'amount',
    mapping: {},
    ...(state.ui?.auditCloseDraft || {})
  };
}

function selectedClose(state, draft) {
  const id = state.ui?.auditCloseId;
  return (state.auditClosures || []).find(close => close.id === id) || null;
}

function stepper(activeStep) {
  const steps = [
    ['data', 'Datos'],
    ['import', 'Importar'],
    ['mapping', 'Mapear'],
    ['review', 'Revisar'],
    ['result', 'Resultado']
  ];
  const activeIndex = steps.findIndex(([key]) => key === activeStep);
  return `<ol class="guided-audit-steps" aria-label="Progreso del cierre">${steps.map(([key, label], index) => `
    <li class="${index <= activeIndex ? 'complete' : ''} ${key === activeStep ? 'active' : ''}"><span>${index + 1}</span>${label}</li>
  `).join('')}</ol>`;
}

function renderDataStep(draft, state) {
  const accountOptions = (state.accounts || []).map(account => ({ value: account.name, label: account.name }));
  return `
    <div class="guided-audit-intro"><strong>Define qué vas a comparar</strong><p>Este cierre es analítico: nunca crea ajustes ni altera tus movimientos.</p></div>
    <div class="guided-audit-fields">
      ${pickerButton(draft.accountName, 'Elige una cuenta', 'accountName', accountOptions)}
      <label class="field"><span>Desde</span><input class="input" type="date" value="${html(draft.range?.from || '')}" data-audit-close-field="range.from"></label>
      <label class="field"><span>Hasta</span><input class="input" type="date" value="${html(draft.range?.to || '')}" data-audit-close-field="range.to"></label>
      <label class="field"><span>Fecha de corte</span><input class="input" type="date" value="${html(draft.cutoffDate || '')}" data-audit-close-field="cutoffDate"></label>
      <label class="field"><span>Saldo real del extracto</span><input class="input" inputmode="decimal" value="${html(draft.realBalance || '')}" placeholder="0.00" data-audit-close-field="realBalance"></label>
    </div>
    <button class="primary-button guided-audit-action" data-audit-close-create>Continuar a importar</button>
  `;
}

function renderImportStep(draft) {
  const fileName = draft.fileReady ? 'Archivo listo para mapear' : 'Selecciona el CSV o XLSX de la cuenta';
  return `
    <div class="guided-audit-intro"><strong>Importa el estado de cuenta</strong><p>Solo se normalizan las filas necesarias para esta revisión; no se conserva el archivo original.</p></div>
    <label class="guided-audit-file">
      <input type="file" accept="${FILE_ACCEPT}" data-audit-close-file>
      <span class="row-icon" style="background:var(--blue-soft);color:var(--blue)">${icon('fileUp')}</span>
      <span><strong>${html(fileName)}</strong><small>CSV o Excel (.xlsx)</small></span>
      ${icon('chevronRight')}
    </label>
    <button class="primary-button guided-audit-action" data-audit-close-create>Continuar a columnas</button>
  `;
}

function renderMappingStep(draft) {
  const schema = draft.amountSchema === 'debitCredit' ? 'debitCredit' : 'amount';
  const columns = (draft.headers || []).map(column => ({ value: column, label: column }));
  return `
    <div class="guided-audit-intro"><strong>Relaciona las columnas</strong><p>Activa un solo esquema de monto. Los campos del otro esquema no se validan.</p></div>
    <div class="guided-audit-schema" role="radiogroup" aria-label="Esquema de importe">
      <button class="${schema === 'amount' ? 'active' : ''}" role="radio" aria-checked="${schema === 'amount'}" data-audit-close-map="amountSchema:amount">Fecha + Descripción + Importe</button>
      <button class="${schema === 'debitCredit' ? 'active' : ''}" role="radio" aria-checked="${schema === 'debitCredit'}" data-audit-close-map="amountSchema:debitCredit">Fecha + Descripción + Débito + Crédito</button>
    </div>
    <div class="guided-audit-fields">
      ${mappingPicker('Fecha', 'date', draft.mapping?.date, columns)}
      ${mappingPicker('Descripción', 'description', draft.mapping?.description, columns)}
      ${schema === 'amount' ? mappingPicker('Importe', 'amount', draft.mapping?.amount, columns) : ''}
      ${schema === 'debitCredit' ? mappingPicker('Débito', 'debit', draft.mapping?.debit, columns) : ''}
      ${schema === 'debitCredit' ? mappingPicker('Crédito', 'credit', draft.mapping?.credit, columns) : ''}
    </div>
    <button class="primary-button guided-audit-action" data-audit-close-create>Revisar diferencias</button>
  `;
}

function renderReviewStep(close, review) {
  if (!close || !review) return card('<strong>Falta información del cierre</strong><p class="muted">Completa los datos e importa un extracto para revisar diferencias.</p>');
  return `
    ${summary(review)}
    <div class="guided-audit-intro"><strong>Revisa antes de cerrar</strong><p>Las confirmaciones quedan como evidencia y no cambian los movimientos financieros.</p></div>
    ${exceptionGroup('Solo en la app', 'app-only', review.onlyInApp, transactionOnlyCard)}
    ${exceptionGroup('Solo en el banco', 'bank-only', review.onlyInBank, statementOnlyCard)}
    ${exceptionGroup('Advertencia de fecha', 'date-warning', review.dateWarnings, candidateCard)}
    ${exceptionGroup('Candidato lejano', 'distant-candidate', review.distantCandidates, candidateCard)}
    ${exceptionGroup('Ambiguo', 'ambiguous', review.ambiguous, ambiguousCard)}
    <button class="primary-button guided-audit-action" data-audit-close-create>Ver resultado</button>
  `;
}

function renderResultStep(close, review) {
  if (!close || !review) return '';
  const balanced = review.status === 'balanced';
  return `
    ${summary(review)}
    ${card(`
      <div class="guided-audit-result ${balanced ? 'balanced' : 'pending'}">
        <span class="row-icon">${icon(balanced ? 'check' : 'alert')}</span>
        <div><strong>${balanced ? 'Cuadrado' : 'Delta detectado: revisar'}</strong><p>${balanced ? 'No quedan diferencias pendientes.' : 'Mantén las diferencias visibles y retoma la revisión cuando tengas más evidencia.'}</p></div>
      </div>
    `)}
  `;
}

function summary(review) {
  return card(`
    <div class="guided-audit-summary">
      <div><small>Saldo registrado</small><strong>${formatSignedMoney(review.recordedBalance)}</strong></div>
      <div><small>Saldo real</small><strong>${formatSignedMoney(review.realBalance)}</strong></div>
      <div><small>Diferencia</small><strong class="guided-audit-delta ${review.status === 'balanced' ? 'balanced' : 'pending'}">${formatSignedMoney(review.delta)}</strong></div>
      <div><small>Confirmadas</small><strong>${review.confirmed.length}</strong></div>
    </div>
  `);
}

function exceptionGroup(title, className, rows, renderRow) {
  if (!rows.length) return '';
  return `
    <section class="guided-audit-group">
      <h3>${title} <small>${rows.length}</small></h3>
      ${rows.map(row => card(renderRow(row), `guided-audit-exception ${className}`)).join('')}
    </section>
  `;
}

function transactionOnlyCard(transaction) {
  return `<div class="guided-audit-row"><div><strong>${html(transaction.description || transaction.movement || 'Movimiento')}</strong><small>${valueLine(transaction.date, signedTransactionAmount(transaction))}</small></div><span class="issue-pill">Sin banco</span></div>`;
}

function statementOnlyCard(statement) {
  return `<div class="guided-audit-row"><div><strong>${html(statement.description || 'Movimiento bancario')}</strong><small>${valueLine(statement.date, statement.signedAmount)}</small></div><span class="issue-pill">Sin app</span></div>`;
}

function candidateCard(candidate) {
  return candidatePair(candidate, candidate.statementRow, candidate.transaction);
}

function ambiguousCard(group) {
  return `<div class="guided-audit-candidate"><strong>${html(group.statementRow.description || 'Movimiento bancario')}</strong><small>${valueLine(group.statementRow.date, group.statementRow.signedAmount)}</small>${group.candidates.map(candidate => candidatePair(candidate, group.statementRow, candidate.transaction)).join('')}</div>`;
}

function candidatePair(candidate, statement, transaction) {
  const id = `${statement.id}:${transaction.id}`;
  return `
    <div class="guided-audit-candidate">
      <div class="guided-audit-pair"><div><small>Banco</small><strong>${html(statement.description || 'Sin descripción')}</strong><span>${valueLine(statement.date, statement.signedAmount)}</span></div><div><small>App</small><strong>${html(transaction.description || transaction.movement || 'Sin descripción')}</strong><span>${valueLine(transaction.date, signedTransactionAmount(transaction))}</span></div></div>
      <div class="guided-audit-decisions">
        <button class="primary-button compact" data-audit-close-decision="${html(id)}:confirm">Confirmar</button>
        <button class="secondary-button compact" data-audit-close-decision="${html(id)}:dismiss">No corresponde</button>
        <button class="text-button" data-audit-close-decision="${html(id)}:pending">Dejar pendiente</button>
      </div>
    </div>
  `;
}

function mappingPicker(label, field, value, options) {
  return `<div class="field"><span>${label}</span>${pickerButton(value, `Elige ${label.toLowerCase()}`, `mapping.${field}`, options, `map:${field}`)}</div>`;
}

function pickerButton(value, placeholder, field, options) {
  return `<button class="select-button guided-audit-picker" data-audit-close-map="${html(field)}" data-audit-close-options="${html(JSON.stringify(options))}"><span>${html(value || placeholder)}</span>${icon('chevronDown')}</button>`;
}

function valueLine(date, amount) {
  return `${date ? formatDate(date) : 'Sin fecha'} · ${formatSignedMoney(amount)}`;
}

function signedTransactionAmount(transaction) {
  return transaction.movement === 'Gasto' ? -Number(transaction.amount || 0) : Number(transaction.amount || 0);
}

function formatSignedMoney(value) {
  const amount = Number(value) || 0;
  return `${amount < 0 ? '-' : ''}${formatMoney(Math.abs(amount))}`;
}
