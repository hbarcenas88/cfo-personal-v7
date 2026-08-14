import { icon } from '../icons.js';
import { MONTHS, formatDate, todayISO } from '../utils/format.js';

export function renderCalendarSheet({ selectedDate = todayISO(), visibleMonth = selectedDate.slice(0, 7), title = 'Selecciona fecha', context = 'period' } = {}) {
  const [year, month] = visibleMonth.split('-').map(Number);
  const days = calendarDays(year, month - 1);
  const grid = renderCalendarGrid(days, selectedDate, month);
  const navigation = renderMonthNavigation(year, month);
  const confirm = '<button class="primary-button" data-cal-confirm>Listo</button>';
  const content = context === 'record'
    ? `${grid}${navigation}${renderQuickActions({ includeCustom: false })}${confirm}`
    : `${renderQuickActions({ includeCustom: true })}${navigation}${grid}${renderSelectedCard(selectedDate)}${confirm}`;
  return `
    <div class="sheet-backdrop open" data-sheet-close>
      <section class="sheet wide${context === 'record' ? ' record-calendar-sheet' : ''}" onclick="event.stopPropagation()">
        <div class="sheet-handle"></div>
        <h2 class="sheet-title">${title}</h2>
        ${content}
      </section>
    </div>
  `;
}

function renderCalendarGrid(days, selectedDate, month) {
  return `
    <div class="calendar-grid">
      ${['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(day => `<span class="dow">${day}</span>`).join('')}
      ${days.map(day => dayButton(day, selectedDate, month)).join('')}
    </div>
  `;
}

function renderMonthNavigation(year, month) {
  return `
    <div class="period-pill center-picker-pill">
      <button data-cal-nav="-1" aria-label="Mes anterior">${icon('chevronLeft')}</button>
      <button class="period-value" disabled>${MONTHS[month - 1]} ${year}</button>
      <button data-cal-nav="1" aria-label="Mes siguiente">${icon('chevronRight')}</button>
    </div>
  `;
}

function renderQuickActions({ includeCustom }) {
  return `
    <div class="quick-grid">
      ${quick('today', 'Hoy')}
      ${quick('yesterday', 'Ayer')}
      ${quick('monthStart', 'Inicio de mes')}
      ${includeCustom ? quick('custom', 'Personalizado') : ''}
    </div>
  `;
}

function renderSelectedCard(selectedDate) {
  return `
    <div class="card calendar-selected-card">
      <div class="metric-title">Fecha seleccionada</div>
      <div class="metric-value metric-value-sm">${formatDate(selectedDate, true)}</div>
    </div>
  `;
}

function quick(value, label) {
  return `<button data-cal-quick="${value}">${label}</button>`;
}

function dayButton(day, selected, currentMonth) {
  const isSelected = day.iso === selected;
  const isToday = day.iso === todayISO();
  const classes = [
    day.month !== currentMonth ? 'outside' : '',
    isSelected ? 'selected' : '',
    isToday ? 'today' : ''
  ].filter(Boolean).join(' ');
  return `<button class="${classes}" data-cal-date="${day.iso}" aria-pressed="${isSelected}" aria-label="${calendarAriaLabel(day.iso)}"${isToday ? ' aria-current="date"' : ''}>${day.day}</button>`;
}

function calendarAriaLabel(iso) {
  const [year, month, day] = iso.split('-').map(Number);
  return `${day} de ${MONTHS[month - 1].toLowerCase()} de ${year}`;
}

function calendarDays(year, month) {
  const first = new Date(year, month, 1);
  const startOffset = (first.getDay() + 6) % 7;
  const start = new Date(year, month, 1 - startOffset);
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return {
      iso: date.toISOString().slice(0, 10),
      day: date.getDate(),
      month: date.getMonth() + 1
    };
  });
}

export function shiftMonth(month, delta) {
  const [year, m] = month.split('-').map(Number);
  const date = new Date(year, m - 1 + delta, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}
