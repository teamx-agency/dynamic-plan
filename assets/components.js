// dynamic-plan/components.js
// Vanilla ESM JSX-like components. Used by .mdx files rendered with @mdx-js/mdx + React 18.
// Self-contained: no build step needed. Imported by the compiled MDX bundle.

// Use the same JSX runtime as the compiled MDX so the same "jsx"/"jsxs"/"Fragment"
// symbols are in scope. This avoids the "React is not defined" error that happens
// when components.js uses `React.createElement` but the runtime only injects the
// jsx-runtime symbols into MDX files.
import { jsx, jsxs, Fragment } from "https://esm.sh/react@18.3.1/jsx-runtime";
import { useEffect, useRef, useState } from "https://esm.sh/react@18.3.1";

// Build a single h() helper that mirrors React.createElement but works without
// `React` in scope. Accepts (type, props, ...children).
const h = (type, props, ...children) => {
  if (children.length === 1) return jsx(type, Object.assign({}, props || {}, { children: children[0] }));
  if (children.length === 0) return jsx(type, props || {});
  return jsxs(type, Object.assign({}, props || {}, { children }));
};

// ---------- helpers ----------
function slug(s) {
  return String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
function lsKey(id, slug_) {
  return `dplan-${id}-${slug_ || "default"}`;
}
function getSlug() {
  try {
    if (typeof window !== "undefined" && window.__MDX_FRONTMATTER__ && window.__MDX_FRONTMATTER__.slug) {
      return window.__MDX_FRONTMATTER__.slug;
    }
  } catch (e) {}
  if (typeof document !== "undefined") {
    return slug(document.querySelector("h1") ? document.querySelector("h1").textContent || "default" : "default");
  }
  return "default";
}

// ---------- wireframe-kit constants ----------
// Auto-applied to every <Wireframe>. If the .mdx already declares these, they
// are kept as-is (idempotent).
var WIREFRAME_CLASSDEFS = [
  "classDef structure  fill:#f1f5f9,stroke:#475569,stroke-width:2px,color:#0f172a",
  "classDef navigation fill:#eef2ff,stroke:#4f46e5,stroke-width:2px,color:#312e81",
  "classDef content    fill:#fef3c7,stroke:#d97706,stroke-width:2px,color:#78350f",
  "classDef input      fill:#dcfce7,stroke:#16a34a,stroke-width:2px,color:#14532d",
  "classDef feedback   fill:#fee2e2,stroke:#dc2626,stroke-width:1.5px,color:#7f1d1d,stroke-dasharray: 4 3",
  "classDef system     fill:#1e293b,stroke:#0f172a,stroke-width:1px,color:#e2e8f0",
  "classDef decision   fill:#fdf4ff,stroke:#a21caf,stroke-width:2px,color:#581c87"
];

// Emoji -> class name. First match wins. Add new mappings here when the kit grows.
var WIREFRAME_EMOJI_TO_CLASS = {
  "📐": "structure", "🧱": "structure", "📦": "structure", "🪟": "structure", "🗂️": "structure",
  "🧭": "navigation", "📂": "navigation", "🍞": "navigation", "🔗": "navigation", "📍": "navigation",
  "📄": "content", "📝": "content", "📊": "content", "🖼️": "content", "📋": "content",
  "🔘": "input", "📥": "input", "☑️": "input", "🎚️": "input", "🔽": "input",
  "🔔": "feedback", "⚠️": "feedback", "❌": "feedback", "🟢": "feedback", "⏳": "feedback",
  "⚙️": "system", "💾": "system", "🔌": "system", "🔀": "system", "🔐": "system",
  "👤": "system" // user / actor
};

// Map each Mermaid node id (e.g. "Login", "Btn") to a class by scanning its label.
function autoClassify(code) {
  // Find lines like:  NodeId["📐 Label"]  or  NodeId{{"🪟 Modal"}}  or  NodeId(("🔘 Choice"))
  var lines = code.split(/\n/);
  var assignments = {}; // nodeId -> className
  // Emojis sorted by length desc so we don't match the prefix of a longer one.
  var emojis = Object.keys(WIREFRAME_EMOJI_TO_CLASS).sort(function (a, b) { return b.length - a.length; });
  lines.forEach(function (line) {
    // Strip comments
    line = line.replace(/^\s*%%.*$/, "");
    var m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*[\[\({]\s*"?([^"\n]*)?"?/);
    if (!m) return;
    var nodeId = m[1], label = m[2] || "";
    for (var i = 0; i < emojis.length; i++) {
      if (label.indexOf(emojis[i]) !== -1) {
        assignments[nodeId] = WIREFRAME_EMOJI_TO_CLASS[emojis[i]];
        break;
      }
    }
  });
  // If a node already has :::className, skip it.
  Object.keys(assignments).forEach(function (id) {
    var re = new RegExp("^\\s*" + id + "\\b[^\\n]*:::([a-zA-Z]+)", "m");
    if (re.test(code)) delete assignments[id];
  });
  // Build a `class X,Y,Z navigation` line per class.
  var grouped = {};
  Object.keys(assignments).forEach(function (id) {
    var cls = assignments[id];
    (grouped[cls] = grouped[cls] || []).push(id);
  });
  var assigns = Object.keys(grouped).map(function (cls) {
    return "  class " + grouped[cls].join(",") + " " + cls;
  });
  return assigns.join("\n");
}

// Compose the final Mermaid code: original + classDefs (if missing) + auto-classify lines (if no class lines).
function composeWireframe(code) {
  var trimmed = code.trim();
  // sequenceDiagram and other non-flowchart types don't support classDef/class.
  // We can still run auto-classify on participant lines, but we skip classDef injection.
  var firstLine = trimmed.split(/\n/, 1)[0].trim().toLowerCase();
  var supportsClassDef = /^(flowchart|graph)\b/.test(firstLine);

  var out = trimmed;
  if (supportsClassDef) {
    var hasClassDef = /^\s*classDef\s/m.test(out);
    if (!hasClassDef) out += "\n" + WIREFRAME_CLASSDEFS.join("\n");
  }
  // Always try auto-classify on participant / node lines, regardless of diagram type.
  // For sequenceDiagram, we add `participant Foo as "📐 Foo"` is already a thing; we'll skip the
  // `class` lines (they'd be invalid) but the auto-classify function returns lines that would
  // only apply to flowcharts. So we gate the class-line output on supportsClassDef.
  if (supportsClassDef) {
    var hasAssign = /^\s*class\s+\S+\s+\S/m.test(out);
    if (!hasAssign) {
      var assigns = autoClassify(out);
      if (assigns) out += "\n" + assigns;
    }
  }
  return out;
}

// ---------- PlanHeader ----------
export function PlanHeader(props) {
  let fm = {};
  try {
    if (typeof window !== "undefined" && window.__MDX_FRONTMATTER__) {
      fm = window.__MDX_FRONTMATTER__;
    }
  } catch (e) {}
  const merged = Object.assign({}, fm, props || {});
  const title = merged.title || "Dynamic Plan";
  const goal = merged.goal || "";
  const generatedAt = merged.generatedAt || new Date().toISOString();
  const stack = merged.stack || [];
  const status = merged.status || "draft";
  const date = new Date(generatedAt).toLocaleString();
  const statusColor = { draft: "#d97706", approved: "#16a34a", "in-progress": "#4f46e5" }[status] || "#6b7280";
  return h(
    "header",
    { className: "plan-header" },
    h("div", { className: "plan-header-inner" },
      h("div", { className: "plan-header-meta" },
        h("span", { className: "plan-status", "data-status": status }, status),
        h("span", { className: "plan-meta-text" }, "Generated " + date)
      ),
      h("h1", { className: "plan-title" }, title),
      h("p", { className: "plan-goal" }, goal),
      stack.length > 0 && h("div", { className: "plan-chips" }, stack.map(function (t, i) {
        return h("span", { key: i, className: "plan-chip" }, t);
      }))
    )
  );
}

// ---------- ProgressBar ----------
export function ProgressBar() {
  const [pct, setPct] = useState(0);
  useEffect(function () {
    function update() {
      var checks = document.querySelectorAll('input[type="checkbox"][data-progress]');
      if (!checks.length) return;
      var done = 0;
      for (var i = 0; i < checks.length; i++) if (checks[i].checked) done++;
      var next = Math.round((done / checks.length) * 100);
      setPct(next);
      var bar = document.getElementById("plan-progress-bar");
      if (bar) bar.style.width = next + "%";
    }
    update();
    document.addEventListener("change", update);
    return function () { document.removeEventListener("change", update); };
  }, []);
  return h("div", { className: "progress-block" },
    h("div", { className: "progress-label" },
      h("span", null, "Progress"),
      h("span", { className: "progress-pct" }, pct + "%")
    ),
    h("div", { className: "progress-track" },
      h("div", { className: "progress-fill", style: { width: pct + "%" } })
    )
  );
}

// ---------- PlanSidebar ----------
export function PlanSidebar(props) {
  var steps = (props && props.steps) || [];
  var firstId = steps.length ? steps[0].id : null;
  var _useState = useState(firstId), active = _useState[0], setActive = _useState[1];
  var _useState2 = useState(steps), displaySteps = _useState2[0], setDisplaySteps = _useState2[1];
  var planSlug = getSlug();

  useEffect(function () {
    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) setActive(e.target.id); });
    }, { rootMargin: "-30% 0px -60% 0px" });
    displaySteps.forEach(function (s) {
      var el = document.getElementById(s.id);
      if (el) obs.observe(el);
    });
    return function () { obs.disconnect(); };
  }, [displaySteps]);

  // Listen for reorder events from <PlanStep> drag-and-drop.
  useEffect(function () {
    function reorderFromStorage() {
      try {
        var saved = JSON.parse(localStorage.getItem(lsKey("step-order", planSlug)) || "[]");
        if (!saved.length) { setDisplaySteps(steps); return; }
        var known = steps.map(function (s) { return s.id; });
        var validOrder = saved.filter(function (id) { return known.indexOf(id) !== -1; });
        for (var i = 0; i < steps.length; i++) {
          if (validOrder.indexOf(steps[i].id) === -1) validOrder.push(steps[i].id);
        }
        var reordered = steps.slice().sort(function (a, b) {
          return validOrder.indexOf(a.id) - validOrder.indexOf(b.id);
        });
        setDisplaySteps(reordered);
      } catch (err) {}
    }
    function onReorder() { reorderFromStorage(); }
    window.addEventListener("dplan:step-reorder", onReorder);
    reorderFromStorage();
    return function () { window.removeEventListener("dplan:step-reorder", onReorder); };
  }, [steps, planSlug]);

  var list = displaySteps;
  return h("nav", { className: "plan-sidebar-nav" },
    h("div", { className: "plan-sidebar-label" }, "Plan"),
    list.map(function (s) {
      var isActive = active === s.id;
      return h("a", {
        key: s.id,
        href: "#" + s.id,
        className: "plan-step-link" + (isActive ? " active" : ""),
        "data-step-id": s.id
      },
        h("span", { className: "plan-step-chevron" }, isActive ? "▾" : "▸"),
        h("span", { className: "plan-step-text" }, s.title)
      );
    })
  );
}

// ---------- PlanStep (with drag handle + wireframe toggle) ----------
export function PlanStep(props) {
  var n = props.n, title = props.title, children = props.children;
  var _useState = useState(""), dragClass = _useState[0], setDragClass = _useState[1];
  var planSlug = getSlug();
  var stepKey = "step-" + n;

  // Read initial order from localStorage (steps reordered previously).
  // If user reordered, our step number n is now stale; show the order index.
  var _useState2 = useState(function () {
    try {
      var saved = localStorage.getItem(lsKey("step-order", planSlug));
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return null;
  }), order = _useState2[0], setOrder = _useState2[1];

  // Compute display position from order, fallback to n.
  var displayPos = order ? (order.indexOf(stepKey) + 1) : n;
  if (displayPos < 1) displayPos = n;

  function handleDragStart(e) {
    e.dataTransfer.setData("text/plain", stepKey);
    e.dataTransfer.effectAllowed = "move";
    setDragClass("dragging");
  }
  function handleDragEnd() { setDragClass(""); }
  function handleDragOver(e) { e.preventDefault(); e.dataTransfer.dropEffect = "move"; setDragClass("drag-over"); }
  function handleDragLeave() { setDragClass(""); }
  function handleDrop(e) {
    e.preventDefault();
    var draggedKey = e.dataTransfer.getData("text/plain");
    if (!draggedKey || draggedKey === stepKey) { setDragClass(""); return; }
    try {
      var currentOrder = order ? order.slice() : Array.from({ length: 9 }, function (_, i) { return "step-" + (i + 1); }).filter(function (k) { return k !== "decisions" && k !== "overview"; });
      // Initialize with current known order if empty
      if (currentOrder.indexOf(draggedKey) === -1) currentOrder.push(draggedKey);
      if (currentOrder.indexOf(stepKey) === -1) currentOrder.push(stepKey);
      // Reorder: remove draggedKey, insert at stepKey position
      var draggedIdx = currentOrder.indexOf(draggedKey);
      currentOrder.splice(draggedIdx, 1);
      var targetIdx = currentOrder.indexOf(stepKey);
      currentOrder.splice(targetIdx, 0, draggedKey);
      localStorage.setItem(lsKey("step-order", planSlug), JSON.stringify(currentOrder));
      setOrder(currentOrder);
      setDragClass("");
      // Notify the sidebar to refresh
      window.dispatchEvent(new CustomEvent("dplan:step-reorder", { detail: { order: currentOrder } }));
    } catch (err) { setDragClass(""); }
  }

  return h("section", {
    id: "step-" + n,
    "data-step": n,
    "data-step-key": stepKey,
    className: "plan-card plan-step" + (dragClass ? " " + dragClass : ""),
    draggable: "true",
    onDragStart: handleDragStart,
    onDragEnd: handleDragEnd,
    onDragOver: handleDragOver,
    onDragLeave: handleDragLeave,
    onDrop: handleDrop
  },
    h("div", { className: "plan-step-handle", title: "Drag to reorder" }, "⋮⋮"),
    h("div", { className: "plan-step-head" },
      h("span", { className: "plan-step-num" }, displayPos),
      h("h2", { className: "plan-step-title" }, title)
    ),
    h("div", { className: "plan-step-body" }, children, h(StepNotes, { n: n, stepKey: stepKey }))
  );
}

// ---------- Mermaid (raw, no classDef magic) ----------
export function Mermaid(props) {
  var chart = (props && props.chart) || "flowchart-td";
  var code = (props && props.code) || "";
  var ref = useRef(null);
  var id = "mmd-" + Math.random().toString(36).slice(2, 9);
  var _useState2 = useState(null), err = _useState2[0], setErr = _useState2[1];
  useEffect(function () {
    var cancelled = false;
    (async function () {
      try {
        var mod = await import("https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.esm.min.mjs");
        var mermaid = mod.default;
        mermaid.initialize({ startOnLoad: false, theme: "neutral", securityLevel: "loose", fontFamily: "inherit" });
        if (cancelled || !ref.current) return;
        var res = await mermaid.render(id, code);
        ref.current.innerHTML = res.svg;
      } catch (e) {
        if (!cancelled) setErr(String(e && e.message ? e.message : e));
      }
    })();
    return function () { cancelled = true; };
  }, [code, id]);
  if (err) {
    return h("details", { className: "mermaid-fallback-wrap" },
      h("summary", { className: "mermaid-fallback-summary" }, "⚠️ Diagram render error — show code"),
      h("pre", { className: "mermaid-fallback" }, code),
      h("small", { className: "mermaid-fallback-detail" }, err)
    );
  }
  return h("div", { ref: ref, className: "mermaid", "data-chart": chart });
}

// ---------- Wireframe (wireframe-kit aware) ----------
export function Wireframe(props) {
  var code = (props && props.code) || "";
  var title = (props && props.title) || "Wireframe";
  var ref = useRef(null);
  var id = "wf-" + Math.random().toString(36).slice(2, 9);
  var _useState = useState(null), err = _useState[0], setErr = _useState[1];

  // Persist last-used view mode (wireframe vs raw).
  var _useState2 = useState(function () {
    try {
      var v = localStorage.getItem(lsKey("wf-mode", getSlug()));
      return v || "wireframe";
    } catch (e) { return "wireframe"; }
  }), mode = _useState2[0], setMode = _useState2[1];

  var finalCode = useMemo(function () {
    return mode === "wireframe" ? composeWireframe(code) : code;
  }, [code, mode]);

  useEffect(function () {
    var cancelled = false;
    (async function () {
      try {
        var mod = await import("https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.esm.min.mjs");
        var mermaid = mod.default;
        mermaid.initialize({ startOnLoad: false, theme: "neutral", securityLevel: "loose", fontFamily: "inherit" });
        if (cancelled || !ref.current) return;
        var res = await mermaid.render(id, finalCode);
        ref.current.innerHTML = res.svg;
        setErr(null);
      } catch (e) {
        if (!cancelled) setErr(String(e && e.message ? e.message : e));
      }
    })();
    return function () { cancelled = true; };
  }, [finalCode, id]);

  function toggleMode(next) {
    setMode(next);
    try { localStorage.setItem(lsKey("wf-mode", getSlug()), next); } catch (e) {}
  }

  return h("div", { className: "wireframe-wrap" },
    h("div", { className: "wireframe-toolbar" },
      h("span", { className: "wireframe-title" }, "🧩 " + title),
      h("div", { className: "wireframe-toggle" },
        h("button", {
          className: "wf-tab" + (mode === "abstract" ? " active" : ""),
          onClick: function () { toggleMode("abstract"); }
        }, "Abstract"),
        h("button", {
          className: "wf-tab" + (mode === "wireframe" ? " active" : ""),
          onClick: function () { toggleMode("wireframe"); }
        }, "Wireframe")
      )
    ),
    err
      ? h("details", { className: "mermaid-fallback-wrap" },
          h("summary", { className: "mermaid-fallback-summary" }, "⚠️ Diagram render error — show code"),
          h("pre", { className: "mermaid-fallback" }, finalCode),
          h("small", { className: "mermaid-fallback-detail" }, err)
        )
      : h("div", { ref: ref, className: "mermaid wireframe-mermaid" })
  );
}

// Tiny `useMemo` shim so we don't have to import it (works the same in React).
function useMemo(fn, deps) {
  var ref = useRef({ val: null, deps: null });
  if (!ref.current.deps || !shallowEq(ref.current.deps, deps)) {
    ref.current.val = fn();
    ref.current.deps = deps;
  }
  return ref.current.val;
}
function shallowEq(a, b) {
  if (a === b) return true;
  if (!a || !b || a.length !== b.length) return false;
  for (var i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

// ---------- Callout (Notion-like alert/info blocks) ----------
export function Callout(props) {
  var emoji = props.emoji || "💡";
  var tone = props.tone || "info"; // info | warn | success | danger
  var children = props.children;
  return h("div", { className: "callout callout-" + tone },
    h("span", { className: "callout-emoji" }, emoji),
    h("div", { className: "callout-body" }, children)
  );
}

// ---------- Decision form helpers ----------
function readDecisions(formEl) {
  var data = {};
  var notes = {};
  formEl.querySelectorAll("details.decision").forEach(function (d) {
    var id = d.dataset.id;
    var checked = d.querySelector('input[type="radio"]:checked');
    if (checked) data[id] = checked.value;
    var note = d.querySelector("textarea");
    if (note && note.value.trim()) notes[id] = note.value.trim();
  });
  return { data: data, notes: notes };
}

function formatDecisions(result, slug_) {
  var data = result.data, notes = result.notes;
  var lines = ["@dynamic-plan decisions", "```json", JSON.stringify(data, null, 2), "```"];
  var noteEntries = Object.entries(notes);
  if (noteEntries.length) {
    lines.push("", "Notes:");
    noteEntries.forEach(function (kv) { lines.push("- " + kv[0] + ": " + kv[1]); });
  }
  lines.push("", "_Plan: " + (slug_ || "default") + "_");
  return lines.join("\n");
}

// ---------- DecisionForm ----------
export function DecisionForm(props) {
  var id = props.id, children = props.children;
  var ref = useRef(null);
  var _useState3 = useState(""), preview = _useState3[0], setPreview = _useState3[1];
  useEffect(function () {
    if (!ref.current) return;
    var formEl = ref.current;
    var planSlug = getSlug();
    var saved = localStorage.getItem(lsKey(id, planSlug));
    if (saved) {
      try {
        var parsed = JSON.parse(saved);
        var data = parsed.data || {}, notes = parsed.notes || {};
        formEl.querySelectorAll("details.decision").forEach(function (d) {
          var did = d.dataset.id;
          if (data[did]) {
            var radio = d.querySelector('input[type="radio"][value="' + data[did] + '"]');
            if (radio) { radio.checked = true; d.setAttribute("open", ""); }
          }
          if (notes && notes[did]) {
            var t = d.querySelector("textarea");
            if (t) t.value = notes[did];
          }
        });
      } catch (e) {}
    }
    function update() {
      var result = readDecisions(formEl);
      setPreview(formatDecisions(result, planSlug));
      localStorage.setItem(lsKey(id, planSlug), JSON.stringify(result));
    }
    update();
    formEl.addEventListener("change", update);
    formEl.addEventListener("input", update);
    return function () {
      formEl.removeEventListener("change", update);
      formEl.removeEventListener("input", update);
    };
  }, [id]);
  return h("div", { ref: ref, id: id, className: "decision-form" },
    children,
    h("details", { className: "decision-preview-block" },
      h("summary", { className: "decision-preview-summary" }, "▸ Preview (live JSON)"),
      h("pre", { className: "decision-preview" }, preview || "(no decisions yet)")
    )
  );
}

// ---------- Decision ----------
export function Decision(props) {
  var id = props.id;
  var question = props.question;
  var options = props.options || [];
  var def = props.default;
  var allowNote = props.allowNote !== false;
  return h("details", { className: "decision", "data-id": id, open: !!def },
    h("summary", { className: "decision-summary" },
      h("span", { className: "decision-chevron" }, "▸"),
      h("span", { className: "decision-id" }, id),
      h("span", { className: "decision-question" }, question)
    ),
    h("div", { className: "radio-row" },
      options.map(function (opt) {
        return h("label", { key: opt.value, className: "radio-card" },
          h("input", {
            type: "radio",
            name: "dec-" + id,
            value: opt.value,
            defaultChecked: def === opt.value
          }),
          h("div", { className: "radio-content" },
            h("div", { className: "radio-title" }, opt.label),
            opt.help && h("div", { className: "radio-help" }, opt.help)
          )
        );
      })
    ),
    allowNote && h("textarea", {
      className: "decision-note",
      placeholder: "Optional note for the agent…"
    })
  );
}

// ---------- CopyDecisions ----------
export function CopyDecisions(props) {
  var target = props.target;
  var _useState4 = useState("📋 Copy decisions"), label = _useState4[0], setLabel = _useState4[1];
  var _useState5 = useState("💾 Export JSON"), exportLabel = _useState5[0], setExportLabel = _useState5[1];
  return h("div", { className: "copy-bar" },
    h("button", {
      className: "export-link",
      onClick: function () {
        var formEl = document.querySelector(target);
        if (!formEl) return;
        var result = readDecisions(formEl);
        var planSlug = getSlug();
        // Build a richer JSON payload than the @dynamic-plan copy block.
        var stepOrder = [];
        try { stepOrder = JSON.parse(localStorage.getItem(lsKey("step-order", planSlug)) || "[]"); } catch (e) {}
        // Collect per-step notes from <StepNotes> localStorage keys.
        var stepNotes = {};
        try {
          for (var i = 0; i < localStorage.length; i++) {
            var k = localStorage.key(i);
            if (k && k.indexOf("dplan-step-note-step-") !== -1) {
              var stepId = k.substring(k.lastIndexOf("-step-") + 1).replace(/^step-/, "");
              // Actually the key format is dplan-step-note-step-N-<slug>; extract N.
              var m = k.match(/step-note-(step-\d+)/);
              if (m) stepNotes[m[1]] = localStorage.getItem(k);
            }
          }
        } catch (e) {}
        var payload = {
          plan: {
            slug: planSlug,
            title: document.querySelector(".plan-title") ? document.querySelector(".plan-title").textContent : null,
            goal: document.querySelector(".plan-goal") ? document.querySelector(".plan-goal").textContent : null
          },
          generatedAt: new Date().toISOString(),
          stepOrder: stepOrder,
          stepNotes: stepNotes,
          decisions: result.data,
          notes: result.notes
        };
        var json = JSON.stringify(payload, null, 2);
        var blob = new Blob([json], { type: "application/json" });
        var url = URL.createObjectURL(blob);
        var a = document.createElement("a");
        a.href = url;
        a.download = "dynamic-plan-" + planSlug + "-decisions.json";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
        setExportLabel("✅ Downloaded!");
        setTimeout(function () { setExportLabel("💾 Export JSON"); }, 2500);
      }
    }, exportLabel),
    h("button", {
      className: "secondary",
      onClick: function () {
        var formEl = document.querySelector(target);
        if (!formEl) return;
        var result = readDecisions(formEl);
        var planSlug = getSlug();
        var text = formatDecisions(result, planSlug);
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(function () {
            setLabel("✅ Copied! Paste back to the agent");
            setTimeout(function () { setLabel("📋 Copy decisions"); }, 2500);
          });
        } else {
          var ta = document.createElement("textarea");
          ta.value = text;
          document.body.appendChild(ta);
          ta.select();
          document.execCommand("copy");
          document.body.removeChild(ta);
          setLabel("✅ Copied!");
          setTimeout(function () { setLabel("📋 Copy decisions"); }, 2500);
        }
      }
    }, label),
    h("button", {
      className: "primary",
      onClick: function () {
        if (confirm("Mark this plan as approved and reset decisions?")) {
          document.querySelectorAll('input[type="checkbox"][data-progress]').forEach(function (c) { c.checked = true; });
          document.querySelectorAll("input[type=radio]").forEach(function (r) {
            r.dispatchEvent(new Event("change", { bubbles: true }));
          });
        }
      }
    }, "✓ Approve plan")
  );
}

// ====================================================================
// WIREFRAME COMPONENTS (Figkit-style HTML mockups)
// ====================================================================
// All render real HTML/CSS with gray-box styling. Use placeholders
// ("_____", "Lorem ipsum", "Avatar") instead of real data.
// ====================================================================

// ---------- helpers ----------
function wfClass(...names) {
  return names.filter(Boolean).join(" ");
}

// ---------- StepNotes (per-step persistent notes) ----------
// Auto-injected at the end of every <PlanStep>'s body if the agent
// didn't put one there explicitly. Persists per (slug, stepKey) in
// localStorage; included in the decisions JSON export.
export function StepNotes(props) {
  var stepKey = props.stepKey || (props.n ? "step-" + props.n : null);
  if (!stepKey) return null;
  var planSlug = getSlug();
  var noteKey = lsKey("step-note-" + stepKey, planSlug);

  var _useState = useState(function () {
    try { return localStorage.getItem(noteKey) || ""; } catch (e) { return ""; }
  }), note = _useState[0], setNote = _useState[1];
  var _useState2 = useState(function () {
    return !!(localStorage.getItem(noteKey));
  }), hasContent = _useState2[0], setHasContent = _useState2[1];
  var _useState3 = useState(true), expanded = _useState3[0], setExpanded = _useState3[1];

  function update(e) {
    var v = e.target.value;
    setNote(v);
    try {
      if (v.trim()) {
        localStorage.setItem(noteKey, v);
        setHasContent(true);
      } else {
        localStorage.removeItem(noteKey);
        setHasContent(false);
      }
    } catch (e) {}
  }

  // Simple Markdown → HTML (bold, italic, code, lists, links). Keeps the
  // bundle small — no marked.js. Escape HTML first.
  function renderMarkdown(text) {
    if (!text) return null;
    var escaped = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    // Split by lines for lists
    var lines = escaped.split("\n");
    var out = [];
    var inList = false;
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      var listMatch = line.match(/^(\s*)([-*])\s+(.*)$/);
      if (listMatch) {
        if (!inList) { out.push("<ul>"); inList = true; }
        out.push("<li>" + inlineFmt(listMatch[3]) + "</li>");
      } else {
        if (inList) { out.push("</ul>"); inList = false; }
        if (line.trim() === "") { out.push("<br/>"); continue; }
        if (/^### /.test(line)) out.push("<h4>" + inlineFmt(line.slice(4)) + "</h4>");
        else if (/^## /.test(line)) out.push("<h3>" + inlineFmt(line.slice(3)) + "</h3>");
        else if (/^# /.test(line)) out.push("<h2>" + inlineFmt(line.slice(2)) + "</h2>");
        else out.push("<p>" + inlineFmt(line) + "</p>");
      }
    }
    if (inList) out.push("</ul>");
    return out.join("");
  }
  function inlineFmt(s) {
    return s
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/\*([^*]+)\*/g, "<em>$1</em>")
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  }

  var display = expanded ? "block" : "none";
  return h("div", { className: "step-notes" + (hasContent ? " has-content" : ""), "data-step-key": stepKey },
    h("button", {
      className: "step-notes-toggle",
      onClick: function () { setExpanded(!expanded); },
      "aria-expanded": expanded
    },
      h("span", { className: "step-notes-chevron" }, expanded ? "▾" : "▸"),
      h("span", null, hasContent ? "📝 Your notes" : "📝 Add notes"),
      hasContent && !expanded ? h("span", { className: "step-notes-preview" }, note.slice(0, 60) + (note.length > 60 ? "…" : "")) : null,
      h("span", { className: "step-notes-counter" }, note.length > 0 ? note.length + " chars" : "")
    ),
    h("div", { className: "step-notes-body", style: { display: display } },
      h("textarea", {
        className: "step-notes-input",
        value: note,
        onChange: update,
        placeholder: "Capture blockers, follow-ups, design questions for this step.\n\nMarkdown supported: **bold**, *italic*, `code`, [links](url), and - lists.\n\nSaved automatically. Persists across page reloads.",
        rows: 5
      }),
      hasContent && h("div", { className: "step-notes-preview-card" },
        h("div", { className: "step-notes-preview-label" }, "Preview"),
        h("div", { className: "step-notes-preview-body", dangerouslySetInnerHTML: { __html: renderMarkdown(note) } })
      )
    )
  );
}

// ---------- BarChart (SVG, no deps) ----------
// data: [{ label: 'Jan', value: 12, color: '...' }, ...]
// options: { height?, showValues?, showAxis?, format?(v)=>string }
export function BarChart(props) {
  var data = (props && props.data) || [];
  var title = props.title;
  var opts = (props && props.options) || {};
  var height = opts.height || 180;
  var showValues = opts.showValues !== false;
  var showAxis = opts.showAxis !== false;
  var format = opts.format || function (v) { return String(v); };

  if (!data.length) {
    return h("div", { className: "wf-bar-chart empty" }, "No data");
  }

  var max = Math.max.apply(null, data.map(function (d) { return d.value; }));
  var maxRounded = Math.ceil(max * 1.1);
  if (maxRounded === 0) maxRounded = 1;
  var barWidthPct = 100 / data.length;
  var innerBarWidth = Math.max(8, Math.min(60, barWidthPct * 0.6));

  return h("div", { className: "wf-bar-chart" },
    title && h("div", { className: "wf-bar-chart-title" }, title),
    h("div", { className: "wf-bar-chart-svg-wrap" },
      h("svg", { viewBox: "0 0 600 " + height, preserveAspectRatio: "xMidYMid meet", className: "wf-bar-chart-svg", role: "img", "aria-label": title || "Bar chart" },
        // Y-axis grid lines (4 ticks)
        showAxis && [0, 0.25, 0.5, 0.75, 1].map(function (t, i) {
          var y = height - 30 - (height - 50) * t;
          return h("g", { key: "g" + i },
            h("line", { x1: 40, y1: y, x2: 590, y2: y, stroke: "var(--wf-chart-grid, #e5e7eb)", "stroke-width": 1, "stroke-dasharray": t === 0 ? "0" : "2 2" }),
            h("text", { x: 36, y: y + 4, "text-anchor": "end", "font-size": 10, fill: "var(--wf-chart-axis, #9ca3af)" }, format(maxRounded * t))
          );
        }),
        // Bars
        data.map(function (d, i) {
          var x = 50 + i * (560 / data.length) + (560 / data.length - innerBarWidth) / 2;
          var barH = (height - 50) * (d.value / maxRounded);
          var y = height - 30 - barH;
          var color = d.color || "var(--wf-chart-bar, #4f46e5)";
          return h("g", { key: d.label || i },
            h("rect", { x: x, y: y, width: innerBarWidth, height: barH, fill: color, rx: 2 }),
            showValues && h("text", { x: x + innerBarWidth / 2, y: y - 4, "text-anchor": "middle", "font-size": 10, fontWeight: 600, fill: "var(--wf-chart-value, #374151)" }, format(d.value)),
            h("text", { x: x + innerBarWidth / 2, y: height - 14, "text-anchor": "middle", "font-size": 10, fill: "var(--wf-chart-axis, #9ca3af)" }, d.label)
          );
        })
      )
    )
  );
}

// ---------- DataTable (with sort + filter) ----------
// columns: [{ key, label, sortable?, format?(v,row)? }]
// rows: array of objects keyed by column.key
// options: { defaultSort?, searchable?, pageSize? }
export function DataTable(props) {
  var columns = (props && props.columns) || [];
  var rows = (props && props.rows) || [];
  var title = props.title;
  var opts = (props && props.options) || {};

  var _useState = useState(opts.defaultSort || null), sortKey = _useState[0], setSortKey = _useState[1];
  var _useState2 = useState(opts.defaultSortDesc || false), sortDesc = _useState2[0], setSortDesc = _useState2[1];
  var _useState3 = useState(""), filter = _useState3[0], setFilter = _useState3[1];
  var _useState4 = useState(1), page = _useState4[0], setPage = _useState4[1];
  var pageSize = opts.pageSize || 10;
  var searchable = opts.searchable !== false;

  function toggleSort(key) {
    if (sortKey === key) setSortDesc(!sortDesc);
    else { setSortKey(key); setSortDesc(false); }
    setPage(1);
  }

  // Filter
  var filtered = filter
    ? rows.filter(function (row) {
        var hay = columns.map(function (c) { return String(row[c.key] != null ? row[c.key] : ""); }).join(" ").toLowerCase();
        return hay.indexOf(filter.toLowerCase()) !== -1;
      })
    : rows;

  // Sort
  var sorted = sortKey
    ? filtered.slice().sort(function (a, b) {
        var av = a[sortKey], bv = b[sortKey];
        if (typeof av === "number" && typeof bv === "number") return sortDesc ? bv - av : av - bv;
        av = String(av || ""); bv = String(bv || "");
        return sortDesc ? bv.localeCompare(av) : av.localeCompare(bv);
      })
    : filtered;

  var totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  var pageRows = sorted.slice((page - 1) * pageSize, page * pageSize);

  return h("div", { className: "wf-data-table" },
    (title || searchable) && h("div", { className: "wf-data-table-header" },
      title && h("div", { className: "wf-data-table-title" }, title),
      searchable && h("input", {
        type: "search",
        className: "wf-data-table-search",
        placeholder: "🔍 Search…",
        value: filter,
        onChange: function (e) { setFilter(e.target.value); setPage(1); }
      })
    ),
    h("table", { className: "wf-data-table-table" },
      h("thead", null,
        h("tr", null,
          columns.map(function (c) {
            var sortable = c.sortable !== false;
            var isActive = sortKey === c.key;
            return h("th", {
              key: c.key,
              className: sortable ? "sortable" : "",
              onClick: function () { if (sortable) toggleSort(c.key); }
            },
              c.label,
              sortable && h("span", { className: "wf-sort-arrow" }, isActive ? (sortDesc ? " ▼" : " ▲") : " ↕")
            );
          })
        )
      ),
      h("tbody", null,
        pageRows.length
          ? pageRows.map(function (row, i) {
              return h("tr", { key: i },
                columns.map(function (c) {
                  var raw = row[c.key];
                  var content = c.format ? c.format(raw, row) : (raw != null ? String(raw) : "");
                  return h("td", { key: c.key }, content);
                })
              );
            })
          : h("tr", null, h("td", { colSpan: columns.length, className: "wf-data-table-empty" }, "No rows match."))
      )
    ),
    totalPages > 1 && h("div", { className: "wf-data-table-pager" },
      h("button", { onClick: function () { setPage(Math.max(1, page - 1)); }, disabled: page === 1 }, "‹ Prev"),
      h("span", null, page + " / " + totalPages + " (" + sorted.length + ")"),
      h("button", { onClick: function () { setPage(Math.min(totalPages, page + 1)); }, disabled: page === totalPages }, "Next ›")
    )
  );
}

// ---------- Timeline (vertical chronological events) ----------
// events: [{ date: '2026-06-23', title: '...', body?: '...', tone?: 'info|success|warn|danger' }]
export function Timeline(props) {
  var events = (props && props.events) || [];
  var title = props.title;
  if (!events.length) return h("div", { className: "wf-timeline empty" }, "No events");
  return h("div", { className: "wf-timeline" },
    title && h("div", { className: "wf-timeline-title" }, title),
    events.map(function (e, i) {
      var tone = e.tone || "info";
      return h("div", { key: i, className: "wf-timeline-item wf-timeline-" + tone },
        h("div", { className: "wf-timeline-dot" }),
        h("div", { className: "wf-timeline-card" },
          h("div", { className: "wf-timeline-date" }, e.date),
          h("div", { className: "wf-timeline-title-text" }, e.title),
          e.body && h("div", { className: "wf-timeline-body" }, e.body)
        )
      );
    })
  );
}

// ---------- KanbanBoard (columns + draggable cards) ----------
// columns: [{ id, title, cards: [{ id, title, body?, tone? }] }]
// options: { onMove?(cardId, fromCol, toCol)?, readonly? }
export function KanbanBoard(props) {
  var initialColumns = (props && props.columns) || [];
  var title = props.title;
  var opts = (props && props.options) || {};
  var readonly = !!opts.readonly;
  var _useState = useState(initialColumns), columns = _useState[0], setColumns = _useState[1];
  var _useState2 = useState(null), dragInfo = _useState2[0], setDragInfo = _useState2[1];

  function onDragStart(e, cardId, fromColId) {
    if (readonly) return;
    e.dataTransfer.setData("text/plain", JSON.stringify({ cardId: cardId, fromColId: fromColId }));
    e.dataTransfer.effectAllowed = "move";
    setDragInfo({ cardId: cardId, fromColId: fromColId });
  }
  function onDragOver(e) { if (!readonly) { e.preventDefault(); e.dataTransfer.dropEffect = "move"; } }
  function onDrop(e, toColId) {
    if (readonly) return;
    e.preventDefault();
    try {
      var data = JSON.parse(e.dataTransfer.getData("text/plain"));
      if (data.fromColId === toColId) { setDragInfo(null); return; }
      var next = columns.map(function (c) {
        var cards = c.cards.slice();
        if (c.id === data.fromColId) cards = cards.filter(function (cd) { return cd.id !== data.cardId; });
        return Object.assign({}, c, { cards: cards });
      }).map(function (c) {
        if (c.id !== toColId) return c;
        var movingCard = null;
        columns.forEach(function (src) {
          if (src.id === data.fromColId) src.cards.forEach(function (cd) { if (cd.id === data.cardId) movingCard = cd; });
        });
        return Object.assign({}, c, { cards: c.cards.concat([movingCard].filter(Boolean)) });
      });
      setColumns(next);
      setDragInfo(null);
      if (typeof opts.onMove === "function") opts.onMove(data.cardId, data.fromColId, toColId);
    } catch (e) { setDragInfo(null); }
  }

  return h("div", { className: "wf-kanban" },
    title && h("div", { className: "wf-kanban-title" }, title),
    h("div", { className: "wf-kanban-board" + (readonly ? " readonly" : "") },
      columns.map(function (col) {
        var isDragOver = dragInfo && dragInfo.fromColId !== col.id;
        return h("div", {
          key: col.id, className: "wf-kanban-col" + (isDragOver ? " drag-target" : ""),
          onDragOver: onDragOver, onDrop: function (e) { onDrop(e, col.id); }
        },
          h("div", { className: "wf-kanban-col-head" },
            h("span", { className: "wf-kanban-col-title" }, col.title),
            h("span", { className: "wf-kanban-col-count" }, col.cards.length)
          ),
          h("div", { className: "wf-kanban-col-cards" },
            col.cards.map(function (card) {
              var dragging = dragInfo && dragInfo.cardId === card.id;
              var tone = card.tone || "default";
              return h("div", {
                key: card.id,
                className: "wf-kanban-card wf-kanban-card-" + tone + (dragging ? " dragging" : ""),
                draggable: !readonly,
                onDragStart: function (e) { onDragStart(e, card.id, col.id); }
              },
                h("div", { className: "wf-kanban-card-title" }, card.title),
                card.body && h("div", { className: "wf-kanban-card-body" }, card.body)
              );
            })
          )
        );
      })
    )
  );
}

// ---------- GanttChart (timeline with tasks + dependencies) ----------
// tasks: [{ id, name, start: dayIndex, end: dayIndex, lane: 'lane-id', progress?: 0-100, deps?: [taskId,...] }]
// lanes: [{ id, label, color? }]
// options: { startLabel?, endLabel?, totalDays?, today? }
export function GanttChart(props) {
  var tasks = (props && props.tasks) || [];
  var lanes = (props && props.lanes) || [];
  var title = props.title;
  var opts = (props && props.options) || {};
  var totalDays = opts.totalDays || 30;
  var startLabel = opts.startLabel || "Day 1";
  var endLabel = opts.endLabel || "Day " + totalDays;
  var today = opts.today;

  // Default: one lane "default"
  if (!lanes.length) lanes = [{ id: "default", label: "Tasks" }];
  var laneIds = lanes.map(function (l) { return l.id; });

  return h("div", { className: "wf-gantt" },
    title && h("div", { className: "wf-gantt-title" }, title),
    h("div", { className: "wf-gantt-grid", style: { gridTemplateColumns: "140px 1fr" } },
      // Header row: empty lane column + day scale
      h("div", { className: "wf-gantt-cell wf-gantt-lane-head" }, ""),
      h("div", { className: "wf-gantt-cell wf-gantt-day-scale" },
        Array.from({ length: totalDays }).map(function (_, i) {
          var isToday = today === (i + 1);
          return h("div", { key: i, className: "wf-gantt-day" + (isToday ? " today" : "") },
            i === 0 || i === totalDays - 1 || isToday ? (i + 1) : ""
          );
        })
      ),
      // Lane rows
      lanes.map(function (lane) {
        return h("div", { key: lane.id, className: "wf-gantt-row", style: { gridTemplateColumns: "140px 1fr" } },
          h("div", { className: "wf-gantt-cell wf-gantt-lane-label" },
            h("span", { className: "wf-gantt-lane-dot", style: { background: lane.color || "var(--accent)" } }),
            lane.label
          ),
          h("div", { className: "wf-gantt-cell wf-gantt-track" },
            Array.from({ length: totalDays }).map(function (_, i) {
              return h("div", { key: i, className: "wf-gantt-day-cell" + (today === (i + 1) ? " today" : "") });
            }),
            tasks.filter(function (t) { return (t.lane || "default") === lane.id; }).map(function (task) {
              var left = (task.start - 1) / totalDays * 100;
              var width = (task.end - task.start + 1) / totalDays * 100;
              var color = task.color || lane.color || "var(--accent)";
              return h("div", {
                key: task.id,
                className: "wf-gantt-task",
                style: { left: left + "%", width: width + "%", background: color },
                title: task.name + " (" + task.start + "-" + task.end + ")"
              },
                h("div", { className: "wf-gantt-task-name" }, task.name),
                typeof task.progress === "number" && task.progress > 0 && task.progress < 100 && h("div", { className: "wf-gantt-task-progress", style: { width: task.progress + "%" } }),
                task.deps && task.deps.length > 0 && h("div", { className: "wf-gantt-task-deps" }, "↳ " + task.deps.join(", "))
              );
            })
          )
        );
      })
    ),
    h("div", { className: "wf-gantt-footer" },
      h("span", null, startLabel + " → " + endLabel),
      tasks.length > 0 && h("span", { className: "wf-gantt-task-count" }, tasks.length + " tasks")
    )
  );
}

// ---------- Screen (frame wrapper) ----------
export function Screen(props) {
  var title = props.title || "Screen";
  var url = props.url || "/path";
  var mode = props.mode; // "wireframe" (default) | "hi-fi"
  var device = props.device || "desktop"; // "desktop" | "mobile"
  var children = props.children;
  var className = "wf-screen wf-mode-" + mode + " wf-device-" + device;
  return h("div", { className: className, "data-title": title },
    device === "mobile"
      ? h("div", { className: "wf-mobile-notch" },
          h("span", { className: "wf-mobile-notch-speaker" }),
          h("span", { className: "wf-mobile-notch-camera" })
        )
      : h("div", { className: "wf-screen-header" },
          h("span", { className: "wf-screen-dot" }),
          h("span", { className: "wf-screen-dot" }),
          h("span", { className: "wf-screen-dot" }),
          h("span", { className: "wf-screen-url" }, url)
        ),
    h("div", { className: "wf-screen-body" }, children),
    device === "mobile" && h("div", { className: "wf-mobile-home-indicator" })
  );
}

// ---------- ViewModeToggle (plan-level: wireframe vs hi-fi) ----------
export function ViewModeToggle() {
  var _useState = useState(function () {
    try {
      var v = localStorage.getItem(lsKey("view-mode", getSlug()));
      return v || "wireframe";
    } catch (e) { return "wireframe"; }
  }), mode = _useState[0], setMode = _useState[1];

  function toggle(next) {
    setMode(next);
    try { localStorage.setItem(lsKey("view-mode", getSlug()), next); } catch (e) {}
    document.documentElement.setAttribute("data-wf-mode", next);
  }

  // Apply on mount
  if (typeof document !== "undefined") {
    document.documentElement.setAttribute("data-wf-mode", mode);
  }

  return h("div", { className: "wf-view-toggle", role: "tablist", "aria-label": "View mode" },
    h("button", {
      className: "wf-view-tab" + (mode === "wireframe" ? " active" : ""),
      onClick: function () { toggle("wireframe"); },
      "aria-pressed": mode === "wireframe"
    }, "🎨 Wireframe"),
    h("button", {
      className: "wf-view-tab" + (mode === "hi-fi" ? " active" : ""),
      onClick: function () { toggle("hi-fi"); },
      "aria-pressed": mode === "hi-fi"
    }, "✨ Hi-Fi")
  );
}

// Plugins: when window.DPLAN_PLUGINS is set (array of component maps), merge them
// into the default components map. See docs/plugin-api.md.
function resolveComponents() {
  var map = {
    PlanHeader: PlanHeader, ProgressBar: ProgressBar, PlanSidebar: PlanSidebar,
    PlanStep: PlanStep, Mermaid: Mermaid, Wireframe: Wireframe, Callout: Callout,
    DecisionForm: DecisionForm, Decision: Decision, CopyDecisions: CopyDecisions,
    Screen: Screen, ScreenFrame: ScreenFrame, TopNav: TopNav, SideNav: SideNav,
    Layout: Layout, Breadcrumb: Breadcrumb, Tabs: Tabs, Button: Button, Field: Field,
    Input: Input, Select: Select, Textarea: Textarea, Checkbox: Checkbox, Radio: Radio,
    Toggle: Toggle, Card: Card, Modal: Modal, Toast: Toast, ToastStack: ToastStack,
    AlertBanner: AlertBanner, Table: Table, Avatar: Avatar, Badge: Badge, Stat: Stat,
    Divider: Divider, TextDivider: TextDivider, Row: Row, Col: Col, Grid: Grid,
    ViewModeToggle: ViewModeToggle
  };
  if (typeof window !== "undefined" && Array.isArray(window.DPLAN_PLUGINS)) {
    for (var i = 0; i < window.DPLAN_PLUGINS.length; i++) {
      var plugin = window.DPLAN_PLUGINS[i];
      if (plugin && typeof plugin === "object") {
        for (var k in plugin) {
          if (Object.prototype.hasOwnProperty.call(plugin, k)) map[k] = plugin[k];
        }
      }
    }
  }
  return map;
}

// ---------- ScreenFrame (with title + description above the screen) ----------
export function ScreenFrame(props) {
  var title = props.title || "Wireframe";
  var desc = props.desc;
  var children = props.children;
  return h("div", { className: "wf-frame" },
    h("div", { className: "wf-frame-title" }, title),
    desc && h("div", { className: "wf-frame-desc" }, desc),
    children
  );
}

// ---------- TopNav ----------
export function TopNav(props) {
  var brand = props.brand || "Logo";
  var links = props.links || ["Home", "Products", "Pricing", "Docs"];
  var cta = props.cta || "Sign in";
  return h("header", { className: "wf-topnav" },
    h("div", { className: "wf-logo" }, brand),
    h("nav", { className: "wf-nav-links" },
      links.map(function (l, i) {
        return h("a", { key: i, className: "wf-nav-link" + (i === 0 ? " active" : "") }, l);
      })
    ),
    h("div", { className: "wf-topnav-cta" },
      h(Button, { variant: "ghost", size: "sm" }, cta),
      h(Button, { variant: "primary", size: "sm" }, "Get started")
    )
  );
}

// ---------- SideNav ----------
export function SideNav(props) {
  var items = props.items || ["Dashboard", "Projects", "Team", "Reports"];
  var sections = props.sections;
  return h("aside", { className: "wf-sidenav" },
    h("div", { className: "wf-logo", style: { marginBottom: 16 } }, props.brand || "App"),
    sections
      ? sections.map(function (s, i) {
          return h("div", { key: i },
            h("div", { className: "wf-sidenav-section" }, s.label),
            (s.items || []).map(function (it, j) {
              return h("div", { key: j, className: "wf-sidenav-item" + (j === 0 ? " active" : "") },
                h("span", { className: "wf-sidenav-icon" }),
                it
              );
            })
          );
        })
      : items.map(function (it, i) {
          return h("div", { key: i, className: "wf-sidenav-item" + (i === 0 ? " active" : "") },
            h("span", { className: "wf-sidenav-icon" }),
            it
          );
        })
  );
}

// ---------- Layout (with sidenav) ----------
export function Layout(props) {
  return h("div", { className: "wf-layout-with-sidenav" },
    h(SideNav, props),
    h("div", { className: "wf-main" }, props.children)
  );
}

// ---------- Breadcrumb ----------
export function Breadcrumb(props) {
  var items = props.items || ["Home", "Section", "Page"];
  return h("nav", { className: "wf-breadcrumb" },
    items.map(function (it, i) {
      var isLast = i === items.length - 1;
      return h("span", { key: i },
        h("span", { className: "wf-breadcrumb-item" + (isLast ? " current" : "") }, it),
        !isLast && h("span", { className: "wf-breadcrumb-sep" }, "›")
      );
    })
  );
}

// ---------- Tabs ----------
export function Tabs(props) {
  var tabs = props.tabs || ["Overview", "Activity", "Settings"];
  return h("div", { className: "wf-tabs" },
    tabs.map(function (t, i) {
      return h("div", { key: i, className: "wf-tab" + (i === 0 ? " active" : "") }, t);
    })
  );
}

// ---------- Button ----------
export function Button(props) {
  var variant = props.variant || "secondary";
  var size = props.size; // "sm" | "lg"
  var icon = props.icon;
  var fullWidth = props.fullWidth;
  var className = wfClass("wf-btn", "wf-btn-" + variant, size && "wf-btn-" + size, fullWidth && "wf-btn-full");
  var style = fullWidth ? { width: "100%", justifyContent: "center" } : null;
  return h("button", { className: className, type: "button", style: style, disabled: props.disabled },
    icon && h("span", null, icon + " "),
    props.children
  );
}

// ---------- Field (label + input wrapper) ----------
export function Field(props) {
  var label = props.label;
  var required = props.required;
  var help = props.help;
  var error = props.error;
  return h("div", { className: "wf-field" },
    label && h("label", { className: "wf-label" },
      label,
      required && h("span", { className: "wf-required" }, " *")
    ),
    props.children,
    help && h("div", { className: "wf-help" + (error ? " wf-help-error" : "") }, help)
  );
}

// ---------- Input ----------
export function Input(props) {
  return h("input", {
    className: "wf-input",
    type: props.type || "text",
    placeholder: props.placeholder || "Lorem ipsum",
    disabled: props.disabled,
    defaultValue: props.value
  });
}

// ---------- Select ----------
export function Select(props) {
  var options = props.options || ["Option A", "Option B", "Option C"];
  return h("select", { className: "wf-select", defaultValue: props.value },
    h("option", { value: "" }, props.placeholder || "Choose…"),
    options.map(function (o, i) {
      var value = typeof o === "string" ? o : o.value;
      var label = typeof o === "string" ? o : o.label;
      return h("option", { key: i, value: value }, label);
    })
  );
}

// ---------- Textarea ----------
export function Textarea(props) {
  return h("textarea", {
    className: "wf-textarea",
    rows: props.rows || 3,
    placeholder: props.placeholder || "Lorem ipsum dolor sit amet…",
    defaultValue: props.value
  });
}

// ---------- Checkbox ----------
export function Checkbox(props) {
  var checked = !!props.checked;
  return h("label", { className: "wf-checkbox" + (checked ? " checked" : "") },
    h("span", { className: "wf-checkbox-box" }),
    h("span", null, props.children || "Lorem ipsum")
  );
}

// ---------- Radio ----------
export function Radio(props) {
  var checked = !!props.checked;
  return h("label", { className: "wf-radio" + (checked ? " checked" : "") },
    h("span", { className: "wf-radio-circle" }),
    h("span", null, props.children || "Lorem ipsum")
  );
}

// ---------- Toggle ----------
export function Toggle(props) {
  return h("span", { className: "wf-toggle" + (props.on ? " on" : "") });
}

// ---------- Card ----------
export function Card(props) {
  var title = props.title;
  var footer = props.footer;
  var image = props.image;
  return h("div", { className: "wf-card" },
    image && h("div", { className: "wf-card-image" }, props.imagePlaceholder || "🖼 Image"),
    title !== undefined
      ? h("div", { className: "wf-card-header" + (title ? "" : " placeholder") }, title || "Card title")
      : null,
    h("div", { className: "wf-card-body" + (props.body ? "" : " placeholder") },
      props.children || props.body || "Lorem ipsum dolor sit amet, consectetur adipiscing elit."
    ),
    footer && h("div", { className: "wf-card-footer" }, footer)
  );
}

// ---------- Modal ----------
export function Modal(props) {
  var title = props.title || "Modal title";
  var open = props.open !== false;
  if (!open) return null;
  return h("div", { className: "wf-modal-backdrop" },
    h("div", { className: "wf-modal" },
      h("div", { className: "wf-modal-header" }, title),
      h("div", { className: "wf-modal-body" }, props.children || "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor."),
      h("div", { className: "wf-modal-footer" },
        h(Button, { variant: "ghost" }, "Cancel"),
        h(Button, { variant: props.destructive ? "destructive" : "primary" }, props.confirmLabel || "Confirm")
      )
    )
  );
}

// ---------- Toast / ToastStack ----------
export function Toast(props) {
  var tone = props.tone || "info";
  return h("div", { className: "wf-toast " + tone },
    h("span", { className: "wf-toast-icon" }),
    h("div", { className: "wf-toast-body" }, props.children || "Lorem ipsum notification"),
    h("span", { className: "wf-toast-close" }, "✕")
  );
}
export function ToastStack(props) {
  return h("div", { className: "wf-toast-stack" }, props.children);
}

// ---------- Alert ----------
export function AlertBanner(props) {
  var tone = props.tone || "info";
  return h("div", { className: "wf-alert " + tone },
    h("div", { className: "wf-alert-icon" }),
    h("div", null, props.children || "Lorem ipsum alert message.")
  );
}

// ---------- Table ----------
export function Table(props) {
  var columns = props.columns || ["Name", "Status", "Created", "Owner"];
  var rows = props.rows || 3;
  return h("table", { className: "wf-table" },
    h("thead", null,
      h("tr", null,
        columns.map(function (c, i) {
          return h("th", { key: i, className: "placeholder" }, c);
        })
      )
    ),
    h("tbody", null,
      Array.from({ length: rows }).map(function (_, r) {
        return h("tr", { key: r },
          columns.map(function (_, c) {
            return h("td", { key: c }, "_____________");
          })
        );
      })
    )
  );
}

// ---------- Avatar ----------
export function Avatar(props) {
  var size = props.size; // "sm" | "lg"
  return h("span", { className: "wf-avatar" + (size ? " wf-avatar-" + size : "") },
    props.children || props.initials || "AB"
  );
}

// ---------- Badge ----------
export function Badge(props) {
  var variant = props.variant;
  return h("span", { className: "wf-badge" + (variant ? " " + variant : "") },
    props.children || "Badge"
  );
}

// ---------- Stat (metric) ----------
export function Stat(props) {
  return h("div", { className: "wf-stat" },
    h("div", { className: "wf-stat-value" }, props.value || "00,000"),
    h("div", { className: "wf-stat-label" }, props.label || "Lorem ipsum"),
    props.delta && h("div", { className: "wf-stat-delta" }, "↗ " + props.delta)
  );
}

// ---------- Divider / TextDivider / Row / Col ----------
export function Divider() { return h("div", { className: "wf-divider" }); }
export function TextDivider(props) { return h("div", { className: "wf-text-divider" }, props.children || "or"); }
export function Row(props) { return h("div", { className: "wf-row" }, props.children); }
export function Col(props) { return h("div", { className: "wf-col" }, props.children); }
export function Grid(props) {
  var cols = props.cols || 2;
  return h("div", { className: "wf-grid-" + cols }, props.children);
}

export default {
  PlanHeader: PlanHeader,
  ProgressBar: ProgressBar,
  PlanSidebar: PlanSidebar,
  PlanStep: PlanStep,
  Mermaid: Mermaid,
  Wireframe: Wireframe,
  Callout: Callout,
  DecisionForm: DecisionForm,
  Decision: Decision,
  CopyDecisions: CopyDecisions,
  // Wireframe (Figkit-style HTML)
  Screen: Screen,
  ScreenFrame: ScreenFrame,
  TopNav: TopNav,
  SideNav: SideNav,
  Layout: Layout,
  Breadcrumb: Breadcrumb,
  Tabs: Tabs,
  Button: Button,
  Field: Field,
  Input: Input,
  Select: Select,
  Textarea: Textarea,
  Checkbox: Checkbox,
  Radio: Radio,
  Toggle: Toggle,
  Card: Card,
  Modal: Modal,
  Toast: Toast,
  ToastStack: ToastStack,
  AlertBanner: AlertBanner,
  Table: Table,
  Avatar: Avatar,
  Badge: Badge,
  Stat: Stat,
  Divider: Divider,
  TextDivider: TextDivider,
  Row: Row,
  Col: Col,
  Grid: Grid,
  ViewModeToggle: ViewModeToggle,
  // Data viz & interactive
  BarChart: BarChart,
  DataTable: DataTable,
  Timeline: Timeline,
  KanbanBoard: KanbanBoard,
  GanttChart: GanttChart,
  // Plugin API
  resolveComponents: resolveComponents
};