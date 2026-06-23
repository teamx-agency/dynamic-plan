#!/usr/bin/env node
// scripts/changelog.mjs
// Generate or update CHANGELOG.md from git history using Conventional Commits.
//
// Usage:
//   node scripts/changelog.mjs                          # full regen
//   node scripts/changelog.mjs --from v1.0.0 --to HEAD   # between tags
//   node scripts/changelog.mjs --since "2026-06-01"     # since date
//   node scripts/changelog.mjs --version 1.1.0          # set the version header
//   node scripts/changelog.mjs --write                  # actually write to CHANGELOG.md
//
// The script DOES NOT write by default; pass --write to commit the change.
// This lets you dry-run during local dev and only persist on release.
//
// Commit types recognized (per Conventional Commits v1.0.0):
//   feat:        new feature
//   fix:         bug fix
//   perf:        performance improvement
//   refactor:    code change that neither fixes a bug nor adds a feature
//   docs:        documentation only
//   style:       formatting, missing semi colons, etc
//   test:        adding tests
//   chore:       maintain / build / CI
//   revert:      reverts a previous commit
//   BREAKING CHANGE: (in footer) any commit with this footer is a breaking change
//
// Output follows Keep a Changelog 1.1.0:
//   https://keepachangelog.com/

import { execSync } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const CHANGELOG = resolve(ROOT, "CHANGELOG.md");

const args = process.argv.slice(2);
function getArg(name, fallback) {
  const i = args.indexOf("--" + name);
  return i !== -1 && i + 1 < args.length ? args[i + 1] : fallback;
}
const hasFlag = (name) => args.includes("--" + name);

const fromTag = getArg("from", "");
const toRef  = getArg("to", "HEAD");
const sinceDate = getArg("since", "");
const version = getArg("version", "");
const write = hasFlag("write");

// ---------- read git log ----------
function gitLog(from, to) {
  // Format: hash|shortHash|date|subject|body
  // Use a unique sentinel separator. We avoid null bytes (execSync rejects them)
  // and characters likely to appear in commit messages.
  const range = from ? `${from}..${to}` : to;
  const sinceFlag = sinceDate ? `--since="${sinceDate}"` : "";
  const sep = "__DPLAN_SEP__";
  const out = execSync(
    `git log ${range} ${sinceFlag} --pretty=format:%H%x7C%h%x7C%ad%x7C%s%n%x3Db${sep}`,
    { encoding: "utf8", cwd: ROOT }
  );
  return out.split(sep).map(parseRecord).filter(Boolean);
}
function parseRecord(raw) {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const lines = trimmed.split("\n");
  const header = lines[0] || "";
  const [hash, short, date, ...rest] = header.split("|");
  const subject = rest.join("|");
  const body = lines.slice(1).join("\n").trim();
  if (!hash) return null;
  return { hash, short, date, subject, body };
}

// ---------- classify commits ----------
const TYPE_LABELS = {
  feat: "Added",
  fix: "Fixed",
  perf: "Performance",
  refactor: "Changed",
  docs: "Documentation",
  style: "Style",
  test: "Tests",
  chore: "Chore",
  revert: "Reverted"
};
const TYPE_ORDER = ["feat", "fix", "perf", "refactor", "revert", "docs", "style", "test", "chore"];

function classify(commit) {
  const conventional = commit.subject.match(/^([a-z]+)(?:\(([^)]+)\))?(!?):\s*(.+)$/i);
  let type, scope, breaking, description;
  if (conventional) {
    type = conventional[1].toLowerCase();
    scope = conventional[2] || "";
    breaking = conventional[3] === "!" || /BREAKING CHANGE:/i.test(commit.body);
    description = conventional[4].trim();
  } else {
    type = "chore";
    scope = "";
    breaking = false;
    description = commit.subject;
  }
  return { ...commit, type, scope, breaking, description };
}

function groupByType(commits) {
  const groups = {};
  for (const c of commits) {
    if (!groups[c.type]) groups[c.type] = [];
    groups[c.type].push(c);
  }
  return groups;
}

// ---------- render ----------
function renderVersion(version, date, groups) {
  const lines = [];
  lines.push(`## [${version}] - ${date}`);
  lines.push("");
  const breaking = [];
  for (const c of commits_flat(groups)) {
    if (c.breaking) breaking.push(c);
  }
  if (breaking.length) {
    lines.push("### ⚠️ BREAKING CHANGES");
    lines.push("");
    for (const c of breaking) {
      lines.push(`- ${scopePrefix(c.scope)}${c.description} (${c.short})`);
    }
    lines.push("");
  }
  for (const type of TYPE_ORDER) {
    const list = groups[type];
    if (!list || list.length === 0) continue;
    const label = TYPE_LABELS[type] || type;
    lines.push(`### ${label}`);
    lines.push("");
    for (const c of list) {
      if (c.breaking) continue; // already in breaking section
      lines.push(`- ${scopePrefix(c.scope)}${c.description} (${c.short})`);
    }
    lines.push("");
  }
  return lines.join("\n");
}

function scopePrefix(scope) {
  return scope ? `**${scope}**: ` : "";
}

function commits_flat(groups) {
  return Object.values(groups).flat();
}

// ---------- date for the version header ----------
function today() {
  return new Date().toISOString().slice(0, 10);
}

function latestDate(commits) {
  if (!commits.length) return today();
  return commits.reduce((max, c) => (c.date > max ? c.date : max), "0000-00-00");
}

// ---------- main ----------
const commits = gitLog(fromTag, toRef).map(classify);
if (commits.length === 0) {
  console.log("No commits in range — nothing to write.");
  process.exit(0);
}
const groups = groupByType(commits);
const pkg = JSON.parse(await readFile(resolve(ROOT, "package.json"), "utf8"));
const ver = version || inferVersion(commits, pkg.version, fromTag);
const date = latestDate(commits);

const section = renderVersion(ver, date, groups);
console.log("--- proposed CHANGELOG section for " + ver + " ---");
console.log(section);
console.log("--- end ---\n");

if (write) {
  let existing = "";
  if (existsSync(CHANGELOG)) {
    existing = await readFile(CHANGELOG, "utf8");
  }
  const header = `# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog 1.1.0](https://keepachangelog.com/) and this project
adheres to [Semantic Versioning](https://semver.org/) and
[Conventional Commits](https://www.conventionalcommits.org/).

`;
  // Insert new section right after the header (or at top if no header yet).
  const headerMatch = existing.match(/^# Changelog[\s\S]*?(?=\n## )/);
  let updated;
  if (headerMatch) {
    updated = existing.replace(headerMatch[0], header.trim() + "\n\n") + section;
  } else if (existing.trim()) {
    updated = section + "\n" + existing;
  } else {
    updated = header + section;
  }
  await writeFile(CHANGELOG, updated, "utf8");
  console.log(`✓ Wrote ${CHANGELOG}`);
} else {
  console.log("Dry run. Pass --write to update CHANGELOG.md.");
}

function inferVersion(commits, currentVersion, fromTag) {
  // Tiny heuristic:
  //   - any BREAKING CHANGE or feat! -> major bump
  //   - any feat -> minor bump
  //   - otherwise (fix, perf, etc) -> patch bump
  // Caller can override with --version.
  // We base the bump on the *current* package.json version, not a tag, so the
  // first release works even without a prior tag.
  if (!currentVersion) return "0.1.0";
  const m = currentVersion.replace(/-\w+(\.\d+)?$/, "").split(".").map(Number);
  while (m.length < 3) m.push(0);
  let [maj, min, pat] = m;
  const hasBreaking = commits.some(c => c.breaking);
  const hasFeat = commits.some(c => c.type === "feat");
  if (hasBreaking) return [maj + 1, 0, 0].join(".");
  if (hasFeat)     return [maj, min + 1, 0].join(".");
  return [maj, min, pat + 1].join(".");
}
