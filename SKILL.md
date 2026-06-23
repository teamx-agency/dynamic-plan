---
name: dynamic-plan
description: |
  Generate an interactive, visual implementation plan from a goal/objective and render it as a
  standalone .mdx file with embedded JSX components, Mermaid diagrams, decision forms, and a
  copy-back button. Use when the user invokes `/dynamic-plan <objetivo>` or asks to plan a feature,
  refactor, architecture decision, or migration and wants to explore it graphically (wireframes,
  flows, decision points) before committing to code. Front-load trigger keywords: "dynamic-plan",
  "interactive plan", "mdx plan", "plan with wireframes", "plan with decisions", "visual plan".
metadata:
  version: 1.0.0
  author: rod (TeamX Agency)
  license: MIT
  platforms: [claude-code, codex, opencode, hermes, pi]
---

# Dynamic Plan (interactive .mdx)

You are a senior product engineer + interaction designer. When the user types
`/dynamic-plan <objective>` (or asks to plan something visually), generate a
complete implementation plan as a **single self-contained `.mdx` file** and
open it in the user's browser.

The `.mdx` is NOT a static Markdown document. It is an interactive single-file
web app: sidebar navigation, progress bar, clickable wireframes (Mermaid),
decision form at the end, and a one-click "copy my decisions" button the user
can paste back to the agent to trigger implementation.

---

## Invocation Contract

- Trigger: `/dynamic-plan <goal>` OR plain language such as
  *"make an interactive plan for <goal>"*, *"plan this with wireframes"*, *"give me an mdx plan for X"*.
- If the user typed no goal after `/dynamic-plan`, ask ONE focused clarifying
  question (scope only) then proceed. Do not loop on questions.
- Default output path: `.dynamic-plan/<slug>-<YYYYMMDD-HHMMSS>/plan.mdx`
  (slug = kebab-case of first 5 words of the goal). Override with `--out <path>`.
- Always run `scripts/serve-mdx.sh <plan-dir>` after writing the file and tell
  the user the URL (default `http://127.0.0.1:8765/`).

---

## Plan Document Structure (the .mdx recipe)

Every generated `.mdx` MUST contain these sections in this order. Use the
frontmatter, JSX components, and Mermaid blocks defined in
[`references/mdx-components.md`](references/mdx-components.md).

### 1. Frontmatter (YAML)

```yaml
---
title: <short human title>
slug: <kebab-slug>
generatedAt: <ISO-8601>
goal: <verbatim user goal>
status: draft | approved
stack: [<detected tech stack>]
---
```

### 2. Cover + meta

- `<PlanHeader>` JSX component: goal, generatedAt, stack chips, status badge.

### 3. Table of Contents sidebar

- `<PlanSidebar steps={[...]} />` — sticky left rail, highlights active section,
  shows progress (steps acknowledged by user). See `references/mdx-components.md`.

### 4. Steps

For each implementation step emit a `<PlanStep n={i} title="...">` block with:

- **Goal** (1 sentence, user-facing)
- **Why** (1–2 sentences: business/technical rationale)
- **Acceptance criteria** (checkbox list)
- **Wireframe / Screen** — for any user-facing UI, wrap a wireframe inside
  `<ScreenFrame title="..." desc="...">` + `<Screen title="..." url="...">`
  and compose it from the Figkit-style components in
  [`references/wireframe-components.md`](references/wireframe-components.md).
  Use placeholders ("_____", "Lorem ipsum", "_____________") — no real data.
  Example:
  ```mdx
  <ScreenFrame title="Login screen" desc="Centered card, 360px wide">
    <Screen title="Login" url="teamx.app/login">
      <div style={{ maxWidth: 360, margin: "32px auto" }}>
        <h1>Welcome back</h1>
        <Col>
          <Button variant="social">🔵 Continue with Google</Button>
          <Button variant="social">⚫ Continue with GitHub</Button>
        </Col>
      </div>
    </Screen>
  </ScreenFrame>
  ```
- **Backend / architecture flow** — if the step also has a non-UI component
  (e.g. an OAuth flow, state machine), include a `<Mermaid>` or
  `<Wireframe title="...">` (the Mermaid-aware one) below the screen.
- **Callouts** (optional) — `<Callout emoji="💡" tone="info">` for risks,
  rationale, or gotchas in a Notion-style left-bordered block.
- **Code sketch** (optional, fenced ```tsx / ```php / ```ts — short, illustrative)
- **Risks & mitigations** (bullet list, max 3)

Minimum 3 steps, maximum 9. If the goal would need more, group into phases
(Phase 1 / Phase 2) and emit the same structure at the phase level.

### 5. Decisions section (REQUIRED at the end)

Emit a `<DecisionForm id="plan-decisions">` component containing one
`<Decision>` per open question. Each `<Decision>` has:

- `id` (kebab-case)
- `question` (1 sentence, plain language)
- `options` — 2–5 mutually exclusive radio choices, each with a short
  rationale (≤ 12 words) shown as helper text
- `allowNote` (default `true`) — free-text note below the radios

The DecisionForm auto-aggregates answers into a JSON object and exposes:

- A live preview pane (right side on desktop, collapsed on mobile)
- A `<CopyDecisions target="#plan-decisions" />` button that copies a
  paste-ready markdown block the user can drop straight into the agent:

```
@dynamic-plan decisions
```json
{ "id-1": "option-a", "id-2": "option-b", ... }
```
Notes:
- id-1: <free text>
```

### 6. Append a trailing "How to use this file" block

3-bullet plain-language explainer so the user knows: (a) decisions are local,
(b) copying puts them back into this chat, (c) approving the plan triggers
implementation.

---

## Visual / Interaction Standards

- **Layout**: Tailwind CSS via CDN. Two-column on ≥ md (sidebar 280px + content).
  Single column stacked on mobile.
- **Theme**: light by default, dark via `prefers-color-scheme`.
- **Mermaid**: load from `https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.esm.min.mjs`.
  Call `mermaid.initialize({ startOnLoad: true, theme: 'neutral', securityLevel: 'loose' })`.
  Wrap every diagram in `<Mermaid>` so failed renders show a fallback `<pre>`.
- **No external state**: every interactive component is a pure function of the
  DOM. No build step. No frameworks beyond Tailwind + Mermaid + React 18 ESM
  (for JSX rendering of the few components).
- **Self-contained**: the `.mdx` file must be openable via `file://` and still
  render. We compile to a standalone `.html` next to it (same basename,
  `.html` extension) so `file://` works without a server. The
  `scripts/serve-mdx.sh` is offered as a richer local-dev preview.

---

## Workflow

When the user invokes `/dynamic-plan <goal>`:

1. **Parse**: extract goal, detect stack from `package.json`/`composer.json`/
   `pyproject.toml`/`Cargo.toml`/`.agents/product-marketing.md` if present;
   otherwise ask once.
2. **Decompose**: produce 3–9 steps. Each step: goal / why / acceptance /
   wireframe / risks.
3. **Identify decisions**: every step with a non-trivial trade-off becomes a
   `<Decision>`. Aim for 2–6 total decisions; don't fabricate trivial ones.
4. **Generate** the `.mdx` content using the templates in
   `references/mdx-components.md`.
5. **Compile** to `.html` in the same folder: render the JSX with
   `@mdx-js/mdx` (browser ESM build) and inline the result. Use
   `scripts/compile-mdx.mjs <input.mdx> <output.html>`.
6. **Open**: run `scripts/serve-mdx.sh <dir>` (which spawns `python3 -m
   http.server 8765` in the background and `open`s the URL on macOS), then
   print the URL.
7. **Hand off**: print a 3-line summary — goal, step count, decision count,
   and the URL.

When the user pastes the `@dynamic-plan decisions` block back:

1. Parse the JSON and notes.
2. Confirm interpretation in one sentence.
3. Ask: *"Ready to implement, or do you want to refine the plan first?"*
4. On approval, begin implementation step-by-step, respecting the chosen
   options and notes.

---

## Bundled Resources

| Path | Purpose |
|------|---------|
| `assets/plan-template.mdx` | Starter skeleton (copy + fill) |
| `assets/style.css`          | Notion-inspired CSS (light/dark) + wireframe styles (`.wf-*`) |
| `scripts/compile-mdx.mjs`   | Node ESM script: `.mdx` → standalone `.html` |
| `scripts/serve-mdx.sh`      | Spawns local HTTP server and opens browser |
| `references/mdx-components.md`    | JSX core components (`<PlanHeader>`, `<PlanSidebar>`, `<PlanStep>`, `<Mermaid>`, `<Callout>`, `<DecisionForm>`, `<Decision>`, `<CopyDecisions>`) |
| `references/wireframe-components.md` | Figkit-style HTML wireframes (`<Screen>`, `<TopNav>`, `<SideNav>`, `<Button>`, `<Field>`, `<Modal>`, `<Card>`, `<Table>`, `<Stat>`, 30+ more) |
| `references/wireframe-kit.md` | Mermaid design-system vocabulary (for backend/architecture diagrams) |
| `references/mermaid-snippets.md` | Ready-made Mermaid snippets (login, CRUD, wizard, etc.) |

---

## Compatibility Matrix (verified)

| Platform | Skill path | Slash command path | Notes |
|----------|-----------|---------------------|-------|
| Claude Code | `~/.claude/skills/dynamic-plan/SKILL.md` | `~/.claude/commands/dynamic-plan.md` | both auto-discovered |
| Codex | `~/.codex/skills/dynamic-plan/SKILL.md` | `~/.codex/commands/dynamic-plan.md` | both auto-discovered |
| Hermes | `~/.hermes/skills/dynamic-plan/SKILL.md` | `~/.hermes/commands/dynamic-plan.md` | skills live under category folder |
| OpenCode | auto-loaded from `~/.claude/skills/` OR `~/.agents/skills/` | `~/.config/opencode/command/dynamic-plan.md` | no duplication needed |
| Pi | `~/.pi/agent/skills/dynamic-plan/SKILL.md` | n/a (use `/skill:dynamic-plan <goal>`) | format identical |

The installer (`scripts/install.sh`) symlinks the master copy in
`~/.agents/skills/dynamic-plan/` into every other expected location so a single
edit propagates everywhere.

---

## Anti-patterns

- ❌ Generating plain `.md` instead of `.mdx` (defeats the purpose).
- ❌ Asking more than one clarifying question before producing the plan.
- ❌ Omitting the `<DecisionForm>` (the user has no way to feed choices back).
- ❌ Forgetting to open the browser / print the URL (the user can't see anything).
- ❌ Building the `.mdx` with a framework that needs `npm install` (must be
  openable offline).
- ❌ Making decisions the user can't opt out of — every `<Decision>` should
  have a `default` option matching the recommendation.

---

## Reference Index

- Component API & JSX: [`references/mdx-components.md`](references/mdx-components.md)
- Mermaid wireframe library: [`references/mermaid-snippets.md`](references/mermaid-snippets.md)
- Starter plan: [`assets/plan-template.mdx`](assets/plan-template.mdx)
- Tailwind/CSS: [`assets/style.css`](assets/style.css)
- Compiler: [`scripts/compile-mdx.mjs`](scripts/compile-mdx.mjs)
- Local server: [`scripts/serve-mdx.sh`](scripts/serve-mdx.sh)
- Installer: [`scripts/install.sh`](scripts/install.sh)