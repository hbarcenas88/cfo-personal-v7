import { icon } from '../icons.js';

export function renderOnboarding() {
  return `
    <div class="welcome-hero">
      <div class="card welcome-card">
        <span class="welcome-badge">${icon('walletCards')}</span>
        <h1 class="welcome-title">Bienvenido a CFO Personal</h1>
        <p class="welcome-text">Arranca limpio: crea tus catálogos o importa CSV para construir tu dashboard. Tus datos viven localmente en este dispositivo.</p>
        <div class="tour-list">
          ${tour('walletCards', 'Balances claros', 'Balance total, disponible, cuentas y provisiones.')}
          ${tour('barChart', 'Resumen financiero', 'Ingresos, gastos, presupuesto y gráficos rápidos.')}
          ${tour('grid', 'Presupuesto por categoría', 'Explora consumo, exceso y margen disponible.')}
          ${tour('listChecks', 'Auditoría móvil', 'Movimientos en tarjetas, filtros y acciones rápidas.')}
        </div>
      </div>
      <button class="primary-button" data-onboarding-action="import">Importar datos</button>
      <button class="secondary-button" data-onboarding-action="manual">Crear manualmente</button>
      <button class="secondary-button" data-onboarding-action="skip">Explorar vacía</button>
    </div>
  `;
}

function tour(iconName, title, text) {
  return `<div class="tour-item"><span class="row-icon" style="background:var(--blue-soft);color:var(--blue)">${icon(iconName)}</span><span><strong>${title}</strong><small>${text}</small></span></div>`;
}
