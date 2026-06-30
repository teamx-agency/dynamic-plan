# MDX Components Reference

All JSX components live in `assets/components.js` (a single ESM module). They
are pure DOM functions — no React state machinery required. The compiler
(`scripts/compile-mdx.mjs`) inlines this module into the final HTML.

## `<PlanHeader title goal generatedAt stack status />`

Hero block. Renders the goal, generated timestamp, stack chips, and a colored
status badge (draft / approved / in-progress).

```jsx
<PlanHeader
  title="OAuth2 login flow"
  goal="Add Google + GitHub OAuth to the TeamX dashboard"
  generatedAt="2026-06-23T14:32:00Z"
  stack={["PHP 8.2", "Medusa", "Doctrine", "Alpine.js"]}
  status="draft"
/>
```

## `<PlanSidebar steps=[...] />`

Sticky navigation. Each step is `{ id, title }`. Highlights the step whose
section is currently in the viewport (uses `IntersectionObserver`).

```jsx
<PlanSidebar steps={[
  { id: "overview", title: "Overview" },
  { id: "step-1",   title: "1. Add OAuth provider config" },
  { id: "step-2",   title: "2. Build callback controller" },
  { id: "decisions", title: "Decisions" },
]} />
```

## `<ProgressBar />`

Reads `localStorage.dplan-progress-<slug>` (set by the form/checklist) and
fills the top thin bar (0–100%).

## `<PlanStep n title>...children...</PlanStep>`

Section card for one step. Children may include plain markdown + `<Mermaid>`
+ `<details>` blocks. Adds a numbered badge, anchor id `step-n`, and a
"Mark as reviewed" checkbox that increments the progress bar.

```jsx
<PlanStep n={1} title="Add OAuth provider config">
  <h4>Goal</h4>
  <p>Wire Google + GitHub credentials into the Medusa service container.</p>

  <h4>Why</h4>
  <p>OAuth needs to be configurable per environment without code changes.</p>

  <h4>Acceptance criteria</h4>
  <ul>
    <li><input type="checkbox" data-progress /> `oauth.yaml` loads env-specific creds</li>
    <li><input type="checkbox" data-progress /> Unit tests cover missing/invalid config</li>
  </ul>

  <h4>Wireframe</h4>
  <Mermaid chart="flowchart-td" code={`flowchart TD
    A[User clicks Login] --> B{Provider?}
    B -->|Google| C[Redirect to Google]
    B -->|GitHub| D[Redirect to GitHub]
    C --> E[/Callback handler/]
    D --> E
    E --> F[Issue JWT]
  `} />

  <h4>Risks</h4>
  <ul>
    <li>Credential rotation not yet automated → mitigate via Vault reload hook</li>
  </ul>
</PlanStep>
```

## `<Mermaid chart code />`

Wraps Mermaid. `chart` is a hint for the wrapper class; we render any valid
Mermaid syntax in `code`. Adds a fallback `<pre>` with the raw code if Mermaid
fails to render.

## `<DecisionForm id>...children...</DecisionForm>`

Auto-collects all `<Decision>` children. Wires every input/textarea change
to:

1. Update the live JSON preview `<pre class="decision-preview">` (placed at
   the bottom of the form).
2. Persist to `localStorage.dplan-<id>` so the user does not lose state on
   reload.

## `<Decision id question options default allowNote>`

Single decision. `options` is an array of `{ value, label, help }`. The user
can also type a note.

```jsx
<Decision
  id="auth-provider"
  question="Which identity provider should we integrate first?"
  default="google"
  options={[
    { value: "google",  label: "Google",  help: "Widest reach, fastest setup" },
    { value: "github",  label: "GitHub",  help: "Devs love it, limited audience" },
    { value: "both",    label: "Both",    help: "Max coverage, ~2× work" },
  ]}
  allowNote
/>
```

## `<CopyDecisions target />`

Reads the DecisionForm's current state, formats it as:

```
@dynamic-plan decisions
```json
{ "auth-provider": "google", ... }
```
Notes:
- auth-provider: Use the workspace account
```

…copies it to clipboard via `navigator.clipboard.writeText`, and shows a
"Copied!" toast for 2 seconds.

---

## Layout primitives (composition layer)

A small set of token-backed building blocks. They read the **chrome** tokens
(`--space-*`, `--text-*`, `--fg`, `--accent`…) so they adapt to the plan theme.
Use them to compose layouts without writing CSS, and as the body of custom
components (see `defineComponent` below).

| Primitive | Key props | Purpose |
|---|---|---|
| `<Box>` | `p/px/py/pt…`, `m…`, `bg`, `border`, `radius`, `shadow`, `w`, `h`, `as` | The box-model + surface atom |
| `<Stack>` | `gap`, `align`, `justify`, + Box props | Vertical flex flow |
| `<Inline>` | `gap`, `align`, `justify`, `wrap`, + Box props | Horizontal flex row (modern `<Row>`) |
| `<Text>` | `size` (xs…xl), `weight`, `tone`, `truncate`, `mono`, `align`, `as` | Body/inline text on the type scale |
| `<Heading>` | `level` (1–6), `size`, `weight`, `tone` | Semantic `hN`, visual size decoupled from level |
| `<Spacer>` | `size`, `axis`, `grow` | Explicit whitespace / flex filler |
| `<Skeleton>` | `w`, `h`, `radius`, `lines` | Shimmer loading placeholder |
| `<AspectRatio>` | `ratio` (number or `"16:9"`), `bg`, `radius` | Fixed-ratio box |
| `<Icon>` | `name` (emoji or text), `size`, `tone`, `label` | Emoji-or-placeholder glyph, no icon font |

Spacing keywords (`gap`, `p`, `m`, …): `xs · sm · md · lg · xl · 2xl · 3xl`, or a
number (px), or any raw CSS length.

```jsx
<Box p="md" bg="subtle" radius="lg" border>
  <Stack gap="sm">
    <Heading level={3} size="lg">Title</Heading>
    <Inline gap="sm" align="center">
      <Avatar initials="AB" /> <Text tone="muted">subtitle</Text> <Spacer grow />
    </Inline>
  </Stack>
</Box>
```

## `defineComponent(name, spec)` — custom reusable components

Compose new, named components from the primitives **without editing
`components.js`**. The result works as a normal MDX component and nests inside
other `render()` trees. It auto-registers so MDX, `resolveComponents()`, and
plugins all see it.

```mdx
import { defineComponent, Box, Stack, Heading, Text, Button } from "./components.js";

export const PricingCard = defineComponent("PricingCard", {
  props: {
    plan: { default: "Starter", required: true },
    price: "$0",
    features: [],
    featured: false
  },
  render: (p) => Box({ p: "lg", border: p.featured ? "strong" : true, bg: "elev", children:
    Stack({ gap: "md", children: [
      Heading({ level: 3, children: p.plan }),
      Text({ size: "2xl", weight: "bold", children: p.price }),
      Button({ variant: p.featured ? "primary" : "secondary", fullWidth: true, children: "Choose " + p.plan })
    ]})
  })
});

<PricingCard plan="Pro" price="$29" featured />
```

**Spec shape**

- `props` — a map of `key → default`, or `key → { default, required, type, oneOf, coerce }`.
  Validation is **advisory** (it `console.warn`s, never throws — a thrown error
  in an MDX component would blank the page). Array/object defaults are cloned per
  instance so siblings never share mutable state. Undeclared incoming props
  (`className`, `style`, `onClick`, `data-*`, `children`) pass through untouched.
- `render(resolvedProps)` — returns a tree built by **calling primitives as
  functions**: `Stack({ gap, children: [...] })`. For raw HTML tags use the
  `el(tag, props, ...children)` helper. Pass `children` via the props object.
- `register: false` — opt out of auto-registration (rarely needed).

Registration precedence is **built-ins → defineComponent → `DPLAN_PLUGINS`**, so
plugins keep the final say (see `docs/plugin-api.md`).

## New wireframe components

The kit gained 20 components in v1.5.0 — `Accordion`, `Dropdown`, `Progress`,
`Spinner`, `EmptyState`, `Stepper`, `Chip`, `CodeBlock`, `Tooltip`,
`Pagination`, `SegmentedControl`, `Drawer`, `MetricCard`, `ListItem`, `Popover`,
`SearchBar`, `DescriptionList`, `ChatBubble`, `FileDropzone`, `ButtonGroup`. See
`references/wireframe-components.md` for their prop tables.

---

## Component file

All components are defined in `assets/components.js` (vanilla JS, ESM). Open that
file to see exact implementations. The `.mdx` file imports from it via
`import { PlanHeader, ... } from "./components.js";`.

When compiling via `scripts/compile-mdx.mjs`, the bundler inlines
`./components.js` into the output HTML so the file remains self-contained.