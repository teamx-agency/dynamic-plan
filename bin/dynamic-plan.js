#!/usr/bin/env node
// dynamic-plan CLI
// Usage:
//   npx dynamic-plan install                 # install as a skill in Claude/Codex/OpenCode/Hermes/Pi
//   npx dynamic-plan uninstall               # remove the skill
//   npx dynamic-plan compile <input.mdx> <output.html>
//   npx dynamic-plan serve <dir> [port]      # serve a compiled plan on http://127.0.0.1:<port>/
//   npx dynamic-plan info                    # show install paths and detected platforms

import { existsSync, writeFileSync, mkdirSync, rmSync, copyFileSync, chmodSync, cpSync } from "node:fs";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { platform, homedir } from "node:os";

const __dirname = dirname(fileURLToPath(import.meta.url));
// ROOT is the package root (where bin/, scripts/, etc. live).
// When installed via npm, this is something like
// /Users/you/.npm/_npx/.../node_modules/dynamic-plan
const ROOT = resolve(__dirname, "..");

const args = process.argv.slice(2);
const cmd = args[0];

function die(msg, code = 1) {
  console.error("\u001b[31m✗ " + msg + "\u001b[0m");
  process.exit(code);
}
function ok(msg) { console.log("\u001b[32m✓\u001b[0m " + msg); }
function info(msg) { console.log("\u001b[36m\u001b[0m " + msg); }

function runShell(script, args = []) {
  return new Promise((resolveP, rejectP) => {
    const child = spawn(script, args, { cwd: ROOT, stdio: "inherit" });
    child.on("exit", code => code === 0 ? resolveP() : rejectP(new Error(script + " exited " + code)));
  });
}

function platformLabel() {
  const p = platform();
  return p === "darwin" ? "macOS" : p === "linux" ? "Linux" : p === "win32" ? "Windows" : p;
}

function detectPlatforms() {
  const p = platform();
  const isWSL = process.env.WSL_DISTRO_NAME !== undefined;
  return {
    "Claude Code": {
      path: `${homedir()}/.claude/skills/dynamic-plan`,
      commands: `${homedir()}/.claude/commands/dynamic-plan.md`,
      available: p !== "win32" || isWSL
    },
    "Codex": {
      path: `${homedir()}/.codex/skills/dynamic-plan`,
      commands: `${homedir()}/.codex/commands/dynamic-plan.md`,
      available: p !== "win32" || isWSL
    },
    "Hermes": {
      path: `${homedir()}/.hermes/skills/dynamic-plan`,
      commands: `${homedir()}/.hermes/commands/dynamic-plan.md`,
      available: p !== "win32" || isWSL
    },
    "OpenCode": {
      path: `${homedir()}/.config/opencode/command/dynamic-plan.md`,
      commands: `${homedir()}/.config/opencode/command/dynamic-plan.md`,
      // OpenCode auto-loads SKILL.md from ~/.claude/skills/ and ~/.agents/skills/
      available: true
    },
    "Pi": {
      path: `${homedir()}/.pi/agent/skills/dynamic-plan`,
      commands: null,
      available: p !== "win32" || isWSL
    }
  };
}

// ------------------------------------------------------------------
// Inline install/uninstall — they don't depend on install.sh being present
// (which is only true when installed from a git clone, not from npm).
// ------------------------------------------------------------------

const SKILL_MD = `# dynamic-plan

> Generate interactive implementation plans with Figkit-style wireframes,
> Mermaid diagrams, and decision forms — directly inside your AI coding agent.

## When to use this skill

Trigger when the user asks to plan a feature, refactor, migration, or any
non-trivial change AND wants to review the plan visually before implementation.

Trigger phrases: "plan this", "interactive plan", "/dynamic-plan <goal>",
"plan with wireframes", "plan with decisions", "wireframe this", "show me
the screens first".

## What to produce

A single \`.mdx\` file in \`.dynamic-plan/<slug>-<timestamp>/plan.mdx\` that compiles
to a self-contained HTML the user can open in a browser. See
\`~/.agents/skills/dynamic-plan/SKILL.md\` (the canonical spec) for the full
contract and \`~/.agents/skills/dynamic-plan/references/wireframe-components.md\`
for the Figkit-style component library.

## Quick recipe

1. Parse the goal + detect stack from package.json / composer.json / pyproject.toml
2. Generate the \`.mdx\` plan file
3. Compile to \`.html\` via \`node ~/.agents/skills/dynamic-plan/scripts/compile-mdx.mjs <in.mdx> <out.html>\`
4. Serve with \`bash ~/.agents/skills/dynamic-plan/scripts/serve-mdx.sh <dir> [port]\`
5. Print URL + summary (goal, step count, decision count, URL)
`;

const COMMAND_MD_CLAUDE = `---
description: Generate an interactive .mdx plan (Figkit-style wireframes, Mermaid diagrams, decision forms, copy-back) for the given goal. Opens in the browser.
category: planning
---

# /dynamic-plan

Invoke the dynamic-plan skill. Treat the rest of the user input as the goal
and follow the skill's workflow exactly:

1. Parse goal + detect stack.
2. Generate the .mdx plan in \`.dynamic-plan/<slug>-<timestamp>/plan.mdx\`.
3. Compile to \`.html\` via \`node ~/.agents/skills/dynamic-plan/scripts/compile-mdx.mjs\`.
4. Serve with \`bash ~/.agents/skills/dynamic-plan/scripts/serve-mdx.sh\`.
5. Print URL + summary.

See \`~/.agents/skills/dynamic-plan/SKILL.md\` for the full contract and
\`~/.agents/skills/dynamic-plan/references/wireframe-components.md\` for the
Figkit-style component library.
`;

const COMMAND_MD_CODEX = `---
description: Generate an interactive .mdx plan (Figkit-style wireframes, Mermaid diagrams, decision forms, copy-back) for the given goal. Opens in the browser.
---

# /dynamic-plan

Invoke the dynamic-plan skill. Treat the rest of the user input as the goal
and follow the skill's workflow in \`~/.agents/skills/dynamic-plan/SKILL.md\`:

1. Parse goal + detect stack.
2. Generate the .mdx plan in \`.dynamic-plan/<slug>-<timestamp>/plan.mdx\`.
3. Compile to \`.html\` via \`node ~/.agents/skills/dynamic-plan/scripts/compile-mdx.mjs\`.
4. Serve with \`bash ~/.agents/skills/dynamic-plan/scripts/serve-mdx.sh\`.
5. Print URL + summary.
`;

const COMMAND_MD_HERMES = `---
description: Generate an interactive .mdx plan (Figkit-style wireframes, Mermaid diagrams, decision forms, copy-back) for the given goal. Opens in the browser.
---

# /dynamic-plan

Invoke the dynamic-plan skill (see \`~/.agents/skills/dynamic-plan/SKILL.md\`):

1. Parse goal + detect stack.
2. Generate the .mdx plan in \`.dynamic-plan/<slug>-<timestamp>/plan.mdx\`.
3. Compile to \`.html\` via \`node ~/.agents/skills/dynamic-plan/scripts/compile-mdx.mjs\`.
4. Serve with \`bash ~/.agents/skills/dynamic-plan/scripts/serve-mdx.sh\`.
5. Print URL + summary.
`;

const COMMAND_MD_OPENCODE = `---
description: Generate an interactive .mdx plan (Figkit-style wireframes, Mermaid diagrams, decision forms, copy-back) for the given goal. Opens in the browser.
---

# /dynamic-plan

You are invoking the dynamic-plan skill. The user's goal is: $ARGUMENTS

Follow the workflow in \`~/.agents/skills/dynamic-plan/SKILL.md\`:

1. Parse goal + detect stack.
2. Generate the .mdx plan in \`.dynamic-plan/<slug>-<timestamp>/plan.mdx\`.
3. Compile to \`.html\` via \`node ~/.agents/skills/dynamic-plan/scripts/compile-mdx.mjs\`.
4. Serve with \`bash ~/.agents/skills/dynamic-plan/scripts/serve-mdx.sh\`.
5. Print URL + summary.
`;

function ensureDir(p) {
  if (!existsSync(p)) mkdirSync(p, { recursive: true });
}

function rmrf(p) {
  if (existsSync(p)) rmSync(p, { recursive: true, force: true });
}

async function inlineInstall() {
  if (platform() === "win32" && !process.env.WSL_DISTRO_NAME) {
    die("Native Windows is not supported. Use WSL or run on macOS/Linux.");
  }
  info("Detecting platform...");
  console.log("  " + platformLabel() + (process.env.WSL_DISTRO_NAME ? " (WSL)" : ""));
  info("Master copy: " + ROOT);

  // 1. Copy package contents to ~/.agents/skills/dynamic-plan (master)
  const master = `${homedir()}/.agents/skills/dynamic-plan`;
  ensureDir(`${homedir()}/.agents/skills`);
  info("Installing to master copy: " + master);
  rmrf(master);
  // cpSync is recursive + cross-platform. Node 16.7+.
  cpSync(ROOT, master, { recursive: true, dereference: true, verbatimSymlinks: false });
  ok("Master copy installed");

  // 2. Mirror to platform-specific skill folders
  const skills = [
    `${homedir()}/.claude/skills/dynamic-plan`,
    `${homedir()}/.codex/skills/dynamic-plan`,
    `${homedir()}/.hermes/skills/dynamic-plan`,
    `${homedir()}/.pi/agent/skills/dynamic-plan`
  ];
  for (const dest of skills) {
    ensureDir(parentDir(dest));
    rmrf(dest);
    cpSync(ROOT, dest, { recursive: true, dereference: true, verbatimSymlinks: false });
    ok(dest);
  }

  // 3. Slash command files
  ensureDir(`${homedir()}/.claude/commands`);
  ensureDir(`${homedir()}/.codex/commands`);
  ensureDir(`${homedir()}/.hermes/commands`);
  ensureDir(`${homedir()}/.config/opencode/command`);
  writeFileSync(`${homedir()}/.claude/commands/dynamic-plan.md`, COMMAND_MD_CLAUDE);
  ok(`${homedir()}/.claude/commands/dynamic-plan.md`);
  writeFileSync(`${homedir()}/.codex/commands/dynamic-plan.md`, COMMAND_MD_CODEX);
  ok(`${homedir()}/.codex/commands/dynamic-plan.md`);
  writeFileSync(`${homedir()}/.hermes/commands/dynamic-plan.md`, COMMAND_MD_HERMES);
  ok(`${homedir()}/.hermes/commands/dynamic-plan.md`);
  writeFileSync(`${homedir()}/.config/opencode/command/dynamic-plan.md`, COMMAND_MD_OPENCODE);
  ok(`${homedir()}/.config/opencode/command/dynamic-plan.md`);

  // 4. Make shell scripts executable
  try {
    chmodSync(`${master}/scripts/serve-mdx.sh`, 0o755);
    chmodSync(`${master}/scripts/compile-mdx.mjs`, 0o755);
  } catch (e) { /* best-effort */ }

  console.log("");
  console.log("\u001b[32m✓ dynamic-plan installed for Claude Code, Codex, OpenCode, Hermes, Pi\u001b[0m");
  console.log("");
  console.log("Try it:");
  console.log("  cd ~/your-project");
  console.log("  /dynamic-plan <your goal>");
}

async function inlineUninstall() {
  info("Uninstalling dynamic-plan from all platforms...");
  rmrf(`${homedir()}/.claude/skills/dynamic-plan`);
  rmrf(`${homedir()}/.codex/skills/dynamic-plan`);
  rmrf(`${homedir()}/.hermes/skills/dynamic-plan`);
  rmrf(`${homedir()}/.pi/agent/skills/dynamic-plan`);
  rmrf(`${homedir()}/.agents/skills/dynamic-plan`);
  try { rmSync(`${homedir()}/.claude/commands/dynamic-plan.md`, { force: true }); } catch {}
  try { rmSync(`${homedir()}/.codex/commands/dynamic-plan.md`, { force: true }); } catch {}
  try { rmSync(`${homedir()}/.hermes/commands/dynamic-plan.md`, { force: true }); } catch {}
  try { rmSync(`${homedir()}/.config/opencode/command/dynamic-plan.md`, { force: true }); } catch {}
  ok("dynamic-plan removed from Claude Code, Codex, OpenCode, Hermes, and Pi.");
}

function parentDir(p) {
  const i = p.lastIndexOf("/");
  return i === -1 ? "." : p.slice(0, i);
}

// Install @mdx-js/mdx once per ROOT if scripts/node_modules/ is missing.
// This makes `npx dynamic-plan compile <x> <y>` work out of the box on
// first use, without requiring the user to `npm install` manually.
let compilerDepsReady = null;
async function ensureCompilerDeps() {
  if (compilerDepsReady) return compilerDepsReady;
  const nm = resolve(ROOT, "scripts/node_modules/@mdx-js/mdx");
  if (existsSync(nm)) {
    compilerDepsReady = Promise.resolve();
    return compilerDepsReady;
  }
  info("Installing compiler dependencies (one-time, ~3 MB)...");
  compilerDepsReady = new Promise((resolveP, rejectP) => {
    const c = spawn("npm", ["install", "--no-audit", "--no-fund", "--silent"], {
      cwd: resolve(ROOT, "scripts"),
      stdio: "inherit"
    });
    c.on("exit", code => code === 0 ? resolveP() : rejectP(new Error("npm install exited " + code)));
  }).catch(e => { compilerDepsReady = null; throw e; });
  return compilerDepsReady;
}

const commands = {
  async install() {
    await inlineInstall();
  },
  async uninstall() {
    await inlineUninstall();
  },
  async compile() {
    const input = args[1];
    const output = args[2];
    if (!input || !output) {
      die("Usage: npx dynamic-plan compile <input.mdx> <output.html>");
    }
    if (!existsSync(input)) die("Input not found: " + input);
    info("Compiling " + input + " → " + output);
    // Auto-install the compiler dep on first use so users don't have to.
    const compilerScript = resolve(ROOT, "scripts/compile-mdx.mjs");
    await ensureCompilerDeps();
    try {
      await new Promise((res, rej) => {
        const c = spawn("node", [compilerScript, input, output], { stdio: "inherit" });
        c.on("exit", code => code === 0 ? res() : rej(new Error("compile exited " + code)));
      });
      ok("Done. Open: file://" + output);
    } catch (e) {
      die("Compile failed: " + e.message);
    }
  },
  async serve() {
    const dir = args[1];
    const port = args[2] || "8765";
    if (!dir) die("Usage: npx dynamic-plan serve <dir> [port]");
    if (!existsSync(dir)) die("Directory not found: " + dir);
    info("Serving " + dir + " on http://127.0.0.1:" + port + "/");
    try {
      await runShell(resolve(ROOT, "scripts/serve-mdx.sh"), [resolve(dir), port]);
    } catch (e) {
      die("Serve failed: " + e.message);
    }
  },
  async info() {
    console.log("");
    info("Platform: " + platformLabel() + (process.env.WSL_DISTRO_NAME ? " (WSL)" : ""));
    info("Master copy: " + ROOT);
    info("Detection of installed skill locations:");
    console.log("");
    const paths = detectPlatforms();
    for (const [name, info2] of Object.entries(paths)) {
      const installed = existsSync(info2.path) || (info2.commands && existsSync(info2.commands));
      const sym = installed ? "✓" : (info2.available ? "○" : "✗");
      const color = installed ? "\u001b[32m" : info2.available ? "\u001b[33m" : "\u001b[31m";
      console.log(`  ${color}${sym}\u001b[0m  ${name.padEnd(15)} ${info2.path}`);
    }
    console.log("");
    info("Run \u001b[1mnpx dynamic-plan install\u001b[0m to install on all supported platforms.");
  },
  async version() {
    const pkg = await import(resolve(ROOT, "package.json"), { with: { type: "json" } });
    console.log("dynamic-plan v" + pkg.default.version);
  },
  async changelog() {
    info("Generating CHANGELOG from git history…");
    info("(changelog command requires the git repo, not just the npm tarball)");
    try {
      await new Promise((res, rej) => {
        const write = args.includes("--write") ? ["--write"] : [];
        const c = spawn("node", [resolve(ROOT, "scripts/changelog.mjs"), ...write], { stdio: "inherit" });
        c.on("exit", code => code === 0 ? res() : rej(new Error("changelog exited " + code)));
      });
    } catch (e) {
      die("Changelog failed: " + e.message);
    }
  },
  async release() {
    die("release is a maintainer-only command — run from the git clone, not from npm.");
  },
  async help() {
    console.log(`
\u001b[1mdynamic-plan\u001b[0m — interactive .mdx plans with Figkit-style wireframes

\u001b[1mUsage:\u001b[0m
  npx dynamic-plan \u001b[36m<command>\u001b[0m [options]

\u001b[1mCommands:\u001b[0m
  \u001b[36minstall\u001b[0m                   Install the skill for Claude Code / Codex / OpenCode / Hermes / Pi
  \u001b[36muninstall\u001b[0m                 Remove the skill from all platforms
  \u001b[36mcompile\u001b[0m <in.mdx> <out.html>  Compile a plan to standalone HTML
  \u001b[36mserve\u001b[0m <dir> [port]         Serve a compiled plan in the browser (default port 8765)
  \u001b[36minfo\u001b[0m                     Show install paths and detected platforms
  \u001b[36mversion\u001b[0m                  Print the version
  \u001b[36mhelp\u001b[0m                     Show this message

\u001b[1mExamples:\u001b[0m
  npx dynamic-plan install
  npx dynamic-plan compile my-plan.mdx my-plan.html
  npx dynamic-plan serve ./my-plan-dir
`);
  }
};

(async () => {
  if (!cmd || cmd === "help" || cmd === "--help" || cmd === "-h") {
    return commands.help();
  }
  if (cmd === "version" || cmd === "--version" || cmd === "-v") {
    return commands.version();
  }
  const fn = commands[cmd];
  if (!fn) {
    die("Unknown command: " + cmd + "\nRun \u001b[1mnpx dynamic-plan help\u001b[0m for usage.");
  }
  await fn();
})();
