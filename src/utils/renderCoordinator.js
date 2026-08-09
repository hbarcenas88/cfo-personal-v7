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

export function captureInteractionState(root) {
  if (!root) return { focus: null, scroll: [] };
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

  return { focus, scroll };
}

export function restoreInteractionState(snapshot, root) {
  if (!snapshot || !root) return;

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
  if (element.id) candidates.push(`#${escapeSelector(element.id)}`);
  const interactionKey = element.getAttribute?.('data-interaction-key');
  if (interactionKey) candidates.push(attributeSelector('data-interaction-key', interactionKey));
  ['data-record-field', 'data-audit-close-field', 'data-category-draft-field', 'data-account-draft-field']
    .forEach(attribute => {
      const value = element.getAttribute?.(attribute);
      if (value) candidates.push(attributeSelector(attribute, value));
    });
  const name = element.getAttribute?.('name');
  if (name) candidates.push(`${element.localName || '*'}${attributeSelector('name', name)}`);
  if (element.classList?.contains('period-sheet-content')) candidates.push('.period-sheet-content');
  if (element.classList?.contains('sheet')) candidates.push('.sheet');

  return candidates.find(selector => uniquelyIdentifies(selector, element, root)) || '';
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
  return String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}
