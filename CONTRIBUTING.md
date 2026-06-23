# Contributing to dynamic-plan

Thanks for your interest in improving the skill! This guide will get you from `git clone` to a merged PR in under an hour.

## Code of conduct

Be kind, be constructive, assume good intent. We're all trying to make plans easier to read.

## Reporting bugs

Open an issue with:
- The exact command you ran
- The OS and Node version (`node --version`)
- The agent you're using (Claude Code, Codex, etc.) and its version if known
- Screenshots of the rendered output (huge help)
- The `.mdx` source if you can share it

## Suggesting features

Before opening an issue, check the [Roadmap](../README.md#roadmap) — your idea might already be queued. If not, open an issue with the `enhancement` label describing:
- The problem you're trying to solve
- The user-facing behavior you'd want
- (Optional) A sketch of the API

## Submitting changes

### 1. Fork and branch

```bash
git clone https://github.com/<you>/dynamic-plan.git
cd dynamic-plan
git checkout -b feat/short-descriptive-name
```

### 2. Make your change

**Where things live:**

| You want to... | Edit |
|-----------------|------|
| Add a new wireframe component | `assets/components.js` + `references/wireframe-components.md` + an example in `assets/examples/` |
| Add a new Mermaid snippet | `references/mermaid-snippets.md` |
| Change the visual style | `assets/style.css` |
| Change the skill contract | `SKILL.md` |
| Add a CLI subcommand | `bin/dynamic-plan.js` |
| Fix a compiler bug | `scripts/compile-mdx.mjs` |
| Add a reference example | `assets/examples/` |

**Conventions:**

- Components are plain ESM JavaScript. No build step. Use only the imports already in `components.js` (`react/jsx-runtime` + hooks).
- Wireframe styling uses the `.wf-*` class prefix. Reuse existing classes when possible; only add a new one if no existing class fits.
- Component names are PascalCase (`<PlanStep>`, `<ScreenFrame>`). They go in `assets/components.js` and are exported individually + added to the `default` export at the bottom.
- No new runtime dependencies unless absolutely required. We want this to stay `npx`-friendly.

### 3. Test

```bash
# Syntax check the components
node --check assets/components.js
node --check bin/dynamic-plan.js
node --check scripts/compile-mdx.mjs

# Compile every example and confirm no errors
node scripts/compile-mdx.mjs assets/examples/login-flow.mdx /tmp/login.html
node scripts/compile-mdx.mjs assets/examples/settings-page.mdx /tmp/settings.html
node scripts/compile-mdx.mjs assets/examples/admin-dashboard.mdx /tmp/admin.html

# Serve and visually inspect each
bash scripts/serve-mdx.sh /tmp 8765
# open http://127.0.0.1:8765/login.html
# ... etc
```

### 4. Document

- New component → add a row in the table in `references/wireframe-components.md` with at least one example
- New visual style → add the new `.wf-*` class to `assets/style.css` with a comment explaining when to use it
- New example → add a `.mdx` file in `assets/examples/` and link it from the README

### 5. PR checklist

- [ ] Branch is up to date with `main`
- [ ] All syntax checks pass
- [ ] Examples still compile
- [ ] Docs are updated
- [ ] If you added a new component, you added an example using it
- [ ] PR description includes before/after screenshots if it changes visuals

## Style

- **No `npm install` required to use the skill** at runtime. The `@mdx-js/mdx` dep is only needed by the **compiler**, not by the rendered output.
- **Self-contained HTML** is non-negotiable. The output must work with `file://` and offline.
- **Light + dark mode** for every new visual style.
- **No build step** in the user's flow. `npx dynamic-plan compile` produces an HTML you can immediately open.

## Releasing

Maintainers will:
1. Bump the version in `package.json` (semver: bugfix = patch, new component = minor, breaking = major)
2. Update the README's "Roadmap" section (move completed items)
3. Tag and publish to npm
4. GitHub release with changelog

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](../LICENSE).
