#!/usr/bin/env node
// scripts/release.mjs
// End-to-end release automation for dynamic-plan.
//
// Usage:
//   node scripts/release.mjs patch "fix: handle empty <DecisionForm> gracefully"
//   node scripts/release.mjs minor "feat: add mobile screen preset"
//   node scripts/release.mjs major "feat!: rename <Card> props for v2"
//   node scripts/release.mjs 1.2.0                # explicit version
//
// What it does:
//   1. Bumps version in package.json
//   2. Runs scripts/changelog.mjs --write to update CHANGELOG.md
//   3. (Optional) git add + commit + tag + push
//   4. Prints next steps for GitHub release + npm publish

import { readFile, writeFile } from "node:fs/promises";
import { execSync } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

const args = process.argv.slice(2);
const level = args[0]; // "patch" | "minor" | "major" | "x.y.z"
const reason = args[1] || `chore(release): publish v${level}`;

function run(cmd, opts = {}) {
  try {
    return execSync(cmd, { cwd: ROOT, encoding: "utf8", ...opts }).trim();
  } catch (e) {
    if (opts.allowFail) return null;
    throw e;
  }
}

function assertCleanTree() {
  const status = run("git status --porcelain", { allowFail: true });
  if (status && status.length > 0) {
    console.error("✗ Working tree is dirty. Commit or stash changes first:\n");
    console.error(status);
    process.exit(1);
  }
}

function isExplicitVersion(s) {
  return /^\d+\.\d+\.\d+(-[\w.]+)?$/.test(s);
}

function bumpVersion(current, level) {
  const m = current.replace(/-\w+(\.\d+)?$/, "").split(".").map(Number);
  while (m.length < 3) m.push(0);
  let [maj, min, pat] = m;
  if (level === "major") return [maj + 1, 0, 0].join(".");
  if (level === "minor") return [maj, min + 1, 0].join(".");
  if (level === "patch") return [maj, min, pat + 1].join(".");
  if (isExplicitVersion(level)) return level;
  throw new Error("Invalid bump level: " + level);
}

// ---------- main ----------
if (!level) {
  console.error("Usage:");
  console.error("  node scripts/release.mjs patch [commit message]");
  console.error("  node scripts/release.mjs minor [commit message]");
  console.error("  node scripts/release.mjs major [commit message]");
  console.error("  node scripts/release.mjs 1.2.3 [commit message]");
  process.exit(1);
}

console.log("▶ dynamic-plan release");
console.log("");

const pkgPath = resolve(ROOT, "package.json");
const pkg = JSON.parse(await readFile(pkgPath, "utf8"));
const oldVersion = pkg.version;
const newVersion = bumpVersion(oldVersion, level);
console.log(`  ${oldVersion} → ${newVersion}  (${level})`);
console.log("");

// 1. Bump
pkg.version = newVersion;
await writeFile(pkgPath, JSON.stringify(pkg, null, 2) + "\n", "utf8");
console.log("✓ package.json updated");

// 2. Update CHANGELOG
run(`node scripts/changelog.mjs --version ${newVersion} --write`, { stdio: "inherit" });

// 3. Stage + commit + tag
const treeDirty = run("git status --porcelain", { allowFail: true });
if (treeDirty && treeDirty.length > 0) {
  const commitMsg = reason.includes(":") ? reason : `chore(release): publish v${newVersion}`;
  run("git add package.json CHANGELOG.md", { stdio: "inherit" });
  run(`git commit -m "${commitMsg.replace(/"/g, '\\"')}"`, { stdio: "inherit" });
  run(`git tag -a v${newVersion} -m "v${newVersion}"`, { stdio: "inherit" });
  console.log(`✓ Committed and tagged v${newVersion}`);
} else {
  console.log("  (no changes to commit — already on the right version?)");
}

// 4. Push
try {
  run(`git push origin HEAD --follow-tags`, { stdio: "inherit" });
  console.log(`✓ Pushed tag v${newVersion}`);
} catch (e) {
  console.log("⚠️  Push failed (do it manually): git push origin HEAD --follow-tags");
}

console.log("");
console.log("────────────────────────────────────────────────────────");
console.log("Next steps:");
console.log("");
console.log("  1. The GitHub Actions release workflow will:");
console.log("     • run tests");
console.log("     • publish to npm with `npm publish --access public`");
console.log("     • create a GitHub release with notes from CHANGELOG.md");
console.log("");
console.log("  2. Or do it manually:");
console.log(`     npm publish --access public`);
console.log(`     # then go to https://github.com/teamx-agency/dynamic-plan/releases/new`);
console.log(`     # and pick the v${newVersion} tag`);
console.log("────────────────────────────────────────────────────────");
