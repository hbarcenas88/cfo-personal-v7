import { canon, parseAmount, parseDate } from '../utils/format.js';

export const DATE_WARNING_DAYS = 2;
export const AMOUNT_EPSILON = 0.005;

export function normalizeStatementRows(objects = [], mapping = {}) {
  return objects.map((row, index) => normalizeStatementRow(row, index, mapping)).filter(Boolean);
}

export function validateStatementRows(objects = [], mapping = {}) {
  const normalizedRows = normalizeStatementRows(objects, mapping);
  const hasInvalidRow = objects.some((row, index) => hasStatementContent(row) && !normalizeStatementRow(row, index, mapping));
  if (hasInvalidRow) return { ok: false, message: 'Hay filas inválidas en el extracto. Revisa fecha e importe antes de continuar.' };
  if (!normalizedRows.length) return { ok: false, message: 'El extracto no contiene filas utilizables.' };
  return { ok: true, message: '' };
}

export function statementFingerprint(rows = []) {
  return rows.map(row => `${row.date}|${row.signedAmount.toFixed(2)}|${canon(row.description)}`)
    .sort().join('\n');
}

export function validateRowsAgainstRange(rows = [], range = {}) {
  const from = parseDate(range.from);
  const to = parseDate(range.to);
  const outsideRange = rows.some(row => row.date < from || row.date > to);
  return outsideRange
    ? { ok: false, message: 'El extracto contiene filas fuera del rango seleccionado.' }
    : { ok: true, message: '' };
}

export function applyAuditCloseDecision(close = {}, decision = {}) {
  const decisions = Array.isArray(close.decisions) ? close.decisions : [];
  if (!isConfirmation(decision) && !isDismissal(decision) && !isPending(decision)) {
    throw new Error('La decisión del cierre no es válida.');
  }
  const existingIndex = decisions.findIndex(item => decisionEdge(item) === decisionEdge(decision));
  if (existingIndex >= 0) {
    if (isPending(decisions[existingIndex])) {
      if (isConfirmation(decision)) {
        const reserved = decisions.filter(isConfirmation);
        if (reserved.some(item =>
          item.statementRowId === decision.statementRowId
          || item.transactionId === decision.transactionId
        )) {
          throw new Error('Esta fila o movimiento ya tiene una decisión confirmada.');
        }
      }
      return {
        ...close,
        decisions: decisions.map((item, index) => index === existingIndex ? { ...decision } : item)
      };
    }
    throw new Error('Esta relación ya tiene una decisión.');
  }
  const reserved = decisions.filter(isConfirmation);
  if (reserved.some(item =>
    item.statementRowId === decision.statementRowId
    || item.transactionId === decision.transactionId
  )) {
    throw new Error('Esta fila o movimiento ya tiene una decisión confirmada.');
  }
  return { ...close, decisions: [...decisions, { ...decision }] };
}

export function accountBalanceAtCutoff(state, accountName, cutoffDate) {
  const cutoff = parseDate(cutoffDate);
  return (state.transactions || []).reduce((sum, transaction) => {
    const date = parseDate(transaction.date);
    if (transaction.account !== accountName || !date || date > cutoff) return sum;
    return sum + signedTransactionAmount(transaction);
  }, 0);
}

export function matchStatementToTransactions(statementRows = [], transactions = [], options = {}) {
  const matches = emptyMatches();
  const matchableTransactions = transactions.filter(transaction => transaction.affectsBalance !== false);
  const available = new Set(matchableTransactions.map(transaction => transaction.id));
  const excludedEdges = new Set(options.excludedEdges || []);
  const ambiguousTransactionIds = new Set();
  const orderedRows = [...statementRows].sort(compareStatementRows);

  orderedRows.forEach(statementRow => {
    const candidates = matchableTransactions
      .filter(transaction =>
        available.has(transaction.id)
        && !excludedEdges.has(decisionEdge({
          statementRowId: statementRow.id,
          transactionId: transaction.id
        }))
        && amountsMatch(statementRow.signedAmount, signedTransactionAmount(transaction))
      )
      .map(transaction => candidateFor(statementRow, transaction))
      .sort(compareCandidates);

    if (!candidates.length) {
      matches.onlyInBank.push(statementRow);
      return;
    }

    const best = candidates[0];
    const equallyRanked = candidates.filter(candidate => candidate.dayDifference === best.dayDifference
      && candidate.tokenOverlap === best.tokenOverlap);
    if (equallyRanked.length > 1) {
      equallyRanked.forEach(candidate => ambiguousTransactionIds.add(candidate.transaction.id));
      matches.ambiguous.push({
        statement: statementRow,
        statementRow,
        candidates: equallyRanked
      });
      return;
    }

    available.delete(best.transaction.id);
    if (best.dayDifference === 0 && best.tokenOverlap > 0) matches.exact.push(best);
    else if (best.dayDifference === 0) matches.descriptionWarning.push(best);
    else if (best.dayDifference <= DATE_WARNING_DAYS) matches.dateWarning.push(best);
    else matches.distantCandidate.push(best);
  });

  matches.onlyInApp = matchableTransactions.filter(transaction => available.has(transaction.id)
    && !ambiguousTransactionIds.has(transaction.id));
  return matches;
}

export function buildGuidedAuditReview(close = {}, state = {}) {
  const range = close.range || {};
  const cutoffDate = parseDate(close.cutoffDate);
  const transactions = (state.transactions || []).filter(transaction => {
    const date = parseDate(transaction.date);
    return transaction.account === close.accountName
      && transaction.affectsBalance !== false
      && date
      && date <= cutoffDate
      && (!range.from || date >= parseDate(range.from))
      && (!range.to || date <= parseDate(range.to));
  });
  const statementRows = close.statementRows || [];
  const decisions = appliedDecisions(close.decisions, statementRows, transactions);
  const confirmedStatementIds = new Set(decisions.confirmed.map(match => match.statementRow.id));
  const confirmedTransactionIds = new Set(decisions.confirmed.map(match => match.transaction.id));
  const matches = matchStatementToTransactions(
    statementRows.filter(row => !confirmedStatementIds.has(row.id)),
    transactions.filter(transaction => !confirmedTransactionIds.has(transaction.id)),
    { excludedEdges: decisions.dismissed.map(match => decisionEdge(match.decision)) }
  );
  const review = {
    recordedBalance: accountBalanceAtCutoff(state, close.accountName, cutoffDate),
    realBalance: Number(close.realBalance) || 0,
    exact: matches.exact,
    dateWarnings: matches.dateWarning,
    descriptionWarnings: matches.descriptionWarning,
    distantCandidates: matches.distantCandidate,
    onlyInApp: matches.onlyInApp,
    onlyInBank: matches.onlyInBank,
    ambiguous: matches.ambiguous,
    confirmed: decisions.confirmed,
    pending: decisions.pending
  };
  review.delta = review.realBalance - review.recordedBalance;
  review.status = reviewIsBalanced(review) ? 'balanced' : 'needsReview';
  return review;
}

function statementSignedAmount(row, mapping) {
  if (mapping.amount) return parseAmount(statementValue(row, mapping.amount));
  const debit = parseAmount(statementValue(row, mapping.debit));
  const credit = parseAmount(statementValue(row, mapping.credit));
  if (!Number.isFinite(debit) && !Number.isFinite(credit)) return NaN;
  return (Number.isFinite(credit) ? Math.abs(credit) : 0) - (Number.isFinite(debit) ? Math.abs(debit) : 0);
}

function normalizeStatementRow(row, index, mapping) {
  const date = parseDate(statementValue(row, mapping.date));
  const signedAmount = statementSignedAmount(row, mapping);
  if (!date || !Number.isFinite(signedAmount)) return null;
  return {
    id: `statement-${row.__row || index + 2}`,
    sourceRow: row.__row || index + 2,
    date,
    signedAmount,
    description: String(statementValue(row, mapping.description) || '').trim()
  };
}

function hasStatementContent(row = {}) {
  return Object.entries(row).some(([key, value]) => key !== '__row' && String(value ?? '').trim());
}

function statementValue(row, key) {
  return row[key] ?? row[canon(key)];
}

function signedTransactionAmount(transaction) {
  if (transaction.affectsBalance === false) return 0;
  return transaction.movement === 'Gasto'
    ? -Number(transaction.amount || 0)
    : Number(transaction.amount || 0);
}

function emptyMatches() {
  return {
    exact: [],
    dateWarning: [],
    descriptionWarning: [],
    distantCandidate: [],
    ambiguous: [],
    onlyInApp: [],
    onlyInBank: []
  };
}

function candidateFor(statementRow, transaction) {
  return {
    statement: statementRow,
    statementRow,
    transaction,
    dayDifference: daysBetween(statementRow.date, transaction.date),
    tokenOverlap: tokenOverlap(statementRow.description, transaction.description)
  };
}

function compareCandidates(a, b) {
  return a.dayDifference - b.dayDifference
    || b.tokenOverlap - a.tokenOverlap
    || compareLexically(a.transaction.id, b.transaction.id);
}

function compareStatementRows(a, b) {
  return compareLexically(a.date, b.date)
    || compareLexically(canon(a.description), canon(b.description))
    || compareLexically(a.id, b.id);
}

function amountsMatch(a, b) {
  return Math.abs(Number(a) - Number(b)) < AMOUNT_EPSILON;
}

function daysBetween(a, b) {
  return Math.abs(dateOrdinal(a) - dateOrdinal(b));
}

function dateOrdinal(value) {
  const [year, month, day] = parseDate(value).split('-').map(Number);
  return Date.UTC(year, month - 1, day) / 86400000;
}

function compareLexically(a, b) {
  const left = String(a);
  const right = String(b);
  if (left === right) return 0;
  return left < right ? -1 : 1;
}

function tokenOverlap(a, b) {
  const left = new Set(canon(a).split(' ').filter(Boolean));
  const right = new Set(canon(b).split(' ').filter(Boolean));
  let overlap = 0;
  left.forEach(token => {
    if (right.has(token)) overlap += 1;
  });
  return overlap;
}

function appliedDecisions(decisions = [], statementRows, transactions) {
  const resolve = decision => {
    const statementRow = statementRows.find(row => row.id === decision.statementRowId);
    const transaction = transactions.find(row => row.id === decision.transactionId);
    if (!statementRow || !transaction || !amountsMatch(statementRow.signedAmount, signedTransactionAmount(transaction))) return null;
    return { statement: statementRow, statementRow, transaction, decision };
  };
  const confirmed = decisions.filter(isConfirmation).reduce((matches, decision) => {
    const match = resolve(decision);
    if (!match) return matches;
    if (matches.some(item =>
      item.statementRow.id === match.statementRow.id
      || item.transaction.id === match.transaction.id
    )) return matches;
    matches.push(match);
    return matches;
  }, []);
  const dismissed = decisions.filter(isDismissal).map(resolve).filter(Boolean);
  const pending = decisions.filter(isPending).map(resolve).filter(Boolean);
  return { confirmed, dismissed, pending };
}

function isConfirmation(decision = {}) {
  return decision.confirmed === true
    || decision.status === 'confirmed'
    || decision.type === 'confirmed'
    || decision.action === 'confirm';
}

function isDismissal(decision = {}) {
  return decision.status === 'dismissed'
    || decision.type === 'dismissed'
    || decision.action === 'dismiss';
}

function isPending(decision = {}) {
  return decision.status === 'pending'
    || decision.type === 'pending'
    || decision.action === 'pending';
}

function decisionEdge(decision = {}) {
  return `${decision.statementRowId || ''}\u0000${decision.transactionId || ''}`;
}

function reviewIsBalanced(review) {
  return Math.abs(review.delta) < AMOUNT_EPSILON
    && !review.exact.length
    && !review.dateWarnings.length
    && !review.descriptionWarnings.length
    && !review.distantCandidates.length
    && !review.onlyInApp.length
    && !review.onlyInBank.length
    && !review.ambiguous.length
    && !review.pending.length;
}
