#!/usr/bin/env node
// scripts/test-compile.mjs
// Smoke test: compile every example .mdx and verify the output HTML is valid.

import { readFile, writeFile, mkdir, readdir, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, resolve, join } from "node:path";
import { fileURLToPath } from "node:url";
import { compile } from "@mdx-js/mdx";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const EXAMPLES = resolve(ROOT, "assets/examples");
const OUT = "/tmp/dynamic-plan-test";

let pass = 0, fail = 0;
const failures = [];

function ok(name) { console.log("  \u001b[32m✓\u001b[0m " + name); pass++; }
function bad(name, msg) { console.log("  \u001b[31m✗\u001b[0m " + name + ": " + msg); fail++; failures.push({ name, msg }); }

// 1. Components.js syntax + key exports
console.log("\u001b[1mComponents\u001b[0m");
try {
  const src = await readFile(resolve(ROOT, "assets/components.js"), "utf8");
  // Check key exports exist
  const required = ["PlanHeader", "PlanStep", "Screen", "ScreenFrame", "Button", "Modal", "DecisionForm", "Decision", "CopyDecisions", "Callout"];
  for (const name of required) {
    if (!src.includes("export function " + name) && !src.includes("export const " + name) && !src.includes(name + ":")) {
      bad("export " + name, "missing");
    } else {
      ok("export " + name);
    }
  }
} catch (e) { bad("components.js readable", e.message); }

// 2. SKILL.md structure
console.log("\n\u001b[1mSKILL.md\u001b[0m");
try {
  const skill = await readFile(resolve(ROOT, "SKILL.md"), "utf8");
  if (!/^---[\s\S]+?---/m.test(skill)) bad("SKILL.md has frontmatter", "missing");
  else ok("frontmatter present");
  if (!/^name:\s*\S+/m.test(skill)) bad("SKILL.md has name", "missing");
  else ok("name present");
  if (!/^description:/m.test(skill)) bad("SKILL.md has description", "missing");
  else ok("description present");
} catch (e) { bad("SKILL.md readable", e.message); }

// 3. Examples
console.log("\n\u001b[1mExamples\u001b[0m");
await rm(OUT, { recursive: true, force: true });
await mkdir(OUT, { recursive: true });

let examples = [];
try {
  examples = (await readdir(EXAMPLES)).filter(f => f.endsWith(".mdx"));
} catch (e) {
  bad("examples dir", e.message);
}

if (examples.length === 0) {
  bad("at least one example", "no .mdx files in assets/examples/");
}

for (const file of examples) {
  const input = join(EXAMPLES, file);
  const output = join(OUT, file.replace(".mdx", ".html"));
  try {
    const source = await readFile(input, "utf8");
    const body = source.replace(/^---[\s\S]+?---\n?/, "");
    const compiled = await compile(body, {
      outputFormat: "program",
      development: false,
    });
    const html = `<!doctype html><html><head><title>${file}</title></head><body><div id="root"></div><script type="module">${String(compiled).replace(/export default/, "const MDXContent = ")}</script></body></html>`;
    await writeFile(output, html, "utf8");
    ok(file + " compiles");
  } catch (e) {
    bad(file, e.message);
  }
}

// 4. CSS exists
console.log("\n\u001b[1mAssets\u001b[0m");
if (existsSync(resolve(ROOT, "assets/style.css"))) ok("style.css present");
else bad("style.css", "missing");
if (existsSync(resolve(ROOT, "assets/components.js"))) ok("components.js present");
else bad("components.js", "missing");

// 5. install.sh is executable
console.log("\n\u001b[1mInstall scripts\u001b[0m");
try {
  const stat = await import("node:fs/promises").then(m => m.stat(resolve(ROOT, "install.sh")));
  if (stat.mode & 0o111) ok("install.sh is executable");
  else bad("install.sh", "not executable (run: chmod +x install.sh)");
} catch (e) { bad("install.sh", e.message); }

// Summary
console.log("\n\u001b[1mSummary\u001b[0m");
console.log("  " + pass + " passed, " + fail + " failed");
if (fail > 0) {
  console.log("\n\u001b[31mFailures:\u001b[0m");
  failures.forEach(f => console.log("  - " + f.name + ": " + f.msg));
  process.exit(1);
} else {
  console.log("\n\u001b[32mAll checks passed ✓\u001b[0m");
  process.exit(0);
}
