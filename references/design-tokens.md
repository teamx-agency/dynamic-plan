# Design Tokens

Everything visual in dynamic-plan is driven by CSS custom properties declared in
`assets/style.css`. Change a token in one place and the whole kit re-themes —
including dark mode and the wireframe **Hi-Fi** toggle.

There are **two token layers**:

- **Chrome tokens** (`--bg`, `--fg`, `--accent`, `--border`, …) — the plan
  document itself (header, sidebar, cards, callouts, decisions). The composition
  **primitives** (`<Box>`, `<Text>`, …) read these so they adapt to the plan theme.
- **Wireframe tokens** (`--wf-*`) — the gray-box Figkit kit (`<Screen>`,
  `<Button>`, `<Card>`, plus the 14 new components). These are intentionally a
  separate, indigo-accented palette so a wireframe always reads as a wireframe.

## How theming works

```
:root { … light values … }                         /* base */
@media (prefers-color-scheme: dark) :root { … }     /* dark re-points the same names */
:root[data-wf-mode="hi-fi"] { … }                   /* hi-fi re-points a few --wf-* */
```

Rules **never** hardcode a hex; they read `var(--token)`. Dark mode and hi-fi
work by **re-pointing the token**, not by per-rule overrides. (The two status
palettes — alerts/badges/annotation — keep literal hex pairs because their
text/background contrast is hand-tuned per mode.)

> **Fallback convention:** where a rule reads a wireframe surface it uses
> `var(--token)`. The token is always defined in `:root`, so the value is used;
> the literal hex only survives as historical reference in git.

## Token reference

### Spacing (4-pt scale)

`--space-0 … --space-24` → `0, 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 96px`
(`--space-1 … --space-16` are the common ones). Primitive `gap`/`p`/`m` keywords
map onto this: `xs=4 · sm=8 · md=16 · lg=24 · xl=32 · 2xl=48 · 3xl=64`.

### Typography

| Group | Tokens |
|---|---|
| Size | `--text-2xs`(10) `--text-xs`(11) `--text-sm`(13) `--text-base`(14) `--text-md`(16) `--text-lg`(17) `--text-xl`(20) `--text-2xl`(24) `--text-3xl`(28) `--text-4xl`(40) |
| Line-height | `--leading-*` paired to each size, plus `--leading-default` (1.5) |
| Weight | `--weight-regular`(400) `--weight-medium`(500) `--weight-semibold`(600) `--weight-bold`(700) |
| Icon size | `--icon-xs`(12) `--icon-sm`(16) `--icon-md`(20) `--icon-lg`(28) |

`<Text size="sm" weight="semibold" tone="muted">` and `<Heading level={2}>`
resolve to these.

### Radii (modernized)

`--radius-xs`(3) `--radius-sm`(5) `--radius`(7) `--radius-lg`(11) `--radius-xl`(16)
`--radius-pill`(999) `--radius-circle`(50%) `--radius-device`(36)

> **Breaking-ish:** `--radius` went 4→7 and `--radius-lg` 8→11 in v1.5.0. Both
> chrome and wireframe consumers get slightly rounder corners.

### Shadows (layered + soft)

`--shadow-xs · --shadow-sm · --shadow-md · --shadow-lg` (two-layer soft shadows),
`--shadow-focus` (chrome focus ring), `--shadow-focus-wf` (wireframe focus ring),
`--shadow-inset-hairline`.

### Z-index ladder

`--z-base · --z-raised · --z-device-chrome · --z-sticky · --z-modal-backdrop ·
--z-modal · --z-toast · --z-progress · --z-tooltip`.

### Motion

| Easing | Duration |
|---|---|
| `--ease-standard` (in-out) | `--dur-instant` (80ms) |
| `--ease-out` (decelerate) | `--dur-fast` (150ms) |
| `--ease-in` (accelerate) | `--dur-base` (240ms) |
| `--ease-spring` (overshoot) | `--dur-slow` (400ms) |
| | `--dur-shimmer` (1400ms) |

Keyframes: `dp-fade-in`, `dp-slide-up`, `dp-scale-in`, `dp-shimmer`, `dp-spin`.
All animation/transition is disabled under `@media (prefers-reduced-motion: reduce)`
(the shimmer and spinner stop; states change instantly).

### Status (shared by chrome + wireframe)

`--good / --warn / --bad / --info` each with a `*-soft` (tint background) and
`*-border` companion, plus `--fg-on-accent` for text on accent fills.

### Wireframe surface set (`--wf-*`)

| Token | Purpose |
|---|---|
| `--wf-bg` | screen outer frame |
| `--wf-surface` / `--wf-surface-subtle` / `--wf-surface-sunken` | fills |
| `--wf-fg` / `--wf-text` / `--wf-muted` / `--wf-placeholder` / `--wf-ghost` | text (darkest → faintest) |
| `--wf-border` / `--wf-border-strong` | hairlines |
| `--wf-accent` / `--wf-accent-strong` / `--wf-accent-soft` | indigo accent |
| `--wf-good / --wf-warn / --wf-bad` | wireframe status |
| `--wf-chrome` / `--wf-chrome-detail` | device bezel (mobile preset) |
| `--wf-scrim` | modal/drawer backdrop |
| `--wf-image-grad` / `--wf-track-fill` | hi-fi image gradient, gantt fill |
| `--wf-chart-grid / -axis / -bar / -value` | data-viz (BarChart, Gantt) |

All five `--wf-chart-*` default to the wireframe layer (`var(--wf-border)`,
`var(--wf-muted)`, `var(--wf-accent)`, `var(--wf-fg)`), so charts theme with
everything else.

## Using tokens in your own CSS / plugins

```css
.my-thing {
  padding: var(--space-4);
  border-radius: var(--radius);
  box-shadow: var(--shadow-md);
  color: var(--fg);
  transition: background var(--dur-fast) var(--ease-standard);
}
```

Primitives are the no-CSS path: `<Box p="md" radius="lg" shadow="md" bg="elev">`.

## See also

- `references/mdx-components.md` — primitives + the `defineComponent()` API
- `references/wireframe-components.md` — the wireframe component kit
- `assets/style.css` — the canonical token definitions
