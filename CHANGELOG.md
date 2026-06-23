# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog 1.1.0](https://keepachangelog.com/) and this project
adheres to [Semantic Versioning](https://semver.org/) and
[Conventional Commits](https://www.conventionalcommits.org/).


## [Unreleased]

### Planned

- Toggle "wireframe ↔ high-fidelity" view (real colors on demand)
- Mobile-first preset for the `<Screen>` frame
- Export decisions as `.json` file (not just clipboard)
- Drag-to-reorder steps (the `⋮⋮` handles are visual only today)
- Persistent per-step notes (in addition to the global form)
- Plugin API for adding your own wireframe components

## [1.0.0] - 2026-06-23

### Added

- **`/dynamic-plan <goal>` slash command** for Claude Code, Codex, OpenCode, Hermes, and Pi
- **CLI tool** (`npx dynamic-plan <install|compile|serve|info|version|help>`) for non-agent use
- **Cross-platform installer** (`install.sh`) — Linux, macOS, and WSL
- **30+ Figkit-style wireframe components** rendered as real HTML:
  - Layout: `<Screen>`, `<ScreenFrame>`, `<TopNav>`, `<SideNav>`, `<Layout>`, `<Breadcrumb>`, `<Tabs>`
  - Buttons: `<Button>` (5 variants × 3 sizes)
  - Forms: `<Field>`, `<Input>`, `<Select>`, `<Textarea>`, `<Checkbox>`, `<Radio>`, `<Toggle>`
  - Display: `<Card>`, `<Modal>`, `<Toast>`, `<ToastStack>`, `<AlertBanner>`, `<Table>`, `<Avatar>`, `<Badge>`, `<Stat>`
  - Helpers: `<Row>`, `<Col>`, `<Grid>`, `<Divider>`, `<TextDivider>`
- **Notion-inspired chrome**: sidebar with chevrons, hover-reveal controls, status pills, callout blocks
- **Mermaid 10 integration** for backend/architecture diagrams
- **DecisionForm** with radio cards, text notes, and one-click copy-back
- **localStorage persistence** of progress and decisions
- **Light/dark mode** via `prefers-color-scheme`
- **Self-contained output** — opens with `file://`, no build step needed
- **4 reference examples** in `assets/examples/` (login, settings, admin, full OAuth)
- **CHANGELOG auto-generation** from conventional commits (`scripts/changelog.mjs`)
- **Smoke tests** (`scripts/test-compile.mjs`) — 20 checks

### Architecture

- MDX 3 + React 18 ESM (via esm.sh CDN, no bundler)
- `@mdx-js/mdx` for `.mdx` → ESM program compilation
- Standalone `.html` output, ~70 KB total
- 5 platform install paths synced from one master copy at `~/.agents/skills/dynamic-plan/`

[Unreleased]: https://github.com/teamx-agency/dynamic-plan/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/teamx-agency/dynamic-plan/releases/tag/v1.0.0
## [1.1.0] - Tue Jun 23 09:33:29 2026 -0600

### Added

- initial public release of dynamic-plan skill (3c1cf3d)
