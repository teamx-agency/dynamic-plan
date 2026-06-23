#!/usr/bin/env node
// dynamic-plan/compile-mdx.mjs
// Compile a .mdx file into a self-contained .html file (companion assets emitted).
// Usage:
//   node compile-mdx.mjs <input.mdx> <output-dir> <output.html>

import { readFile, writeFile, mkdir, copyFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, resolve, basename, extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { compile } from "@mdx-js/mdx";

const __dirname = dirname(fileURLToPath(import.meta.url));

// New CLI: node compile-mdx.mjs <input.mdx> <output.html>
const [, , inputPath, outputPath] = process.argv;
if (!inputPath || !outputPath) {
  console.error("Usage: compile-mdx.mjs <input.mdx> <output.html>");
  process.exit(1);
}

const absInput = resolve(inputPath);
const absOutput = resolve(outputPath);
const outDir = dirname(absOutput);
const outBase = basename(absOutput, extname(absOutput));
const componentsOut = join(outDir, outBase + ".components.mjs");
const componentsAbs = resolve(__dirname, "../assets/components.js");

// 1. Read source
const source = await readFile(absInput, "utf8");

// 2. Strip YAML frontmatter and parse it.
let body = source;
const frontmatter = {};
const fmMatch = source.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
if (fmMatch) {
  body = source.slice(fmMatch[0].length);
  for (const line of fmMatch[1].split(/\r?\n/)) {
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_-]*):\s*(.*)$/);
    if (!m) continue;
    const key = m[1];
    let val = m[2].trim();
    if (val.startsWith("[") && val.endsWith("]")) {
      val = val.slice(1, -1).split(",").map(s => s.trim().replace(/^["']|["']$/g, "")).filter(Boolean);
    } else if (/^["'].*["']$/.test(val)) {
      val = val.slice(1, -1);
    } else if (val === "true" || val === "false") {
      val = val === "true";
    }
    frontmatter[key] = val;
  }
}

// 3. Compile MDX body -> ESM program.
const compiled = await compile(body, {
  outputFormat: "program",
  development: false,
});
let code = String(compiled);

// 4. Strip the React JSX runtime import — provided by wrapper.
// 5. Copy components.js next to the output as a sibling file (clean URL, no base64).
// 6. Rewrite the components import to "./basename.components.mjs"
const componentsBasename = basename(componentsOut);
code = code.replace(
  /import\s*\{([^}]+)\}\s*from\s*["']\.\/components\.js["'];?/g,
  (_m, names) => `import {${names}} from "./${componentsBasename}";`
);
code = code.replace(/["']\.\/components\.js["']/g, `"./${componentsBasename}"`);
code = code.replace(
  /import\s*\{\s*([^}]+?)\s*\}\s*from\s*["']react\/jsx-runtime["'];?/g,
  ""
);

// 7. Write components.js as a sibling file
await mkdir(outDir, { recursive: true });
await copyFile(componentsAbs, componentsOut);

// 8. Inline style.css (complete — includes layout, callouts, wireframe toolbar, etc.)
let styleCss = "";
const cssAbs = resolve(__dirname, "../assets/style.css");
if (existsSync(cssAbs)) {
  styleCss = (await readFile(cssAbs, "utf8")).replace(/<\/style>/g, "<\\/style>");
}

// 9. Build the HTML shell.
const title = escapeHtml(frontmatter.title || "Dynamic Plan");
const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${title}</title>
<link rel="icon" href="data:," />
<style>${styleCss}</style>
</head>
<body>
<div id="root"><div class="plan-loading">Compiling interactive plan…</div></div>
<script type="module">
import {jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment} from "https://esm.sh/react@18.3.1/jsx-runtime";
// react-dom needs React on the global scope. We set it from the import so the
// "React is not defined" error in some react-dom helpers goes away.
import * as React from "https://esm.sh/react@18.3.1";
if (typeof window !== "undefined") window.React = React;

// Frontmatter exposed to components.
const frontmatter = ${JSON.stringify(frontmatter)};
window.__MDX_FRONTMATTER__ = frontmatter;

${code}

import { createRoot } from "https://esm.sh/react-dom@18.3.1/client";
const root = createRoot(document.getElementById("root"));
root.render(_jsx(MDXContent, { components: {} }));
</script>
</body>
</html>
`;

await writeFile(absOutput, html, "utf8");
console.log(`✓ Compiled ${absInput} → ${absOutput}`);
console.log(`  Assets: ${componentsOut}`);
console.log(`  Open:   file://${absOutput}`);
console.log(`  Or:     bash ${resolve(__dirname, "serve-mdx.sh")} ${dirname(absOutput)}`);

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}