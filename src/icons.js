const baseAttrs = 'viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"';

export const ICONS = {
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  chevronRight: '<path d="m9 18 6-6-6-6"/>',
  chevronLeft: '<path d="m15 18-6-6 6-6"/>',
  chevronUp: '<path d="m18 15-6-6-6 6"/>',
  chevronDown: '<path d="m6 9 6 6 6-6"/>',
  backspace: '<path d="M21 4H8l-6 8 6 8h13Z"/><path d="m12 9 6 6M18 9l-6 6"/>',
  home: '<path d="m3 11 9-8 9 8"/><path d="M5 10v10h14V10"/><path d="M9 20v-6h6v6"/>',
  wallet: '<path d="M3 7a2 2 0 0 1 2-2h14v14H5a2 2 0 0 1-2-2Z"/><path d="M3 7c0 1.1.9 2 2 2h14"/><path d="M15 13h2"/>',
  walletCards: '<rect x="3" y="6" width="18" height="14" rx="2"/><path d="M3 10h18"/><path d="M7 15h5"/>',
  landmark: '<path d="m3 10 9-6 9 6"/><path d="M4 10h16M6 10v8M10 10v8M14 10v8M18 10v8M4 18h16M3 21h18"/>',
  building: '<path d="M4 21V5a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v16"/><path d="M9 21v-5h3v5M8 7h1M12 7h1M8 11h1M12 11h1M17 9h2a1 1 0 0 1 1 1v11"/>',
  creditCard: '<rect x="3" y="5" width="18" height="14" rx="3"/><path d="M3 10h18M7 15h4"/>',
  banknote: '<rect x="3" y="6" width="18" height="12" rx="2"/><circle cx="12" cy="12" r="2"/><path d="M6 12h.01M18 12h.01"/>',
  coins: '<circle cx="8" cy="8" r="4"/><path d="M12 8c0 2.2-1.8 4-4 4"/><path d="M16 10c2.2.5 4 1.9 4 4s-2.7 4-6 4-6-1.8-6-4c0-.6.2-1.2.6-1.7"/>',
  badgeDollar: '<path d="M12 2 9.7 4.3 6.5 4.1 6.3 7.3 4 9.6 6.3 12 6.5 15.2l3.2-.2L12 17.3l2.3-2.3 3.2.2.2-3.2L20 9.6l-2.3-2.3-.2-3.2-3.2.2Z"/><path d="M12 7v5M10.5 9h2.2a1.4 1.4 0 1 1 0 2.8h-1.4a1.4 1.4 0 1 0 0 2.8H14"/>',
  piggyBank: '<path d="M19 10h2v4h-2"/><path d="M16 9.5V7a3 3 0 0 0-3-3H8v3"/><path d="M7 14H4a2 2 0 0 1 0-4h2"/><path d="M7 10a5 5 0 0 1 5-5h2a5 5 0 0 1 5 5v3a5 5 0 0 1-5 5H9l-2 3v-3a5 5 0 0 1-5-5"/><path d="M13 10h.01"/>',
  vault: '<rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="12" cy="12" r="3"/><path d="M12 9v6M9 12h6"/>',
  safe: '<rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="12" cy="12" r="2.8"/><path d="M12 9v6M9 12h6M7 8h.01M17 16h.01"/>',
  calculator: '<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M8 6h8M8 10h.01M12 10h.01M16 10h.01M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01M16 18h.01"/>',
  percentCircle: '<circle cx="12" cy="12" r="10"/><path d="m15 9-6 6M9 9h.01M15 15h.01"/>',
  currencyDollar: '<circle cx="12" cy="12" r="9"/><path d="M12 7v10M9.5 9h3.4a1.8 1.8 0 1 1 0 3.6h-1.8a1.8 1.8 0 1 0 0 3.6H15"/>',
  currencyEuro: '<circle cx="12" cy="12" r="9"/><path d="M16 8.5A4.5 4.5 0 1 0 16 15.5M7 10h7M7 14h7"/>',
  currencyPound: '<circle cx="12" cy="12" r="9"/><path d="M15 8.5a2.5 2.5 0 0 0-5 0V17M8.5 12H14M9 17h7"/>',
  currencyYen: '<circle cx="12" cy="12" r="9"/><path d="m8 7 4 5 4-5M12 12v5M9 13h6M9 16h6"/>',
  receipt: '<path d="M4 2v20l3-2 3 2 3-2 3 2 4-2V2l-4 2-3-2-3 2-3-2Z"/><path d="M8 7h8M8 11h8M8 15h5"/>',
  fileUp: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6M12 18v-6M9 15l3-3 3 3"/>',
  fileDown: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6M12 12v6M9 15l3 3 3-3"/>',
  download: '<path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/>',
  upload: '<path d="M12 21V9"/><path d="m7 14 5-5 5 5"/><path d="M5 3h14"/>',
  database: '<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5"/><path d="M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6"/>',
  chart: '<path d="M3 3v18h18"/><path d="m7 14 4-4 3 3 5-7"/>',
  barChart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  pie: '<path d="M21 12a9 9 0 1 1-9-9v9Z"/><path d="M12 3a9 9 0 0 1 9 9h-9Z"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  listChecks: '<path d="m3 6 2 2 4-4M3 12l2 2 4-4M3 18l2 2 4-4M13 6h8M13 12h8M13 18h8"/>',
  calendar: '<path d="M8 2v4M16 2v4"/><rect x="3" y="4" width="18" height="18" rx="3"/><path d="M3 10h18"/>',
  calendarClock: '<path d="M8 2v4M16 2v4"/><rect x="3" y="4" width="18" height="18" rx="3"/><path d="M3 10h18"/><path d="M12 15v3l2 1"/>',
  arrowUpRight: '<path d="M7 17 17 7M8 7h9v9"/>',
  arrowDownRight: '<path d="M7 7 17 17M17 8v9H8"/>',
  repeat: '<path d="m17 2 4 4-4 4"/><path d="M3 11V9a3 3 0 0 1 3-3h15"/><path d="m7 22-4-4 4-4"/><path d="M21 13v2a3 3 0 0 1-3 3H3"/>',
  link: '<path d="M10 13a5 5 0 0 0 7.1 0l2-2a5 5 0 0 0-7.1-7.1l-1 1"/><path d="M14 11a5 5 0 0 0-7.1 0l-2 2A5 5 0 1 0 12 20l1-1"/>',
  cart: '<circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2 3h3l3 13h10l3-9H6"/>',
  bag: '<path d="M6 7h12l-1 14H7Z"/><path d="M9 7a3 3 0 0 1 6 0"/>',
  store: '<path d="M4 10h16l-1-6H5Z"/><path d="M5 10v10h14V10"/><path d="M9 20v-6h6v6"/>',
  house: '<path d="m3 11 9-8 9 8"/><path d="M5 10v10h14V10"/>',
  car: '<path d="M5 16h14l-1.5-5h-11Z"/><path d="M7 16v2M17 16v2"/><circle cx="7" cy="18" r="1"/><circle cx="17" cy="18" r="1"/>',
  bus: '<path d="M6 3h12a2 2 0 0 1 2 2v11a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V5a2 2 0 0 1 2-2Z"/><path d="M4 10h16M8 19l-2 3M16 19l2 3"/><circle cx="8" cy="15" r="1"/><circle cx="16" cy="15" r="1"/>',
  plane: '<path d="M17.8 19 12 13.2 6.2 19l1.4-7L2 8l7.3-.7L12 2l2.7 5.3L22 8l-5.6 4Z"/>',
  fuel: '<path d="M4 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18"/><path d="M4 12h12M16 7h2l2 2v9a2 2 0 0 0 2 2"/><path d="M8 6h4"/>',
  utensils: '<path d="M4 2v9M7 2v9M4 6h3M10 2v20M15 2v8a4 4 0 0 0 4 4v8"/>',
  coffee: '<path d="M4 8h12v6a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4Z"/><path d="M16 10h2a2 2 0 0 1 0 4h-2"/><path d="M6 2v2M10 2v2M14 2v2"/>',
  salad: '<path d="M5 11h14a7 7 0 0 1-14 0Z"/><path d="M8 8c1-3 3-4 6-4"/><path d="M12 8c-1-3-3-4-6-4"/>',
  heartPulse: '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8Z"/><path d="M3 12h4l2-3 3 6 2-3h7"/>',
  stethoscope: '<path d="M6 3v5a4 4 0 0 0 8 0V3"/><path d="M10 12v3a4 4 0 0 0 8 0v-1"/><circle cx="18" cy="13" r="2"/>',
  pill: '<path d="M10 21 21 10a5 5 0 0 0-7-7L3 14a5 5 0 0 0 7 7Z"/><path d="m7 10 7 7"/>',
  dumbbell: '<path d="M6 6v12M18 6v12M3 10v4M21 10v4M6 12h12"/>',
  graduation: '<path d="m22 10-10-5-10 5 10 5 10-5Z"/><path d="M6 12v5c3 2 9 2 12 0v-5"/>',
  book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5Z"/>',
  briefcase: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18"/>',
  laptop: '<path d="M4 5h16v11H4Z"/><path d="M2 20h20"/>',
  phone: '<rect x="7" y="2" width="10" height="20" rx="2"/><path d="M12 18h.01"/>',
  wifi: '<path d="M5 12.5a10 10 0 0 1 14 0M8.5 16a5 5 0 0 1 7 0M12 20h.01"/>',
  lightbulb: '<path d="M9 18h6M10 22h4M8 14a6 6 0 1 1 8 0c-1 1-1 2-1 4H9c0-2 0-3-1-4Z"/>',
  droplets: '<path d="M7 16a4 4 0 0 1 8 0 4 4 0 0 1-8 0Z"/><path d="M12 2S5 9 5 14a7 7 0 0 0 14 0C19 9 12 2 12 2Z"/>',
  shirt: '<path d="M20 8 16 4l-4 2-4-2-4 4 3 3v9h10v-9Z"/>',
  scissors: '<circle cx="6" cy="7" r="3"/><circle cx="6" cy="17" r="3"/><path d="M8.5 8.5 21 21M8.5 15.5 21 3"/>',
  gift: '<rect x="3" y="8" width="18" height="13" rx="2"/><path d="M12 8v13M3 12h18"/><path d="M12 8H8a2 2 0 1 1 2-2c0 2 2 2 2 2Zm0 0h4a2 2 0 1 0-2-2c0 2-2 2-2 2Z"/>',
  film: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M7 5v14M17 5v14M3 9h4M17 9h4M3 15h4M17 15h4"/>',
  gamepad: '<path d="M6 12h4M8 10v4M15 13h.01M18 11h.01"/><path d="M7 7h10a5 5 0 0 1 4 8l-1 2a3 3 0 0 1-5-1l-.5-1h-5l-.5 1a3 3 0 0 1-5 1l-1-2a5 5 0 0 1 4-8Z"/>',
  music: '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
  folder: '<path d="M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/>',
  tags: '<path d="m20 13-7 7-10-10V3h7Z"/><path d="M7.5 7.5h.01"/><path d="m14 4 7 7"/>',
  shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-5"/>',
  umbrella: '<path d="M22 12a10 10 0 0 0-20 0Z"/><path d="M12 12v7a3 3 0 0 0 6 0"/>',
  handCoins: '<path d="M10 13h4a2 2 0 0 0 0-4h-3l-2 2"/><path d="M3 14h3l4 4h8l3-3"/><path d="M18 9a3 3 0 1 0-6 0"/>',
  handshake: '<path d="m11 17 2 2a3 3 0 0 0 4.2 0l3.8-3.8a3 3 0 0 0 0-4.2L17 7"/><path d="m7 7-4 4a3 3 0 0 0 0 4.2L7 19a3 3 0 0 0 4.2 0l.8-.8"/><path d="m8 13 3-3 2 2 3-3"/>',
  scanLine: '<path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2M7 12h10"/>',
  handHeart: '<path d="M10 14h4a2 2 0 0 0 0-4h-3l-2 2"/><path d="M3 14h3l4 4h8l3-3"/><path d="M16 4.5a2.5 2.5 0 0 0-4 3L16 11l4-3.5a2.5 2.5 0 0 0-4-3Z"/>',
  gem: '<path d="M6 3h12l4 6-10 12L2 9Z"/><path d="M2 9h20M12 21 8 9l4-6 4 6Z"/>',
  sparkles: '<path d="M12 3 9.5 8.5 4 11l5.5 2.5L12 19l2.5-5.5L20 11l-5.5-2.5Z"/><path d="M4 4v4M2 6h4M20 18v4M18 20h4"/>',
  smile: '<circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01"/>',
  ticket: '<path d="M3 9a3 3 0 1 0 0 6v3h18v-3a3 3 0 1 0 0-6V6H3Z"/><path d="M13 6v12"/>',
  package: '<path d="m7.5 4.3 9 5.2M21 8l-9 5-9-5M3 8v8l9 5 9-5V8L12 3Z"/><path d="M12 13v8"/>',
  train: '<rect x="5" y="3" width="14" height="13" rx="2"/><path d="M8 16l-2 5M16 16l2 5M8 21h8M8 7h8M8 11h.01M16 11h.01"/>',
  church: '<path d="M12 2v6M9 5h6M5 22V10l7-4 7 4v12M9 22v-7h6v7"/>',
  scale: '<path d="m16 16 3-8 3 8c-.9 1-2 1.5-3 1.5S16.9 17 16 16ZM2 16l3-8 3 8c-.9 1-2 1.5-3 1.5S2.9 17 2 16ZM7 8h10M12 3v19"/>',
  trash: '<path d="M3 6h18M8 6V4h8v2M6 6l1 15h10l1-15M10 11v6M14 11v6"/>',
  edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z"/>',
  copy: '<rect x="8" y="8" width="13" height="13" rx="2"/><path d="M4 16V5a2 2 0 0 1 2-2h11"/>',
  more: '<circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>',
  alert: '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4M12 17h.01"/>',
  info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>',
  backup: '<path d="M12 3v12"/><path d="m8 11 4 4 4-4"/><path d="M5 19a4 4 0 0 1 .9-7.9 6 6 0 0 1 11.7 1.7A3 3 0 0 1 17 19Z"/>',
  settings: '<path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"/><path d="M19.4 15a1.8 1.8 0 0 0 .4 2l.1.1a2.1 2.1 0 1 1-3 3l-.1-.1a1.8 1.8 0 0 0-2-.4 1.8 1.8 0 0 0-1 1.6V21a2.1 2.1 0 1 1-4.2 0v-.2a1.8 1.8 0 0 0-1-1.6 1.8 1.8 0 0 0-2 .4l-.1.1a2.1 2.1 0 1 1-3-3l.1-.1a1.8 1.8 0 0 0 .4-2 1.8 1.8 0 0 0-1.6-1H3a2.1 2.1 0 1 1 0-4.2h.2a1.8 1.8 0 0 0 1.6-1 1.8 1.8 0 0 0-.4-2l-.1-.1a2.1 2.1 0 1 1 3-3l.1.1a1.8 1.8 0 0 0 2 .4 1.8 1.8 0 0 0 1-1.6V3a2.1 2.1 0 1 1 4.2 0v.2a1.8 1.8 0 0 0 1 1.6 1.8 1.8 0 0 0 2-.4l.1-.1a2.1 2.1 0 1 1 3 3l-.1.1a1.8 1.8 0 0 0-.4 2 1.8 1.8 0 0 0 1.6 1h.2a2.1 2.1 0 1 1 0 4.2h-.2a1.8 1.8 0 0 0-1.6 1Z"/>'
};

export const ICON_CATALOG = [
  'landmark', 'building', 'wallet', 'walletCards', 'creditCard', 'banknote', 'coins', 'badgeDollar', 'piggyBank', 'vault',
  'safe', 'calculator', 'percentCircle', 'currencyDollar', 'currencyEuro', 'currencyPound', 'currencyYen', 'handshake', 'scanLine',
  'receipt', 'cart', 'bag', 'store', 'house', 'car', 'bus', 'plane', 'fuel', 'utensils',
  'coffee', 'salad', 'heartPulse', 'stethoscope', 'pill', 'dumbbell', 'graduation', 'book', 'briefcase', 'laptop',
  'phone', 'wifi', 'lightbulb', 'droplets', 'shirt', 'scissors', 'gift', 'film', 'gamepad', 'music',
  'folder', 'tags', 'chart', 'pie', 'barChart', 'shield', 'umbrella', 'calendarClock', 'handCoins', 'handHeart',
  'gem', 'sparkles', 'smile', 'ticket', 'package', 'train', 'church', 'scale'
];

export const COLOR_CATALOG = [
  '#0A8FE8', '#07966F', '#DC3F61', '#7C5CFF', '#C68000', '#00A6C8',
  '#E0569B', '#64748B', '#2563EB', '#0F766E', '#16A34A', '#65A30D',
  '#CA8A04', '#EA580C', '#DC2626', '#BE123C', '#C026D3', '#7C3AED',
  '#4F46E5', '#0369A1', '#475569', '#334155', '#7C2D12', '#6B7280',
  '#EF4444', '#F43F5E', '#EC4899', '#D946EF', '#A855F7', '#8B5CF6',
  '#6366F1', '#3B82F6', '#06B6D4', '#14B8A6', '#10B981', '#22C55E',
  '#84CC16', '#EAB308', '#F59E0B', '#F97316', '#0EA5E9', '#0891B2',
  '#0D9488', '#059669', '#047857', '#155E75', '#1E40AF', '#312E81'
];

export function icon(name = 'folder', attrs = '') {
  const path = ICONS[name] || ICONS.folder;
  return `<svg ${baseAttrs} ${attrs}>${path}</svg>`;
}

export function renderIcons(root = document) {
  root.querySelectorAll('[data-icon]').forEach(el => {
    const name = el.getAttribute('data-icon') || 'folder';
    el.innerHTML = icon(name);
  });
}

export function inferIcon(name = '', type = 'category') {
  const text = String(name).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const rules = [
    [/tarjeta|credito|tc/, 'creditCard'],
    [/ahorro|reserva/, 'piggyBank'],
    [/banco|cuenta/, 'landmark'],
    [/casa|hogar|renta|alquiler/, 'house'],
    [/comida|aliment|restaurante|super/, 'utensils'],
    [/compras|market/, 'cart'],
    [/auto|carro|vehiculo|gasolina|combustible/, 'car'],
    [/viaje|vuelo|turismo/, 'plane'],
    [/salud|medic|doctor/, 'heartPulse'],
    [/educ|coleg|univers|libro/, 'graduation'],
    [/internet|wifi/, 'wifi'],
    [/telefono|celular/, 'phone'],
    [/luz|electric/, 'lightbulb'],
    [/agua/, 'droplets'],
    [/ropa|vestido/, 'shirt'],
    [/regalo/, 'gift'],
    [/entreten|cine|netflix/, 'film'],
    [/inversion|rendimiento/, 'chart'],
    [/seguro|provision|emergencia/, 'shield'],
    [/salario|ingreso|cobro/, 'badgeDollar']
  ];
  const match = rules.find(([regex]) => regex.test(text));
  if (match) return match[1];
  if (type === 'account') return 'landmark';
  if (type === 'provision') return 'shield';
  if (type === 'recurring') return 'calendarClock';
  return 'folder';
}
