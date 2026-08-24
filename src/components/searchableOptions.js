import { canon, html } from '../utils/format.js';
import { icon } from '../icons.js';

export function filterSearchableOptions(options, query) {
  const needle = canon(query);
  return (options || []).filter(option => !needle || canon(option.label || option.value).includes(needle));
}

export function renderSearchActivator(active, {
  query = '',
  label = 'Buscar opciones',
  controls = ''
} = {}) {
  const controlsAttribute = controls ? ` aria-controls="${html(controls)}"` : '';
  return active
    ? `<input class="input" data-option-search data-interaction-key="option-search" placeholder="Buscar o escribir" inputmode="search" aria-label="${html(label)}"${controlsAttribute} value="${html(query)}">`
    : `<button type="button" class="option-search-trigger" data-option-search-open aria-label="${html(label)}"${controlsAttribute}>Buscar o escribir</button>`;
}

export function renderSearchableOptionRows(options, selectedValues = []) {
  return (options || []).map(option => `
    <button type="button" class="option-row ${selectedValues.includes(option.value) ? 'selected' : ''}" data-option-value="${html(option.value)}" aria-pressed="${selectedValues.includes(option.value)}">
      <span>${html(option.label || option.value)}</span>
      ${selectedValues.includes(option.value) ? `<span data-option-selected-indicator aria-hidden="true">${icon('check')}</span>` : ''}
    </button>
  `).join('') || '<div class="empty-state" data-option-empty>Sin opciones</div>';
}

export function setSearchableOptionSelected(button, selected) {
  if (!button) return false;
  button.classList?.toggle('selected', Boolean(selected));
  button.setAttribute?.('aria-pressed', String(Boolean(selected)));
  const indicator = button.querySelector?.('[data-option-selected-indicator]');
  if (selected && !indicator) {
    button.insertAdjacentHTML?.('beforeend', `<span data-option-selected-indicator aria-hidden="true">${icon('check')}</span>`);
  } else if (!selected) {
    indicator?.remove?.();
  }
  return Boolean(selected);
}
