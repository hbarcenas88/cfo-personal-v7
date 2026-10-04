export function createRenderCoordinator({ schedule = queueMicrotask, render }) {
  const pendingScopes = new Set();
  let updateScheduled = false;

  return function requestRender(scopes = 'all') {
    const requestedScopes = Array.isArray(scopes) ? scopes : [scopes];
    requestedScopes.forEach(scope => pendingScopes.add(scope));
    if (updateScheduled) return;

    updateScheduled = true;
    schedule(() => {
      updateScheduled = false;
      const scopesToRender = [...pendingScopes];
      pendingScopes.clear();
      render(scopesToRender);
    });
  };
}

export function captureInteractionState(root, identity = '') {
  if (!root) return { identity: String(identity || ''), focus: null, scroll: [] };
  const activeElement = root.ownerDocument?.activeElement;
  const focus = activeElement && root.contains(activeElement)
    ? captureFocus(activeElement, root)
    : null;
  const scroll = [root, ...root.querySelectorAll('*')]
    .filter(element => element.scrollTop || element.scrollLeft)
    .map(element => ({
      selector: selectorFor(element, root),
      top: element.scrollTop,
      left: element.scrollLeft
    }))
    .filter(entry => entry.selector);

  return { identity: String(identity || ''), focus, scroll };
}

export function restoreInteractionState(snapshot, root, identity = '') {
  if (!snapshot || !root || snapshot.identity !== String(identity || '')) return false;

  const focusTarget = findSnapshotTarget(snapshot.focus, root);
  if (focusTarget?.focus) {
    try {
      focusTarget.focus({ preventScroll: true });
    } catch {
      focusTarget.focus();
    }
    if (snapshot.focus.selection && typeof focusTarget.setSelectionRange === 'function') {
      try {
        focusTarget.setSelectionRange(...snapshot.focus.selection);
      } catch {
        // Some input types expose selection properties but reject setSelectionRange.
      }
    }
  }

  snapshot.scroll?.forEach(entry => {
    const target = findSnapshotTarget(entry, root);
    if (!target) return;
    target.scrollTop = entry.top;
    target.scrollLeft = entry.left;
  });
  return true;
}

export function bindOverlayDismissal(root, { onDismiss } = {}) {
  if (!root || typeof onDismiss !== 'function') return () => {};
  const ownerDocument = root.ownerDocument || globalThis.document;
  const closeTargets = [...root.querySelectorAll('[data-sheet-close]')];
  const onClick = event => {
    const control = String(event.currentTarget?.tagName || '').toUpperCase() === 'BUTTON';
    const outside = event.currentTarget === event.target;
    if (!control && !outside) return;
    onDismiss(control ? 'control' : 'outside', event);
  };
  const onKeydown = event => {
    if (event.key !== 'Escape' || event.defaultPrevented) return;
    event.preventDefault?.();
    onDismiss('escape', event);
  };

  closeTargets.forEach(target => target.addEventListener('click', onClick));
  ownerDocument?.addEventListener?.('keydown', onKeydown);

  return () => {
    closeTargets.forEach(target => target.removeEventListener?.('click', onClick));
    ownerDocument?.removeEventListener?.('keydown', onKeydown);
  };
}

export function focusInitialOverlay(root) {
  if (!root) return null;
  const target = [
    '[data-overlay-initial-focus]',
    '.sheet-title',
    'input:not([type="hidden"]):not([disabled])',
    'button:not([disabled])'
  ].map(selector => root.querySelector(selector)).find(Boolean);
  if (!target?.focus) return null;
  if (target.classList?.contains('sheet-title') && !target.hasAttribute?.('tabindex')) {
    target.setAttribute?.('tabindex', '-1');
  }
  try {
    target.focus({ preventScroll: true });
  } catch {
    target.focus();
  }
  return target;
}

export function restoreFocus(target) {
  if (!target?.focus || target.isConnected === false) return false;
  try {
    target.focus({ preventScroll: true });
  } catch {
    target.focus();
  }
  return true;
}

export function captureFocusReference(element, roots = []) {
  if (!element) return null;
  for (const root of roots) {
    if (!root?.id || !root.contains?.(element)) continue;
    const focus = captureFocus(element, root);
    if (focus) return { rootId: root.id, focus };
  }
  return null;
}

export function restoreFocusReference(reference, ownerDocument = globalThis.document) {
  if (!reference?.rootId || !reference.focus) return false;
  const root = ownerDocument?.getElementById?.(reference.rootId);
  if (!root) return false;
  return restoreFocus(findSnapshotTarget(reference.focus, root));
}

function captureFocus(element, root) {
  const selector = selectorFor(element, root);
  if (!selector) return null;
  const selection = Number.isInteger(element.selectionStart) && Number.isInteger(element.selectionEnd)
    ? [element.selectionStart, element.selectionEnd, element.selectionDirection || 'none']
    : null;
  return { selector, selection };
}

function findSnapshotTarget(entry, root) {
  if (!entry?.selector) return null;
  if (entry.selector === ':root') return root;
  try {
    return root.querySelector(entry.selector);
  } catch {
    return null;
  }
}

function selectorFor(element, root) {
  if (element === root) return ':root';

  const candidates = [];
  const preferredAttributes = [
    'data-interaction-key',
    'data-record-field',
    'data-category-draft-field',
    'data-account-draft-field'
  ];
  if (element.id) candidates.push(`#${escapeSelector(element.id)}`);
  preferredAttributes.forEach(attribute => {
    const value = element.getAttribute?.(attribute);
    if (value) candidates.push(attributeSelector(attribute, value));
  });
  const name = element.getAttribute?.('name');
  if (name) candidates.push(`${element.localName || '*'}${attributeSelector('name', name)}`);
  [
    'data-tool',
    'data-action',
    'data-settings',
    'data-planning-focus',
    'data-period-date',
    'data-open-option',
    'data-account-actions',
    'data-account-action',
    'data-category-actions',
    'data-category-action',
    'data-record-calendar'
  ]
    .forEach(attribute => {
      const value = element.getAttribute?.(attribute);
      if (value) candidates.push(attributeSelector(attribute, value));
    });
  candidates.push(...interactiveAttributeSelectors(element, preferredAttributes));
  if (element.classList?.contains('period-sheet-content')) candidates.push('.period-sheet-content');
  if (element.classList?.contains('sheet')) candidates.push('.sheet');

  return candidates.find(selector => uniquelyIdentifies(selector, element, root)) || '';
}

function interactiveAttributeSelectors(element, excludedAttributes = []) {
  const localName = String(element.localName || '').toLowerCase();
  if (!['button', 'a', 'input', 'select', 'textarea'].includes(localName)) return [];

  const excluded = new Set([...excludedAttributes, 'name']);
  const selectors = elementAttributes(element)
    .filter(({ name, value }) => name.startsWith('data-')
      && !excluded.has(name)
      && hasIdentityValue(value))
    .map(({ name, value }) => `${localName}${attributeSelector(name, value)}`);
  const accessibleName = element.getAttribute?.('aria-label');
  if (hasIdentityValue(accessibleName)) {
    selectors.push(`${localName}${attributeSelector('aria-label', accessibleName)}`);
  }
  return selectors;
}

function elementAttributes(element) {
  if (!element?.attributes) return [];
  if (typeof element.attributes[Symbol.iterator] === 'function') {
    return [...element.attributes].map(attribute => ({
      name: String(attribute.name || ''),
      value: String(attribute.value ?? '')
    }));
  }
  return Object.entries(element.attributes).map(([name, value]) => ({ name, value: String(value ?? '') }));
}

function hasIdentityValue(value) {
  const normalized = String(value ?? '').trim().toLowerCase();
  return Boolean(normalized && normalized !== 'true' && normalized !== 'false');
}

function attributeSelector(attribute, value) {
  return `[${attribute}="${escapeAttribute(value)}"]`;
}

function uniquelyIdentifies(selector, element, root) {
  try {
    const matches = root.querySelectorAll(selector);
    return matches.length === 1 && matches[0] === element;
  } catch {
    return false;
  }
}

function escapeSelector(value) {
  if (globalThis.CSS?.escape) return globalThis.CSS.escape(value);
  return String(value).replace(/[^a-zA-Z0-9_-]/g, character => `\\${character}`);
}

function escapeAttribute(value) {
  return String(value)
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/[\0-\x1f\x7f]/g, character => character === '\0'
      ? '\ufffd'
      : `\\${character.codePointAt(0).toString(16)} `);
}
