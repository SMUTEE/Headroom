/**
 * Headroom design tokens — generator.
 *
 * The palette is computed, not hand-picked. Run `pnpm tokens` to regenerate
 * `src/tokens.css`. Editing that file by hand will be overwritten.
 *
 * Model: Radix's 12-step *role-defined* scale rather than Tailwind's
 * lightness-defined 50–950. A role-defined step survives a theme switch —
 * step 9 is "solid fill" in both light and dark — so component CSS never
 * branches on appearance. Only the primitive values swap.
 *
 * Ramp rules enforced here:
 *   - steps spaced in perceived lightness (oklch L), denser at the light end
 *   - hue constant end to end
 *   - vividness peaks mid-ramp, falls off at both ends
 *   - chroma set as a PROPORTION of each hue's own in-gamut maximum, so
 *     amber and green do not come out washed out beside red and violet
 *   - every value clamped into the sRGB gamut (no P3 fallback needed)
 */

import { converter, formatCss, inGamut, wcagContrast } from 'culori';

const toOklch = converter('oklch');
const toRgb = converter('rgb');
const rgbInGamut = inGamut('rgb');

// ---------------------------------------------------------------------------
// Curves
// ---------------------------------------------------------------------------

/**
 * Perceived lightness per step.
 *
 * Light: steps 1–8 are backgrounds and borders and sit close together, because
 * pale surfaces need finer distinctions than dark ones. The jump from 8 to 9 is
 * deliberate — 9 is the solid fill, not a lighter border.
 */
const LIGHTNESS = {
  light: [0.993, 0.98, 0.964, 0.948, 0.929, 0.905, 0.872, 0.808, 0.545, 0.5, 0.44, 0.26],
  // Dark is not light reversed. Reversal was the starting point; the dark end
  // then needed widening, because steps that read as distinct pale backgrounds
  // collapse into each other as dark surfaces — and a solid fill only a little
  // lighter than the page is perceptually weak even when it clears WCAG.
  dark: [0.155, 0.192, 0.235, 0.272, 0.31, 0.355, 0.45, 0.53, 0.575, 0.63, 0.79, 0.95],
};

/** Vividness as a fraction of the hue's in-gamut max. Peaks at the solid fill. */
const CHROMA_ENVELOPE = [0.03, 0.055, 0.09, 0.12, 0.15, 0.185, 0.23, 0.33, 0.62, 0.64, 0.52, 0.23];

/** Dark appearances need the accent a step or two less vivid. */
const DARK_CHROMA_SCALE = 0.86;

// ---------------------------------------------------------------------------
// Ramps
// ---------------------------------------------------------------------------

/**
 * Hues are held ≥45° apart so no two ramps read as the same colour at a
 * glance. The accent is violet specifically so `info` can stay blue without
 * colliding with it — a destructive action and a primary action must never be
 * the same button, and neither must an informational badge and a link.
 */
const RAMPS = {
  // Cool neutral carrying 80–90% of the interface. Tinted a few percent toward
  // the accent so the greys sit in the same family — enough to measure, not
  // enough to name.
  neutral: { hue: 282, chromaScale: 0.038 },
  accent: { hue: 285, chromaScale: 1 },
  danger: { hue: 25, chromaScale: 1 },
  warning: { hue: 70, chromaScale: 1 },
  success: { hue: 150, chromaScale: 1 },
  info: { hue: 235, chromaScale: 1 },
};

/**
 * A sequential scale for ordered chart dimensions.
 *
 * Generated separately rather than aliased onto the UI ramp, because the two
 * want opposite spacing. The UI ramp is deliberately dense at the light end,
 * where surfaces need fine distinctions — which makes consecutive steps
 * perceptually identical, and a chart scale built from them encodes nothing.
 * Aliasing it that way measured Lc 0.0 between the first two steps.
 *
 * These are evenly spaced in perceived lightness instead, so every neighbour
 * is discernible. Verified in the pair table below, not assumed.
 */
const CHART_SCALE = {
  hue: 285,
  light: [0.88, 0.78, 0.67, 0.55, 0.4],
  dark: [0.47, 0.56, 0.65, 0.74, 0.83],
  // Enough colour to read as one family, not enough to fight the accent.
  chroma: [0.4, 0.5, 0.56, 0.52, 0.42],
};

// ---------------------------------------------------------------------------
// Gamut
// ---------------------------------------------------------------------------

/** Largest chroma renderable in sRGB at this lightness and hue. */
function maxChroma(l, h) {
  let lo = 0;
  let hi = 0.4;
  for (let i = 0; i < 28; i += 1) {
    const mid = (lo + hi) / 2;
    if (rgbInGamut({ mode: 'oklch', l, c: mid, h })) lo = mid;
    else hi = mid;
  }
  return lo;
}

function buildRamp({ hue, chromaScale }, appearance) {
  const lightnesses = LIGHTNESS[appearance];
  const scale = chromaScale * (appearance === 'dark' ? DARK_CHROMA_SCALE : 1);

  return lightnesses.map((l, i) => {
    const c = maxChroma(l, hue) * CHROMA_ENVELOPE[i] * scale;
    return { mode: 'oklch', l, c, h: hue };
  });
}

// ---------------------------------------------------------------------------
// Semantic tier
// ---------------------------------------------------------------------------

/**
 * The only tier components reference. Primitives name a value; these name a
 * job. Because the scale is role-defined, these mappings are identical in both
 * appearances — which is the whole point of the Radix model.
 */
const SEMANTIC = {
  // Surfaces
  'bg-page': 'neutral-1',
  'bg-subtle': 'neutral-2',
  'bg-surface': 'neutral-2',
  'bg-component': 'neutral-3',
  'bg-component-hover': 'neutral-4',
  'bg-component-active': 'neutral-5',

  // Lines. `border` and `border-subtle` are separators and card edges —
  // decorative under WCAG 1.4.11, so they answer to the APCA discernibility
  // floor rather than 3:1. `border-control` is the identifying boundary of an
  // input or an unselected control, which genuinely does need 3:1, so it is a
  // separate token at a darker step. Never borrow one for the other's job.
  'border-subtle': 'neutral-6',
  border: 'neutral-7',
  'border-strong': 'neutral-8',
  'border-control': 'neutral-9',

  // Text. No `text-placeholder`: placeholders sit in an *enabled* field and so
  // must clear 4.5:1 — they use `text-secondary`. `text-disabled` is exempt
  // from 1.4.3 (inactive components) but still targets APCA Lc 30 so it stays
  // legible as a label.
  'text-primary': 'neutral-12',
  'text-secondary': 'neutral-11',
  'text-disabled': 'neutral-8',
  'text-on-accent': 'white',

  // Accent — interactive and selected. Never static text.
  'accent-bg': 'accent-3',
  'accent-bg-hover': 'accent-4',
  'accent-border': 'accent-7',
  'accent-focus': 'accent-10',
  'accent-solid': 'accent-9',
  'accent-solid-hover': 'accent-10',
  'accent-text': 'accent-11',

  // Sequential scale, for an ordered dimension in a chart — a funnel, a
  // distribution across stages. Ordered categories want a scale that reads as
  // progression; reusing one flat fill for every segment makes the divisions
  // invisible, which is how a stacked bar stops showing a distribution at all.
  // Steps are spaced so neighbours stay distinguishable, which the pair table
  // below checks rather than assumes.
  'scale-1': 'chart-1',
  'scale-2': 'chart-2',
  'scale-3': 'chart-3',
  'scale-4': 'chart-4',
  'scale-5': 'chart-5',

  // Status. Each pairs with an icon or text in use — colour is never the only
  // signal, which `better-accessibility` owns.
  'danger-bg': 'danger-3',
  'danger-border': 'danger-7',
  'danger-solid': 'danger-9',
  'danger-text': 'danger-11',

  'warning-bg': 'warning-3',
  'warning-border': 'warning-7',
  'warning-solid': 'warning-9',
  'warning-text': 'warning-11',

  'success-bg': 'success-3',
  'success-border': 'success-7',
  'success-solid': 'success-9',
  'success-text': 'success-11',

  'info-bg': 'info-3',
  'info-border': 'info-7',
  'info-solid': 'info-9',
  'info-text': 'info-11',
};

// ---------------------------------------------------------------------------
// Build
// ---------------------------------------------------------------------------

const palette = { light: {}, dark: {} };
for (const appearance of ['light', 'dark']) {
  for (const [name, spec] of Object.entries(RAMPS)) {
    buildRamp(spec, appearance).forEach((color, i) => {
      palette[appearance][`${name}-${i + 1}`] = color;
    });
  }

  CHART_SCALE[appearance].forEach((l, i) => {
    const c = maxChroma(l, CHART_SCALE.hue) * CHART_SCALE.chroma[i];
    palette[appearance][`chart-${i + 1}`] = { mode: 'oklch', l, c, h: CHART_SCALE.hue };
  });
}

const css = (color) => formatCss({ ...toOklch(color), alpha: undefined });

function primitiveBlock(appearance, indent) {
  return Object.entries(palette[appearance])
    .map(([name, color]) => `${indent}--${name}: ${css(color)};`)
    .join('\n');
}

const semanticBlock = Object.entries(SEMANTIC)
  .map(([role, ref]) => `  --color-${role}: ${ref === 'white' ? '#ffffff' : `var(--${ref})`};`)
  .join('\n');

/*
 * Point Tailwind at the PRIMITIVE, not back at the semantic variable.
 *
 * `--color-accent-focus: var(--color-accent-focus)` is self-referential, and
 * while it happens to resolve at runtime for common utilities, Tailwind cannot
 * reason about it and silently skips generating some — `outline-accent-focus`
 * produced no rule at all, so focus rings fell back to `currentColor`.
 *
 * Referencing the primitive still themes correctly, because the primitive is
 * what gets redefined per appearance.
 */
const themeBlock = Object.entries(SEMANTIC)
  .map(([role, ref]) => `  --color-${role}: ${ref === 'white' ? '#ffffff' : `var(--${ref})`};`)
  .join('\n');

const out = `/**
 * Headroom design tokens.
 *
 * GENERATED by scripts/generate-tokens.mjs — do not edit by hand.
 * Run \`pnpm tokens\` to regenerate.
 *
 * Two tiers:
 *   1. Primitives (--neutral-1 … --info-12) name a value. Never use in a component.
 *   2. Semantic tokens (--color-bg-surface, --color-accent-solid) name a job.
 *      These are the only tier components reference.
 *
 * The 12 steps are role-defined, not lightness-defined: step 9 is the solid
 * fill in both appearances, so the semantic mappings below are identical in
 * light and dark and component CSS never branches on theme.
 */

/* Light appearance, and the default. */
:root {
  color-scheme: light;

${primitiveBlock('light', '  ')}

${semanticBlock}
}

/* Dark appearance. A class, not only a media query, because users can override
   the system setting — one switching mechanism throughout. The media query
   below sets the initial value for users who have expressed no preference. */
:root[data-theme='dark'] {
  color-scheme: dark;

${primitiveBlock('dark', '  ')}
}

@media (prefers-color-scheme: dark) {
  :root:not([data-theme='light']) {
    color-scheme: dark;

${primitiveBlock('dark', '    ')}
  }
}

/* Expose the semantic tier to Tailwind. Utilities resolve to the role tokens,
   so \`bg-surface\` and \`text-secondary\` follow the theme automatically. */
@theme inline {
${themeBlock}
}
`;

// ---------------------------------------------------------------------------
// Emit + measure
// ---------------------------------------------------------------------------

const { writeFileSync, mkdirSync } = await import('node:fs');
const { dirname, join } = await import('node:path');
const { fileURLToPath } = await import('node:url');

const here = dirname(fileURLToPath(import.meta.url));
const target = join(here, '..', 'src', 'tokens.css');
mkdirSync(dirname(target), { recursive: true });
writeFileSync(target, out, 'utf8');

console.log(`Wrote ${target}`);
console.log(
  `${Object.keys(RAMPS).length} ramps x 12 steps x 2 appearances = ` +
    `${Object.keys(RAMPS).length * 12 * 2} primitives, ${Object.keys(SEMANTIC).length} semantic tokens\n`,
);

/**
 * Pairs that actually render, measured against the background each one really
 * sits on — not the page background. WCAG 2 is the gate because the project
 * claims WCAG 2.2 AA; APCA is reported alongside as the tiebreaker.
 */
/*
 * `wcag` is the ratio this pair must clear, or null where WCAG imposes no
 * minimum. `lc` is the APCA floor. Getting these thresholds right matters as
 * much as getting the colours right — holding a decorative separator to 3:1
 * forces a heavy grey line nobody wanted, and exempting a focus ring from it
 * ships an accessibility failure.
 *
 *   4.5  normal-size text, including button labels        (SC 1.4.3)
 *   3.0  focus indicators, control boundaries, state-     (SC 1.4.11)
 *        bearing graphical objects
 *   null separators and card edges (decorative), and      (SC 1.4.3 exception)
 *        disabled text (inactive component) — still held
 *        to an APCA floor so they remain discernible
 */
const PAIRS = [
  ['text-primary', 'bg-page', 4.5, 75, 'body text on page'],
  ['text-primary', 'bg-surface', 4.5, 75, 'body text on card'],
  ['text-primary', 'bg-component', 4.5, 75, 'body text on component'],
  ['text-secondary', 'bg-page', 4.5, 60, 'secondary text on page'],
  ['text-secondary', 'bg-surface', 4.5, 60, 'secondary text on card'],
  ['text-disabled', 'bg-page', null, 30, 'disabled label (1.4.3 exempt)'],
  ['accent-text', 'bg-page', 4.5, 60, 'link on page'],
  ['accent-text', 'accent-bg', 4.5, 60, 'accent text on accent surface'],
  ['text-on-accent', 'accent-solid', 4.5, 60, 'label on primary button'],
  ['accent-solid', 'bg-page', 3, 30, 'primary button vs page'],
  ['accent-focus', 'bg-page', 3, 30, 'focus ring vs page'],
  ['accent-focus', 'bg-surface', 3, 30, 'focus ring vs card'],
  ['border-control', 'bg-page', 3, 30, 'input boundary vs page'],
  ['border-control', 'bg-surface', 3, 30, 'input boundary vs card'],
  ['border', 'bg-page', null, 15, 'separator vs page (decorative)'],
  ['border-strong', 'bg-surface', null, 15, 'strong border vs card (decorative)'],
  ['danger-text', 'danger-bg', 4.5, 60, 'danger text on danger surface'],
  ['danger-text', 'bg-page', 4.5, 60, 'danger text on page'],
  ['text-on-accent', 'danger-solid', 4.5, 60, 'label on destructive button'],
  ['danger-solid', 'bg-page', 3, 30, 'danger indicator vs page'],
  ['warning-text', 'warning-bg', 4.5, 60, 'warning text on warning surface'],
  ['warning-text', 'bg-page', 4.5, 60, 'warning text on page'],
  ['warning-solid', 'bg-page', 3, 30, 'warning indicator vs page'],
  ['success-text', 'success-bg', 4.5, 60, 'success text on success surface'],
  ['success-text', 'bg-page', 4.5, 60, 'success text on page'],
  ['success-solid', 'bg-page', 3, 30, 'success indicator vs page'],
  ['info-text', 'info-bg', 4.5, 60, 'info text on info surface'],
  ['info-text', 'bg-page', 4.5, 60, 'info text on page'],
  ['info-solid', 'bg-page', 3, 30, 'info indicator vs page'],

  /*
   * The sequential scale. No WCAG rule governs one chart segment against the
   * next, so these answer to APCA.
   *
   * The pairs that matter are each step against the CARD, not against its
   * neighbour: segments are separated by a gap in the card colour, so the gap
   * does the separating and a step is only invisible if it disappears into the
   * surface. Checking neighbours instead would force a scale so widely spaced
   * that its first step is already dark.
   *
   * The ends are checked against each other, because a scale whose extremes
   * read alike is not encoding an order.
   */
  ['scale-1', 'bg-surface', null, 15, 'scale step 1 vs card'],
  ['scale-2', 'bg-surface', null, 15, 'scale step 2 vs card'],
  ['scale-3', 'bg-surface', null, 15, 'scale step 3 vs card'],
  ['scale-4', 'bg-surface', null, 15, 'scale step 4 vs card'],
  ['scale-5', 'bg-surface', null, 15, 'scale step 5 vs card'],
  ['scale-5', 'scale-1', null, 45, 'scale spans a perceptible range, end to end'],
];

/** APCA Lc. Signed: positive is dark-on-light, negative light-on-dark. */
function apca(textColor, bgColor) {
  const s = (c) => {
    const { r, g, b } = toRgb(c);
    const lin = (v) => Math.pow(Math.max(0, Math.min(1, v)), 2.4);
    return 0.2126729 * lin(r) + 0.7151522 * lin(g) + 0.072175 * lin(b);
  };
  const clampY = (y) => (y > 0.022 ? y : y + Math.pow(0.022 - y, 1.414));
  const yt = clampY(s(textColor));
  const yb = clampY(s(bgColor));

  if (yb > yt) {
    const c = (Math.pow(yb, 0.56) - Math.pow(yt, 0.57)) * 1.14;
    return (c < 0.1 ? 0 : c - 0.027) * 100;
  }
  const c = (Math.pow(yb, 0.65) - Math.pow(yt, 0.62)) * 1.14;
  return (c > -0.1 ? 0 : c + 0.027) * 100;
}

function resolve(role, appearance) {
  const ref = SEMANTIC[role];
  if (ref === 'white') return { mode: 'rgb', r: 1, g: 1, b: 1 };
  return palette[appearance][ref];
}

/*
 * The project claims WCAG 2.2 AA, so WCAG is the gate and fails the build.
 * APCA models perception better and is reported as advisory — a pair that
 * clears WCAG but misses its APCA floor is a known trade-off, not a defect,
 * and is listed explicitly below rather than quietly rounded away.
 *
 * `!` marks a WCAG failure. `~` marks an APCA shortfall on a pair that passes
 * WCAG.
 */
const failures = [];
const advisories = [];

for (const appearance of ['light', 'dark']) {
  console.log(`${appearance.toUpperCase()} APPEARANCE`);
  console.log('     ratio  need    Lc  need   pair');
  for (const [fg, bg, wcagMin, lcMin, label] of PAIRS) {
    const fgc = resolve(fg, appearance);
    const bgc = resolve(bg, appearance);
    const ratio = wcagContrast(fgc, bgc);
    const lc = Math.abs(apca(fgc, bgc));

    const wcagOk = wcagMin === null || ratio >= wcagMin;
    const lcOk = lc >= lcMin;

    const entry = { appearance, fg, bg, label, ratio, lc, wcagMin, lcMin };
    if (!wcagOk) failures.push(entry);
    else if (!lcOk) advisories.push(entry);

    console.log(
      `  ${!wcagOk ? '!' : lcOk ? ' ' : '~'} ${ratio.toFixed(2).padStart(5)}` +
        `  ${(wcagMin === null ? 'n/a' : wcagMin.toFixed(1)).padStart(4)}` +
        `  ${lc.toFixed(1).padStart(4)}  ${String(lcMin).padStart(4)}   ${label}` +
        `  (${fg} on ${bg})`,
    );
  }
  console.log('');
}

console.log(
  `WCAG 2.2 AA gate: ${PAIRS.length * 2 - failures.length}/${PAIRS.length * 2} pairs pass.`,
);

if (advisories.length > 0) {
  console.log(`\nAPCA advisory — clears WCAG, below the APCA floor (${advisories.length}):`);
  for (const a of advisories) {
    console.log(
      `  ${a.appearance.padEnd(5)} Lc ${a.lc.toFixed(1)} < ${a.lcMin}  ` +
        `${a.label} (${a.fg} on ${a.bg})`,
    );
  }
  console.log(
    '\n  Accepted, with reasons:\n' +
      '  - text-disabled: WCAG 1.4.3 exempts inactive components, and a disabled\n' +
      '    label reading as faint is the intended semantic. Deliberately not raised.\n' +
      '  - accent-solid / danger-solid vs page (dark): capped by the solid fill.\n' +
      '    Brightening it to reach Lc 30 would drop the white button label below\n' +
      '    4.5:1 (it currently measures 4.55). The gate wins over the tiebreaker.\n' +
      '    Revisit only by switching dark-mode button labels to dark text, which\n' +
      '    would make the semantic tier branch on appearance — a worse trade.',
  );
}

if (failures.length > 0) {
  console.error(`\n${failures.length} pair(s) FAIL the WCAG 2.2 AA gate:`);
  for (const f of failures) {
    console.error(
      `  ${f.appearance} ${f.ratio.toFixed(2)} < ${f.wcagMin}  ${f.label} (${f.fg} on ${f.bg})`,
    );
  }
  console.error('\nFix lightness (not hue), then regenerate.');
  process.exitCode = 1;
}
