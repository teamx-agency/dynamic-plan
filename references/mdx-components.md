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

## Component file

All components are defined in `assets/components.js` (vanilla JS, ESM,
~150 lines). Open that file to see exact implementations. The `.mdx` file
imports from it via `import { PlanHeader, ... } from "./components.js";`.

When compiling via `scripts/compile-mdx.mjs`, the bundler inlines
`./components.js` into the output HTML so the file remains self-contained.