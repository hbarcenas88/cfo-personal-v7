import { canon, html } from '../utils/format.js';

export function filterSearchableOptions(options, query) {
  const needle = canon(query);
  return (options || []).filter(option => !needle || canon(option.label || option.value).includes(needle));
}

export function renderSearchActivator(active) {
  return active
    ? '<input class="input" data-option-search placeholder="Buscar o escribir" inputmode="search">'
    : '<button type="button" class="option-search-trigger" data-option-search-open>Buscar o escribir</button>';
}

export function renderSearchableOptionRows(options, selectedValues = []) {
  return (options || []).map(option => `
    <button class="option-row ${selectedValues.includes(option.value) ? 'selected' : ''}" data-option-value="${html(option.value)}">
      <span>${html(option.label || option.value)}</span>
    </button>
  `).join('') || '<div class="empty-state" data-option-empty>Sin opciones</div>';
}
