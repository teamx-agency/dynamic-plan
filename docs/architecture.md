# Architecture

How dynamic-plan works under the hood. Read this if you want to contribute or extend the skill.

## Goal

A user types `/dynamic-plan <goal>` in their AI agent. The agent generates a single `.mdx` file containing a complete interactive plan. That `.mdx` file compiles to a self-contained `.html` the user can open in a browser to review the plan visually, make decisions, and paste them back to the agent.

## The 3-stage pipeline

```
┌─────────────────────┐    ┌─────────────────────┐    ┌─────────────────────┐
│  STAGE 1            │    │  STAGE 2            │    │  STAGE 3            │
│  Authoring          │    │  Compilation        │    │  Rendering          │
│                     │    │                     │    │                     │
│  AI agent writes    │ ─→ │  Node ESM script    │ ─→ │  Browser (no build) │
│  a .mdx file using  │    │  uses @mdx-js/mdx   │    │  React 18 ESM       │
│  the skill spec.    │    │  to produce a       │    │  from esm.sh        │
│                     │    │  standalone .html.  │    │                     │
└─────────────────────┘    └─────────────────────┘    └─────────────────────┘
```

## Stage 1: Authoring (the agent's job)

The agent is instructed by `SKILL.md` to produce a `.mdx` file with:

- YAML frontmatter (title, slug, generatedAt, goal, status, stack)
- An optional `<PlanHeader />` (uses frontmatter by default)
- A `<PlanSidebar>` with TOC entries
- A `<main>` containing:
  - An **Overview** section
  - 3-9 `<PlanStep>` blocks, each with goal/why/acceptance/wireframe/risks
  - A **Decisions** section with `<DecisionForm>` containing `<Decision>`s and a `<CopyDecisions>` button
- Components imported from `./components.js`

The agent has access to:

- `references/wireframe-components.md` — the Figkit-style component API
- `references/wireframe-kit.md` — Mermaid design-system vocabulary (for backend flows)
- `references/mermaid-snippets.md` — ready-made Mermaid snippets
- The existing plan in `.dynamic-plan/<slug>-<timestamp>/plan.mdx` as a worked example

## Stage 2: Compilation (Node 18+)

`scripts/compile-mdx.mjs` is the only build step. It:

1. **Strips YAML frontmatter** from the `.mdx` source (MDX doesn't extract it automatically; we parse it ourselves with a tiny regex-based parser and inject it as `window.__MDX_FRONTMATTER__`).
2. **Compiles MDX body** to an ESM program via `@mdx-js/mdx` with `outputFormat: "program"`. (The `function-body` output format produces top-level `return` statements that break in a `<script type="module">`.)
3. **Rewrites imports:**
   - `import { ... } from "./components.js"` → data/sibling URL
   - `import { jsx, jsxs, Fragment } from "react/jsx-runtime"` → stripped (provided by the wrapper)
4. **Inlines `style.css`** into a `<style>` tag in the head.
5. **Emits** a single HTML file with a `<script type="module">` that:
   - Imports React 18 jsx-runtime from `esm.sh`
   - Sets `window.React` (some `react-dom` helpers expect it)
   - Imports the compiled MDX + components
   - Calls `createRoot(...).render(...)` to mount

**Critical detail:** we copy `components.js` to a sibling file (`<basename>.components.mjs`) instead of inlining it as a `data:` URL. The base64 of a large `data:` URL contains `/` characters that V8's regex parser misinterprets, causing "Invalid regular expression flags" errors at parse time. (Lesson learned the hard way.)

## Stage 3: Rendering (browser)

The HTML uses:

- **React 18** from `esm.sh/react@18.3.1/jsx-runtime` (~50 KB gzipped)
- **Mermaid 10** from `jsDelivr` (only if the plan has `<Mermaid>` blocks)
- **localStorage** for persistence (progress, decisions, draft notes)
- **CSS variables** for theming (light/dark via `prefers-color-scheme`)
- **No build step** — the same `.html` works with `file://` or any HTTP server

### Why React (and not vanilla DOM)?

We started with vanilla DOM helpers, but:
- The MDX compiler outputs React-compatible JSX
- React's reconciliation is easier to reason about than `document.createElement` chains
- The bundle is small enough (~50 KB) that the tradeoff is worth it

### Why CDN ESM (and not a build)?

- The user can `file://` open the output
- No `node_modules` bloat in the user's machine
- The skill is itself offline (once `node_modules` is installed for compilation)

## The two component libraries

We have **two component families**, both in `assets/components.js`:

### Core (planning structure)

`<PlanHeader>`, `<PlanSidebar>`, `<PlanStep>`, `<ProgressBar>`, `<Mermaid>`, `<Callout>`, `<DecisionForm>`, `<Decision>`, `<CopyDecisions>`

These are the planning-specific components. They manage state, persistence, and provide the chrome around the plan.

### Wireframes (Figkit-style HTML)

`<Screen>`, `<ScreenFrame>`, `<TopNav>`, `<SideNav>`, `<Layout>`, `<Breadcrumb>`, `<Tabs>`, `<Button>`, `<Field>`, `<Input>`, `<Select>`, `<Textarea>`, `<Checkbox>`, `<Radio>`, `<Toggle>`, `<Card>`, `<Modal>`, `<Toast>`, `<ToastStack>`, `<AlertBanner>`, `<Table>`, `<Avatar>`, `<Badge>`, `<Stat>`, `<Divider>`, `<Row>`, `<Col>`, `<Grid>`

These are presentation-only. They render gray-box HTML that looks like a real screen.

### Primitives + custom components (v1.5.0)

A third family sits underneath both: token-backed **primitives** (`<Box>`,
`<Stack>`, `<Inline>`, `<Text>`, `<Heading>`, `<Spacer>`, `<Skeleton>`,
`<AspectRatio>`, `<Icon>`) plus the **`defineComponent()`** factory. Authors
compose new named components from primitives without editing `components.js`.

`defineComponent` writes into a module-level `DEFINED_COMPONENTS` object.
`resolveComponents()` merges three sources in order — **built-ins →
`DEFINED_COMPONENTS` → `window.DPLAN_PLUGINS`** (later wins) — so plugins keep
final override power. Because the registry is a plain module variable, it
populates at import time with no `window` dependency, which keeps the Node-side
compile/smoke pass working.

### The token layer

`assets/style.css` opens with a full design-token set: spacing (4-pt), a type
scale, radii, layered shadows, a z-index ladder, and motion (easing + duration)
tokens, plus a base + dark `--wf-*` wireframe surface palette. Dark mode and the
Hi-Fi toggle work by **re-pointing tokens**, not per-rule overrides. See
[`references/design-tokens.md`](../references/design-tokens.md). A
`prefers-reduced-motion` guard disables all animation/transition globally.

**Why not just use Mermaid for everything?** Mermaid is a *diagram* tool. Its boxes connected with arrows are abstract — they don't show what a button looks like, what the form fields say, what a modal looks like. Stakeholders reviewing a plan want to see real UI, not boxes.

## State management

State is local to each component. Cross-component state (progress bar reading the same checkboxes as the decisions form) works via plain DOM queries — the `<ProgressBar>` listens to `change` events on `document` and counts `[data-progress]` checkboxes.

Decisions persist to `localStorage` keyed by plan slug. The progress bar does **not** persist (we want it to reset on reload — that's the "I closed the plan, came back, started fresh" affordance).

## Cross-platform install

OpenCode auto-loads skills from `~/.claude/skills/` and `~/.agents/skills/`. The other agents don't. We use a master copy at `~/.agents/skills/dynamic-plan/` (because it's the most universally accessible) and copy from it to:

- `~/.claude/skills/dynamic-plan/` + `~/.claude/commands/dynamic-plan.md`
- `~/.codex/skills/dynamic-plan/` + `~/.codex/commands/dynamic-plan.md`
- `~/.hermes/skills/dynamic-plan/` + `~/.hermes/commands/dynamic-plan.md`
- `~/.pi/agent/skills/dynamic-plan/`
- `~/.config/opencode/command/dynamic-plan.md` (the slash command file)

The `install.sh` script does this. The CLI's `npx dynamic-plan install` just calls it.

## File layout

```
dynamic-plan/
├── README.md
├── LICENSE
├── package.json
├── CONTRIBUTING.md
├── .gitignore
├── install.sh             # cross-platform installer
├── uninstall.sh
├── SKILL.md               # the skill spec (read by agents)
├── bin/
│   └── dynamic-plan.js    # CLI entry point (npm bin)
├── assets/
│   ├── components.js      # all components (core + wireframe)
│   ├── plan-template.mdx  # starter template
│   ├── style.css          # all CSS
│   └── examples/          # 4 reference .mdx files
├── references/            # docs read by the agent at plan time
│   ├── mdx-components.md
│   ├── wireframe-components.md
│   ├── wireframe-kit.md
│   └── mermaid-snippets.md
├── scripts/
│   ├── compile-mdx.mjs    # the compiler
│   ├── compile-mdx.sh     # wrapper for npx
│   ├── serve-mdx.sh       # local HTTP server
│   └── test-compile.mjs   # smoke tests
└── docs/
    ├── architecture.md    # this file
    └── screenshots/       # used in README
```

## Performance

- **Compile time:** ~300ms for a 9-wireframe plan on a modern Mac
- **Output size:** 20-50 KB HTML + 20-30 KB components.js = ~70 KB total
- **Runtime:** React 18 ESM from esm.sh loads in ~150ms on first visit, cached after
- **Mermaid:** only loaded if the plan has `<Mermaid>` blocks (dynamic import)

## Limitations

- **No real data binding** — wireframes are placeholders; the user can't fill them in
- **No interactivity between decisions and the rest of the plan** — decisions are independent; making one doesn't re-render a wireframe
- **No mobile-first** — wireframes render at a fixed desktop width; mobile responsiveness is a CSS concern, not a component concern
- **No export to PDF** — only HTML
- **No collaborative editing** — each user gets their own `localStorage`

These are all on the roadmap. See [README.md#roadmap](../README.md#roadmap).