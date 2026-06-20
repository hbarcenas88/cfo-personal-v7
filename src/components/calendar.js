import { icon } from '../icons.js';
import { MONTHS, formatDate, todayISO } from '../utils/format.js';

export function renderCalendarSheet({ selectedDate = todayISO(), visibleMonth = selectedDate.slice(0, 7), title = 'Selecciona fecha' } = {}) {
  const [year, month] = visibleMonth.split('-').map(Number);
  const days = calendarDays(year, month - 1);
  return `
    <div class="sheet-backdrop open" data-sheet-close>
      <section class="sheet wide" onclick="event.stopPropagation()">
        <div class="sheet-handle"></div>
        <h2 class="sheet-title">${title}</h2>
        <div class="quick-grid">
          ${quick('today', 'Hoy')}
          ${quick('yesterday', 'Ayer')}
          ${quick('monthStart', 'Inicio de mes')}
          ${quick('custom', 'Personalizado')}
        </div>
        <div class="period-pill center-picker-pill">
          <button data-cal-nav="-1">${icon('chevronLeft')}</button>
          <button class="period-value" disabled>${MONTHS[month - 1]} ${year}</button>
          <button data-cal-nav="1">${icon('chevronRight')}</button>
        </div>
        <div class="calendar-grid">
          ${['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(d => `<span class="dow">${d}</span>`).join('')}
          ${days.map(day => dayButton(day, selectedDate, month)).join('')}
        </div>
        <div class="card calendar-selected-card">
          <div class="metric-title">Fecha seleccionada</div>
          <div class="metric-value metric-value-sm">${formatDate(selectedDate, true)}</div>
        </div>
        <button class="primary-button" data-cal-confirm>Listo</button>
      </section>
    </div>
  `;
}

function quick(value, label) {
  return `<button data-cal-quick="${value}">${label}</button>`;
}

function dayButton(day, selected, currentMonth) {
  const classes = [
    day.month !== currentMonth ? 'outside' : '',
    day.iso === selected ? 'selected' : '',
    day.iso === todayISO() ? 'today' : ''
  ].filter(Boolean).join(' ');
  return `<button class="${classes}" data-cal-date="${day.iso}">${day.day}</button>`;
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
