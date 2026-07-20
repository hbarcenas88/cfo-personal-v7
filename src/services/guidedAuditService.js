import { canon, parseAmount, parseDate } from '../utils/format.js';

export const DATE_WARNING_DAYS = 2;
export const AMOUNT_EPSILON = 0.005;

export function normalizeStatementRows(objects = [], mapping = {}) {
  return objects.map((row, index) => ({
    id: `statement-${row.__row || index + 2}`,
    sourceRow: row.__row || index + 2,
    date: parseDate(row[mapping.date]),
    signedAmount: statementSignedAmount(row, mapping),
    description: String(row[mapping.description] || '').trim()
  })).filter(row => row.date && Number.isFinite(row.signedAmount));
}

export function statementFingerprint(rows = []) {
  return rows.map(row => `${row.date}|${row.signedAmount.toFixed(2)}|${canon(row.description)}`)
    .sort().join('\n');
}

export function accountBalanceAtCutoff(state, accountName, cutoffDate) {
  const cutoff = parseDate(cutoffDate);
  return (state.transactions || []).reduce((sum, transaction) => {
    const date = parseDate(transaction.date);
    if (transaction.account !== accountName || !date || date > cutoff) return sum;
    return sum + signedTransactionAmount(transaction);
  }, 0);
}

export function matchStatementToTransactions(statementRows = [], transactions = []) {
  const matches = emptyMatches();
  const matchableTransactions = transactions.filter(transaction => transaction.affectsBalance !== false);
  const available = new Set(matchableTransactions.map(transaction => transaction.id));
  const ambiguousTransactionIds = new Set();
  const orderedRows = [...statementRows].sort(compareStatementRows);

  orderedRows.forEach(statementRow => {
    const candidates = matchableTransactions
      .filter(transaction => available.has(transaction.id) && amountsMatch(statementRow.signedAmount, signedTransactionAmount(transaction)))
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
    if (best.dayDifference === 0) matches.exact.push(best);
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
  const matches = matchStatementToTransactions(statementRows, transactions);
  const decisions = appliedDecisions(close.decisions, statementRows, transactions);
  const confirmed = decisions.filter(match => isConfirmation(match.decision));
  const decidedStatementIds = new Set(decisions.map(match => match.statementRow.id));
  const decidedTransactionIds = new Set(decisions.map(match => match.transaction.id));
  const review = {
    recordedBalance: accountBalanceAtCutoff(state, close.accountName, cutoffDate),
    realBalance: Number(close.realBalance) || 0,
    exact: withoutDecisions(matches.exact, decidedStatementIds, decidedTransactionIds),
    dateWarnings: withoutDecisions(matches.dateWarning, decidedStatementIds, decidedTransactionIds),
    distantCandidates: withoutDecisions(matches.distantCandidate, decidedStatementIds, decidedTransactionIds),
    onlyInApp: matches.onlyInApp.filter(transaction => !decidedTransactionIds.has(transaction.id)),
    onlyInBank: matches.onlyInBank.filter(statementRow => !decidedStatementIds.has(statementRow.id)),
    ambiguous: withoutDecisions(matches.ambiguous, decidedStatementIds, decidedTransactionIds),
    confirmed
  };
  review.delta = review.realBalance - review.recordedBalance;
  review.status = reviewIsBalanced(review) ? 'balanced' : 'needsReview';
  return review;
}

function statementSignedAmount(row, mapping) {
  if (mapping.amount) return parseAmount(row[mapping.amount]);
  const debit = parseAmount(row[mapping.debit]);
  const credit = parseAmount(row[mapping.credit]);
  if (!Number.isFinite(debit) && !Number.isFinite(credit)) return NaN;
  return (Number.isFinite(credit) ? Math.abs(credit) : 0) - (Number.isFinite(debit) ? Math.abs(debit) : 0);
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
  return decisions.reduce((matches, decision) => {
    if (!isConfirmation(decision) && !isDismissal(decision)) return matches;
    const statementRow = statementRows.find(row => row.id === decision.statementRowId);
    const transaction = transactions.find(row => row.id === decision.transactionId);
    if (!statementRow || !transaction || !amountsMatch(statementRow.signedAmount, signedTransactionAmount(transaction))) return matches;
    if (matches.some(match => match.statementRow.id === statementRow.id || match.transaction.id === transaction.id)) return matches;
    matches.push({ statement: statementRow, statementRow, transaction, decision });
    return matches;
  }, []);
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

function withoutDecisions(items, statementIds, transactionIds) {
  return items.filter(item => {
    const statementRow = item.statementRow || item;
    if (statementIds.has(statementRow.id)) return false;
    if (item.transaction && transactionIds.has(item.transaction.id)) return false;
    return !item.candidates?.some(candidate => transactionIds.has(candidate.transaction.id));
  });
}

function reviewIsBalanced(review) {
  return Math.abs(review.delta) < AMOUNT_EPSILON
    && !review.dateWarnings.length
    && !review.distantCandidates.length
    && !review.onlyInApp.length
    && !review.onlyInBank.length
    && !review.ambiguous.length;
}
