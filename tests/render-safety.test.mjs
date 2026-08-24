import assert from 'node:assert/strict';
import * as ui from '../src/components/ui.js';
import { icon } from '../src/icons.js';
import * as format from '../src/utils/format.js';

const { emptyState, iconBubble, metricCard, trailingIcon } = ui;
const { safeColor } = format;

assert.equal(typeof safeColor, 'function',
  'the shared render boundary needs a color validator before interpolating inline styles');
assert.equal(typeof trailingIcon, 'function',
  'shared rows need a stable trailing-icon rendering primitive');

{
  const closeIcon = icon('x');

  assert.match(closeIcon, /<svg[^>]*\bwidth="20"/,
    'removing the explicit default SVG width must break the icon geometry contract');
  assert.match(closeIcon, /<svg[^>]*\bheight="20"/,
    'removing the explicit default SVG height must break the icon geometry contract');
}

{
  assert.equal(safeColor('#0A8FE8'), '#0A8FE8');
  assert.equal(safeColor('#abc'), '#abc');
  assert.equal(safeColor('var(--green)'), 'var(--green)');
  assert.equal(
    safeColor('red; background-image:url(https://attacker.invalid/pixel)'),
    'var(--blue)',
    'accepting an arbitrary inline color must break the render-safety contract'
  );
  assert.equal(
    safeColor('url(javascript:alert(1))', '#DC3F61'),
    '#DC3F61',
    'an invalid color must resolve to the caller-provided safe fallback'
  );
}

{
  const persistedText = 'Casa "A" <img src=x onerror=alert(1)> A&B';
  const emptyMarkup = emptyState('folder', persistedText, persistedText);
  const metricMarkup = metricCard({
    title: persistedText,
    value: persistedText,
    note: persistedText,
    iconName: 'wallet',
    color: 'red; background:url(https://attacker.invalid/pixel)'
  });

  for (const markup of [emptyMarkup, metricMarkup]) {
    assert.ok(markup.includes('Casa &quot;A&quot; &lt;img src=x onerror=alert(1)&gt; A&amp;B'),
      'persisted text must render literally at the shared component boundary');
    assert.doesNotMatch(markup, /<img\b/,
      'persisted markup must not create an unexpected HTML node');
  }
  assert.doesNotMatch(metricMarkup, /attacker\.invalid/,
    'an invalid color must not survive in metric markup or its SVG');
}

{
  const bubble = iconBubble('wallet', 'color:red;position:fixed');
  assert.match(bubble, /--icon-bg:var\(--blue-soft\);--icon-fg:var\(--blue\);/,
    'icon bubbles must use safe colors at the inline-style boundary');

  const trailing = trailingIcon('chevronRight');
  assert.match(trailing, /class="trailing-icon"/,
    'rows need a stable trailing-icon wrapper instead of a loose intrinsic SVG');
  assert.match(trailing, /<svg[^>]*\bwidth="20"[^>]*\bheight="20"/,
    'the trailing icon must retain explicit 20px SVG geometry');
}

console.log('render-safety.test.mjs passed');
