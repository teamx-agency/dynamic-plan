#!/usr/bin/env node
// dynamic-plan CLI
// Usage:
//   npx dynamic-plan install                 # install as a skill in Claude/Codex/OpenCode/Hermes/Pi
//   npx dynamic-plan uninstall               # remove the skill
//   npx dynamic-plan compile <input.mdx> <output.html>
//   npx dynamic-plan serve <dir> [port]      # serve a compiled plan on http://127.0.0.1:<port>/
//   npx dynamic-plan info                    # show install paths and detected platforms

import { existsSync } from "node:fs";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { platform, homedir } from "node:os";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

const args = process.argv.slice(2);
const cmd = args[0];

function die(msg, code = 1) {
  console.error("\u001b[31m✗ " + msg + "\u001b[0m");
  process.exit(code);
}
function ok(msg) { console.log("\u001b[32m✓\u001b[0m " + msg); }
function info(msg) { console.log("\u001b[36m\u001b[0m " + msg); }

function runShell(script) {
  return new Promise((resolveP, rejectP) => {
    const child = spawn("bash", [script], { cwd: ROOT, stdio: "inherit" });
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
      commands: null, // Pi uses /skill:name syntax
      available: p !== "win32" || isWSL
    }
  };
}

const commands = {
  async install() {
    info("Installing dynamic-plan as a skill...");
    if (platform() === "win32" && !process.env.WSL_DISTRO_NAME) {
      die("Native Windows is not supported. Use WSL (Windows Subsystem for Linux) or run on macOS/Linux.");
    }
    try {
      await runShell(resolve(ROOT, "install.sh"));
      ok("Installation complete. Try: /dynamic-plan <your goal>");
    } catch (e) {
      die("Install failed: " + e.message);
    }
  },
  async uninstall() {
    info("Uninstalling dynamic-plan...");
    try {
      await runShell(resolve(ROOT, "uninstall.sh"));
      ok("Uninstalled.");
    } catch (e) {
      die("Uninstall failed: " + e.message);
    }
  },
  async compile() {
    const input = args[1];
    const output = args[2];
    if (!input || !output) {
      die("Usage: npx dynamic-plan compile <input.mdx> <output.html>");
    }
    if (!existsSync(input)) die("Input not found: " + input);
    info("Compiling " + input + " → " + output);
    try {
      await new Promise((res, rej) => {
        const c = spawn("node", [resolve(ROOT, "scripts/compile-mdx.mjs"), input, output], { stdio: "inherit" });
        c.on("exit", code => code === 0 ? res() : rej(new Error("compile exited " + code)));
      });
      ok("Done.");
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
      await runShell(resolve(ROOT, "scripts/serve-mdx.sh") + " " + resolve(dir) + " " + port);
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
    const write = args.includes("--write") ? "--write" : "";
    try {
      await new Promise((res, rej) => {
        const c = spawn("node", [resolve(ROOT, "scripts/changelog.mjs"), ...(write ? ["--write"] : [])], { stdio: "inherit" });
        c.on("exit", code => code === 0 ? res() : rej(new Error("changelog exited " + code)));
      });
    } catch (e) {
      die("Changelog generation failed: " + e.message);
    }
  },
  async release() {
    info("Running release…");
    try {
      await new Promise((res, rej) => {
        const rest = args.slice(1);
        const c = spawn("node", [resolve(ROOT, "scripts/release.mjs"), ...rest], { stdio: "inherit" });
        c.on("exit", code => code === 0 ? res() : rej(new Error("release exited " + code)));
      });
    } catch (e) {
      die("Release failed: " + e.message);
    }
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
  \u001b[36mchangelog\u001b[0m [--write]        Generate CHANGELOG.md from git history
  \u001b[36mrelease\u001b[0m <level> [msg]     Bump version + update CHANGELOG + tag + push
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
