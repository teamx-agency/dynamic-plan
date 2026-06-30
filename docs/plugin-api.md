# Plugin API

Add your own components or override defaults without forking the package.

There are **two ways** to add a component:

1. **`defineComponent()`** — the recommended path. Compose primitives
   declaratively, right inside your `.mdx`. No `<script>` injection, works at
   compile time, no `window` needed. Use this unless you need to override a
   built-in or reach for raw DOM.
2. **`window.DPLAN_PLUGINS`** — the low-level path. Inject a component map (or
   override an existing component) via a `<script>`. Use this to swap a built-in
   (e.g. a Tailwind `<Button>`) or build with raw DOM/`React.createElement`.

## `defineComponent()` (recommended)

```mdx
import { defineComponent, Box, Stack, Heading, Text, Button } from "./components.js";

export const Callout2 = defineComponent("Callout2", {
  props: { tone: { default: "info", oneOf: ["info", "good", "bad"] }, title: "" },
  render: (p) => Box({ p: "md", bg: "subtle", radius: "md", border: true, children:
    Stack({ gap: "sm", children: [
      Heading({ level: 4, tone: p.tone === "info" ? "accent" : p.tone, children: p.title }),
      Text({ size: "sm", children: p.children })
    ]})
  })
});

<Callout2 tone="good" title="Done">All checks passed.</Callout2>
```

- `props` accepts `key → default` or `key → { default, required, type, oneOf, coerce }`.
  Validation is **advisory** — it `console.warn`s, never throws (a thrown error
  in an MDX component blanks the page; there's no error boundary at `file://`).
- Array/object defaults are **cloned per render**, so instances never share state.
- Undeclared props (`className`, `style`, `onClick`, `data-*`, `children`) pass through.
- `render(props)` calls primitives as functions; use `el(tag, props, …kids)` for raw HTML tags.

### Registration & precedence

`defineComponent` writes into a module-level `DEFINED_COMPONENTS` registry that
`resolveComponents()` merges **between** the built-ins and `DPLAN_PLUGINS`:

```
built-ins  →  DEFINED_COMPONENTS  →  DPLAN_PLUGINS   (later wins)
```

So `DPLAN_PLUGINS` can still override a `defineComponent` component (and any
built-in), preserving the contract below. Components defined at module load
(`export const X = defineComponent(...)`) are available without any `window`
dependency, which is why they also work during the Node compile pass.

## How it works

The `dynamic-plan` skill loads its components from `./components.js`. Before
rendering, it calls `resolveComponents()` which:

1. Starts with the built-in component map (`PlanHeader`, `Button`, etc.).
2. Looks at `window.DPLAN_PLUGINS` — an array of component maps.
3. Merges every plugin's components **on top** of the defaults (later wins).

So a plugin can **add new components** (the defaults still work) or **override
existing ones** (e.g. swap `<Button>` for a custom one).

## Plugin format

A plugin is just a JS object whose keys are component names. Drop it into
`window.DPLAN_PLUGINS` before the React render happens.

```html
<script type="module">
  window.DPLAN_PLUGINS = window.DPLAN_PLUGINS || [];
  window.DPLAN_PLUGINS.push({
    // Custom components — must use React.createElement-style API (or React 18 JSX)
    BrandLogo: ({ name }) => h('div', { className: 'my-logo' }, name),

    // Override the default <Button> with a fancier version
    Button: ({ variant, size, fullWidth, disabled, children }) => {
      var className = 'my-btn my-btn-' + (variant || 'secondary');
      return h('button', { className, disabled }, children);
    },
  });
</script>
```

Then in your plan .mdx, import the new component name from `./components.js`:

```mdx
import { PlanHeader, BrandLogo, Button } from "./components.js";

<PlanHeader />
<BrandLogo name="Acme Inc" />
<Button variant="primary">Custom button</Button>
```

The merge order is **defaults → plugin[0] → plugin[1] → …**, so later plugins win.
Names that don't appear in any plugin fall through to the defaults.

## Real example: Notion-style BrandLogo plugin

Save as `notion-logo-plugin.js`, then inject into your `.html` after the
compiled MDX bundle but before the React render call. The easiest path:

```bash
# 1. Compile your plan
npx dynamic-plan compile my-plan.mdx my-plan.html

# 2. Edit my-plan.html: add this <script> right after the components import
#    (search for "// components imported" or near the import statements)
cat >> my-plan.html <<'EOF'
<script>
  window.DPLAN_PLUGINS = [{
    BrandLogo: ({ name }) => {
      const el = document.createElement('div');
      el.style.cssText = 'font-weight:700;font-size:18px;color:#37352f;display:inline-flex;align-items:center;gap:6px;';
      el.innerHTML = '<span style="background:#2383e2;color:white;width:24px;height:24px;border-radius:4px;display:inline-flex;align-items:center;justify-content:center;">N</span> ' + name;
      return el;
    }
  }];
</script>
EOF
```

Then `<BrandLogo name="Notion" />` will render with the Notion "N" badge.

## Real example: tailwind-style Button override

```html
<script>
  window.DPLAN_PLUGINS = [{
    Button: ({ variant, size, fullWidth, disabled, children }) => {
      const v = variant || 'primary';
      const s = size === 'sm' ? 'px-2 py-1 text-xs' : size === 'lg' ? 'px-5 py-3 text-base' : 'px-3 py-2 text-sm';
      const styles = {
        primary:   'bg-indigo-600 text-white hover:bg-indigo-700',
        secondary: 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50',
        ghost:     'text-indigo-600 hover:bg-indigo-50',
        destructive: 'bg-red-50 text-red-600 border border-red-200',
        social:    'bg-white text-gray-700 border border-gray-300 w-full justify-center',
      };
      const el = document.createElement('button');
      el.className = (styles[v] || styles.primary) + ' ' + s + ' rounded-md font-medium transition-colors';
      if (fullWidth) el.className += ' w-full';
      if (disabled) el.setAttribute('disabled', '');
      el.textContent = children;
      return el;
    }
  }];
</script>
```

## API reference

`window.DPLAN_PLUGINS` is an **array** of component maps. Each map's keys must
match a name used in your `.mdx` (either a built-in or a new one).

Component props are passed through from the `.mdx` exactly as written. Your
plugin receives the same props the default component would.

For React-style rendering, your component can return a React element
(`React.createElement(...)` or the result of a JSX expression). The merge
mechanism uses the built-in `react/jsx-runtime` symbols, so the React
internals (hooks like `useState`, `useEffect`) work normally.

## Limitations

- Plugins run in the user's browser; they have access to `window`, `localStorage`,
  `fetch`, etc. They do **not** have access to Node APIs.
- Adding many plugins makes the bundle larger. Aim for < 5 plugins per page.
- Plugin code is **not sandboxed**. Trust your plugin sources.
- Plugins must be loaded **before** `MDXContent` renders. If loaded
  asynchronously after, the components map is captured at render time and
  late plugins won't apply.

## Versioning

Plugins target the component API of the version they were written against.
If a future major release renames or restructures components, plugins may
need updates. The skill's `version` and `info` commands show the installed
version; pin plugins against a known-good version range.
