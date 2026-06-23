# Wireframe Components (Figkit-style HTML)

A library of **real HTML components** rendered as gray-box wireframes. The agent composes these in `.mdx` to produce mockups of any UI — login, settings, admin, modals, toasts, tables — without writing CSS or thinking about styling. Everything ships inside `<Screen>` so the wireframe looks like it's running inside a browser frame.

## Quick start

```mdx
import { Screen, ScreenFrame, TopNav, Button, Field, Input } from "./components.js";

<ScreenFrame title="Login screen" desc="Centered card, 360px wide">
  <Screen title="Login" url="teamx.app/login">
    <div style={{ maxWidth: 360, margin: "32px auto" }}>
      <h1>Welcome back</h1>
      <Button variant="social">🔵 Continue with Google</Button>
      <Button variant="social">⚫ Continue with GitHub</Button>
    </div>
  </Screen>
</ScreenFrame>
```

## Components

### Layout

| Component | Props | Purpose |
|---|---|---|
| `<ScreenFrame>` | `title`, `desc` | Wrapper that adds the 🎨 label + description above the screen |
| `<Screen>` | `title`, `url` | Browser-chrome frame (3 dots + URL bar) |
| `<TopNav>` | `brand`, `links`, `cta` | Top navigation bar |
| `<SideNav>` | `brand`, `items` or `sections` | Side navigation |
| `<Layout>` | `brand`, `sections` | SideNav + main content wrapper |
| `<Breadcrumb>` | `items` | Breadcrumb trail |
| `<Tabs>` | `tabs` | Horizontal tab bar |

### Buttons

| Component | Props | Variants |
|---|---|---|
| `<Button>` | `variant`, `size`, `icon`, `fullWidth`, `disabled` | `primary`, `secondary`, `ghost`, `destructive`, `social` |
| sizes: | `sm`, (default), `lg` | |

### Forms

| Component | Props | Notes |
|---|---|---|
| `<Field>` | `label`, `required`, `help`, `error` | Wrapper that adds label + help text |
| `<Input>` | `type`, `placeholder`, `value`, `disabled` | All HTML input types |
| `<Select>` | `options`, `placeholder`, `value` | Dropdown with placeholder |
| `<Textarea>` | `rows`, `placeholder`, `value` | Multi-line text |
| `<Checkbox>` | `checked` | Visual-only (no event handling) |
| `<Radio>` | `checked` | Visual-only |
| `<Toggle>` | `on` | On/off switch, visual-only |

### Display

| Component | Props | Notes |
|---|---|---|
| `<Card>` | `title`, `body`, `footer`, `image`, `imagePlaceholder` | Container with optional header, body, footer, image area |
| `<Modal>` | `title`, `open`, `confirmLabel`, `destructive` | Backdrop + dialog with header/body/footer |
| `<Toast>` | `tone` | tones: `info`, `success`, `warn`, `danger` |
| `<ToastStack>` | | Vertical stack of toasts (positioned top-right) |
| `<AlertBanner>` | `tone` | Inline alert with icon + body |
| `<Table>` | `columns`, `rows` | Header + N rows of `_____________` placeholders |
| `<Avatar>` | `size`, `initials` | sizes: (default), `sm`, `lg` |
| `<Badge>` | `variant` | variants: (default), `primary`, `success`, `warn`, `danger` |
| `<Stat>` | `value`, `label`, `delta` | Big number + label + delta arrow |

### Layout helpers

| Component | Props | Notes |
|---|---|---|
| `<Row>` | | `display: flex; gap: 12px` |
| `<Col>` | | `display: flex; flex-direction: column; gap: 12px` |
| `<Grid cols={2\|3\|4}>` | | Equal-width grid |
| `<Divider>` | | Horizontal rule |
| `<TextDivider>` | `children` | "───── or ─────" |

## Style conventions

- **No real data.** Use:
  - `Lorem ipsum…` for prose
  - `_____________` (10+ underscores) for values
  - `_____@gmail.com` for emails
  - `Avatar` text for user names
  - `00,000` for stat values
- **No colors.** Everything is gray/blue (accent for active/selected only).
- **Borders are dashed or 1px solid** — never gradient.
- **Icon placeholders** are dashed squares (`.wf-sidenav-icon`) or single emoji.

## Color usage

- **Accent (blue):** active nav, primary CTA, selected radio
- **Green:** success badge, positive stat delta
- **Amber:** warn, destructive button (border), "skipped" tone
- **Red:** danger alert, error state
- **Gray everything else.**

## When to use wireframes vs Mermaid

- **Wireframes (this library):** for any user-facing UI screen — login, dashboard, settings, forms, modals, mobile screens.
- **Mermaid (`<Mermaid>` or `<Wireframe title=...>`):** for backend flows, sequence diagrams, state machines, ER models, system architecture.
- **Both together:** the same plan can have wireframes for screens AND mermaid for backend flows. Use `<Callout>` to introduce each section.

## Anti-patterns

- ❌ Don't put real user data in a wireframe — defeats the purpose.
- ❌ Don't nest `<Screen>` inside another `<Screen>` (the frame chrome gets weird).
- ❌ Don't use `<Modal>` without a parent `<Screen>` — backdrop needs a positioned ancestor.
- ❌ Don't reach for inline styles in the .mdx when a component exists. If you need a new variant, add it to `components.js` first.

## See also

- `assets/components.js` — full source (look for the "WIREFRAME COMPONENTS" section)
- `assets/style.css` — `.wf-*` classes
- `../dynamic-plan/.dynamic-plan/test-auth-20260623/plan.mdx` — 9 wireframe examples
- `references/wireframe-kit.md` — old Mermaid-based kit (kept for backend flows)