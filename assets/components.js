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

// el(type, props, ...children): friendly alias for h() for use inside
// defineComponent() render trees. `type` may be an HTML tag string OR a
// component function (Stack, Button, …). Identical semantics to h().
export function el(type, props) {
  const children = Array.prototype.slice.call(arguments, 2);
  return h.apply(null, [type, props].concat(children));
}

// ====================================================================
// DESIGN-SYSTEM TOKEN HELPERS (back the primitives below)
// ====================================================================
// Registry of components created via defineComponent(). Declared at module
// load so it exists during the Node compile pass (window undefined) AND in the
// browser. resolveComponents() merges it between the built-ins and DPLAN_PLUGINS.
var DEFINED_COMPONENTS = {};

// Spacing scale: keyword | number(px) | raw-css -> css value (var on the 4pt scale).
var SPACE = {
  none: "0", "0": "0",
  xs: "var(--space-1)", sm: "var(--space-2)", md: "var(--space-4)",
  lg: "var(--space-6)", xl: "var(--space-8)", "2xl": "var(--space-12)", "3xl": "var(--space-16)"
};
function space(v) {
  if (v == null) return null;
  if (typeof v === "number") return v + "px";
  if (Object.prototype.hasOwnProperty.call(SPACE, v)) return SPACE[v];
  return String(v); // pass through raw css ("1rem", "10px", "var(--x)")
}
function cssLen(v) {
  if (v == null) return null;
  return typeof v === "number" ? v + "px" : String(v);
}
// Shallow clone so per-instance array/object defaults are never shared.
function cloneDefault(v) {
  if (Array.isArray(v)) return v.slice();
  if (v && typeof v === "object") return Object.assign({}, v);
  return v;
}
function bgTok(v) {
  if (!v) return null;
  var map = {
    subtle: "var(--bg-subtle)", elev: "var(--bg-elev)", sunken: "var(--bg-sunken)",
    "accent-soft": "var(--accent-soft)", accent: "var(--accent)",
    surface: "var(--wf-surface)", "surface-subtle": "var(--wf-surface-subtle)"
  };
  return map[v] || v;
}
function radiusTok(v) {
  if (v == null || v === false) return null;
  if (v === true) return "var(--radius)";
  if (typeof v === "number") return v + "px";
  var map = {
    none: "0", xs: "var(--radius-xs)", sm: "var(--radius-sm)", md: "var(--radius)",
    lg: "var(--radius-lg)", xl: "var(--radius-xl)", pill: "var(--radius-pill)", circle: "var(--radius-circle)"
  };
  return map[v] || v;
}
function shadowTok(v) {
  if (!v) return null;
  if (v === true) return "var(--shadow-sm)";
  var map = { xs: "var(--shadow-xs)", sm: "var(--shadow-sm)", md: "var(--shadow-md)", lg: "var(--shadow-lg)" };
  return map[v] || v;
}
// Text tone -> chrome color token (primitives adapt to the plan theme, not the wf gray-box).
function toneTok(v) {
  var map = {
    default: "var(--fg)", muted: "var(--muted)", accent: "var(--accent)",
    good: "var(--good)", warn: "var(--warn)", bad: "var(--bad)", "on-accent": "var(--fg-on-accent)"
  };
  return map[v] || v;
}
function weightTok(v) {
  if (v == null) return null;
  if (typeof v === "number") return v;
  var map = {
    regular: "var(--weight-regular)", medium: "var(--weight-medium)",
    semibold: "var(--weight-semibold)", bold: "var(--weight-bold)"
  };
  return map[v] || v;
}
var ALIGN_MAP = { start: "flex-start", center: "center", end: "flex-end", stretch: "stretch", baseline: "baseline" };
var JUSTIFY_MAP = { start: "flex-start", center: "center", end: "flex-end", between: "space-between", around: "space-around", evenly: "space-evenly" };
function alignVal(v) { return v ? (ALIGN_MAP[v] || v) : null; }
function justifyVal(v) { return v ? (JUSTIFY_MAP[v] || v) : null; }

// Apply box-model padding/margin shorthands onto a style object.
function applyBoxModel(style, p) {
  if (p.p != null) style.padding = space(p.p);
  if (p.px != null) { style.paddingLeft = space(p.px); style.paddingRight = space(p.px); }
  if (p.py != null) { style.paddingTop = space(p.py); style.paddingBottom = space(p.py); }
  if (p.pt != null) style.paddingTop = space(p.pt);
  if (p.pr != null) style.paddingRight = space(p.pr);
  if (p.pb != null) style.paddingBottom = space(p.pb);
  if (p.pl != null) style.paddingLeft = space(p.pl);
  if (p.m != null) style.margin = space(p.m);
  if (p.mx != null) { style.marginLeft = space(p.mx); style.marginRight = space(p.mx); }
  if (p.my != null) { style.marginTop = space(p.my); style.marginBottom = space(p.my); }
  if (p.mt != null) style.marginTop = space(p.mt);
  if (p.mr != null) style.marginRight = space(p.mr);
  if (p.mb != null) style.marginBottom = space(p.mb);
  if (p.ml != null) style.marginLeft = space(p.ml);
  return style;
}
// Apply surface shorthands (bg/border/radius/shadow/size) onto a style object.
function applySurface(style, p) {
  if (p.bg) style.background = bgTok(p.bg);
  if (p.border) style.border = "1px solid " + (p.border === "strong" ? "var(--border-strong)" : "var(--border)");
  if (p.radius != null) style.borderRadius = radiusTok(p.radius);
  if (p.shadow != null && p.shadow !== false) style.boxShadow = shadowTok(p.shadow);
  if (p.w != null) style.width = cssLen(p.w);
  if (p.h != null) style.height = cssLen(p.h);
  if (p.maxW != null) style.maxWidth = cssLen(p.maxW);
  if (p.minW != null) style.minWidth = cssLen(p.minW);
  return style;
}
// Forward only safe DOM attributes (events, a11y, ids) — never styling props.
function passAttrs(p) {
  var out = {};
  var keys = ["id", "role", "title", "tabIndex", "onClick", "onMouseEnter", "onMouseLeave",
    "onFocus", "onBlur", "onKeyDown", "htmlFor", "name", "href", "target", "rel"];
  for (var i = 0; i < keys.length; i++) if (p[keys[i]] != null) out[keys[i]] = p[keys[i]];
  for (var k in p) {
    if (!Object.prototype.hasOwnProperty.call(p, k)) continue;
    if (k.indexOf("data-") === 0 || k.indexOf("aria-") === 0) out[k] = p[k];
  }
  return out;
}

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

// ====================================================================
// defineComponent() — declarative factory for custom components
// ====================================================================
// Compose new, reusable, named components from the existing primitives without
// editing this file. The returned function works as a normal MDX component AND
// nests inside other render() trees. It self-registers so resolveComponents()
// (and therefore MDX + plugins) can see it.
//
//   export const PricingCard = defineComponent("PricingCard", {
//     props: { plan: "Free", price: { default: "$0", required: true } },
//     render: (p) => Stack({ gap: "md", children: [
//       Heading({ level: 3, children: p.plan }),
//       Text({ size: "xl", weight: "bold", children: p.price }),
//       Button({ variant: "primary", children: "Choose" }),
//     ]}),
//   });
//
// Validation is ADVISORY (console.warn, never throw) — a thrown error inside an
// MDX component would blank the whole page at file:// with no error boundary.
export function defineComponent(name, spec) {
  spec = spec || {};
  if (typeof spec.render !== "function") {
    console.warn("[dynamic-plan] defineComponent('" + name + "'): missing render() function; rendering nothing.");
    var Noop = function () { return null; };
    Noop.displayName = spec.displayName || name;
    return Noop;
  }
  var propSpec = spec.props || {};

  function resolveProps(incoming) {
    incoming = incoming || {};
    var resolved = {};
    for (var key in propSpec) {
      if (!Object.prototype.hasOwnProperty.call(propSpec, key)) continue;
      var def = propSpec[key];
      var schema = (def && typeof def === "object" && !Array.isArray(def) &&
        ("default" in def || "required" in def || "oneOf" in def || "type" in def || "coerce" in def))
        ? def : { default: def };
      var has = Object.prototype.hasOwnProperty.call(incoming, key) && incoming[key] !== undefined;
      var value = has ? incoming[key] : cloneDefault(schema.default);
      if (!has && schema.required) {
        console.warn("[dynamic-plan] <" + name + ">: required prop '" + key + "' was not provided.");
      }
      if (has && schema.type && typeof value !== schema.type) {
        console.warn("[dynamic-plan] <" + name + ">: prop '" + key + "' expected " + schema.type + ", got " + typeof value + ".");
      }
      if (has && Array.isArray(schema.oneOf) && schema.oneOf.indexOf(value) === -1) {
        console.warn("[dynamic-plan] <" + name + ">: prop '" + key + "'=" + JSON.stringify(value) + " not in [" + schema.oneOf.join(", ") + "]; using default.");
        value = cloneDefault(schema.default);
      }
      if (typeof schema.coerce === "function") {
        try { value = schema.coerce(value); } catch (e) {}
      }
      resolved[key] = value;
    }
    // Pass through undeclared props untouched (className, style, onClick, data-*, children…).
    for (var ik in incoming) {
      if (!Object.prototype.hasOwnProperty.call(incoming, ik)) continue;
      if (!(ik in resolved)) resolved[ik] = incoming[ik];
    }
    return resolved;
  }

  function Defined(props) {
    var resolved = resolveProps(props);
    try {
      return spec.render(resolved);
    } catch (e) {
      console.warn("[dynamic-plan] <" + name + "> render error: " + (e && e.message ? e.message : e));
      return null;
    }
  }
  Defined.displayName = spec.displayName || name;

  // Register into the module-level registry that resolveComponents() merges
  // (built-ins -> DEFINED_COMPONENTS -> DPLAN_PLUGINS). Overwrites on redefine so
  // the newest definition wins. Populated at module-eval, before the single
  // bootstrap resolveComponents() call — so it works in Node compile AND browser
  // with no window dependency.
  if (spec.register !== false) DEFINED_COMPONENTS[name] = Defined;
  return Defined;
}

// ====================================================================
// PRIMITIVES (token-backed composition layer)
// ====================================================================
var SIZE_TOKEN = {
  "2xs": "var(--text-2xs)", xs: "var(--text-xs)", sm: "var(--text-sm)", base: "var(--text-base)",
  md: "var(--text-base)", lg: "var(--text-lg)", xl: "var(--text-xl)",
  "2xl": "var(--text-2xl)", "3xl": "var(--text-3xl)", "4xl": "var(--text-4xl)"
};
var LEADING_TOKEN = {
  "2xs": "var(--leading-2xs)", xs: "var(--leading-xs)", sm: "var(--leading-sm)", base: "var(--leading-base)",
  md: "var(--leading-base)", lg: "var(--leading-lg)", xl: "var(--leading-xl)",
  "2xl": "var(--leading-2xl)", "3xl": "var(--leading-3xl)", "4xl": "var(--leading-4xl)"
};
function sizeTok(v) { return v == null ? null : (SIZE_TOKEN[v] || (typeof v === "number" ? v + "px" : v)); }
function leadingTok(v) { return LEADING_TOKEN[v] || "var(--leading-default)"; }

// ---------- Box (box-model + surface atom) ----------
export function Box(props) {
  props = props || {};
  var style = {};
  applyBoxModel(style, props);
  applySurface(style, props);
  if (props.style) Object.assign(style, props.style);
  return h(props.as || "div",
    Object.assign({ className: wfClass("dp-box", props.className), style: style }, passAttrs(props)),
    props.children);
}

// ---------- Stack (vertical flex flow) ----------
export function Stack(props) {
  props = props || {};
  var style = { display: "flex", flexDirection: "column", gap: space(props.gap == null ? "md" : props.gap) };
  if (props.align) style.alignItems = alignVal(props.align);
  if (props.justify) style.justifyContent = justifyVal(props.justify);
  applyBoxModel(style, props);
  applySurface(style, props);
  if (props.style) Object.assign(style, props.style);
  return h(props.as || "div",
    Object.assign({ className: wfClass("dp-stack", props.className), style: style }, passAttrs(props)),
    props.children);
}

// ---------- Inline (horizontal flex row; modern Row) ----------
export function Inline(props) {
  props = props || {};
  var style = {
    display: "flex", flexDirection: "row",
    gap: space(props.gap == null ? "sm" : props.gap),
    alignItems: alignVal(props.align || "center"),
    flexWrap: props.wrap === false ? "nowrap" : "wrap"
  };
  if (props.justify) style.justifyContent = justifyVal(props.justify);
  applyBoxModel(style, props);
  applySurface(style, props);
  if (props.style) Object.assign(style, props.style);
  return h(props.as || "div",
    Object.assign({ className: wfClass("dp-inline", props.className), style: style }, passAttrs(props)),
    props.children);
}

// ---------- Text ----------
export function Text(props) {
  props = props || {};
  var size = props.size || "md";
  var style = { fontSize: sizeTok(size), lineHeight: leadingTok(size) };
  if (props.weight) style.fontWeight = weightTok(props.weight);
  if (props.tone) style.color = toneTok(props.tone);
  if (props.mono) style.fontFamily = "var(--font-mono)";
  if (props.align) style.textAlign = props.align;
  if (props.truncate === true) {
    style.whiteSpace = "nowrap"; style.overflow = "hidden"; style.textOverflow = "ellipsis"; style.maxWidth = "100%"; style.display = "block";
  } else if (typeof props.truncate === "number") {
    style.display = "-webkit-box"; style.WebkitBoxOrient = "vertical"; style.WebkitLineClamp = String(props.truncate); style.overflow = "hidden";
  }
  applyBoxModel(style, props);
  if (props.style) Object.assign(style, props.style);
  return h(props.as || "span",
    Object.assign({ className: wfClass("dp-text", props.className), style: style }, passAttrs(props)),
    props.children);
}

// ---------- Heading (semantic hN, visual size decoupled from level) ----------
var HEADING_SIZE = { 1: "var(--text-3xl)", 2: "var(--text-2xl)", 3: "var(--text-xl)", 4: "var(--text-lg)", 5: "var(--text-base)", 6: "var(--text-sm)" };
export function Heading(props) {
  props = props || {};
  var level = props.level || 2;
  if (level < 1) level = 1;
  if (level > 6) level = 6;
  var style = {
    fontSize: props.size ? sizeTok(props.size) : HEADING_SIZE[level],
    lineHeight: "1.25",
    fontWeight: weightTok(props.weight || "semibold"),
    margin: 0,
    letterSpacing: "-0.01em"
  };
  if (props.tone) style.color = toneTok(props.tone);
  applyBoxModel(style, props);
  if (props.style) Object.assign(style, props.style);
  return h("h" + level,
    Object.assign({ className: wfClass("dp-heading", props.className), style: style }, passAttrs(props)),
    props.children);
}

// ---------- Spacer ----------
export function Spacer(props) {
  props = props || {};
  if (props.grow) return h("div", { className: wfClass("dp-spacer-grow", props.className), "aria-hidden": "true", style: Object.assign({ flex: "1 1 auto" }, props.style) });
  var axis = props.axis === "x" ? "x" : "y";
  var sz = space(props.size == null ? "md" : props.size);
  var style = axis === "x" ? { display: "inline-block", width: sz, flex: "0 0 auto" } : { height: sz };
  if (props.style) Object.assign(style, props.style);
  return h("div", { className: wfClass("dp-spacer", props.className), "aria-hidden": "true", style: style });
}

// ---------- Skeleton (shimmer loading placeholder) ----------
export function Skeleton(props) {
  props = props || {};
  var lines = props.lines && props.lines > 1 ? props.lines : 1;
  var radius = props.radius != null ? radiusTok(props.radius) : "var(--radius-sm)";
  function bar(i, w) {
    return h("div", { key: i, className: "dp-skeleton", style: { width: w, height: cssLen(props.h || "1em"), borderRadius: radius } });
  }
  if (lines === 1) {
    var single = bar(0, cssLen(props.w || "100%"));
    return (props.style || props.className)
      ? h("div", { className: props.className, style: props.style }, single)
      : single;
  }
  var rows = [];
  for (var i = 0; i < lines; i++) rows.push(bar(i, i === lines - 1 ? "70%" : "100%"));
  return h("div", { className: wfClass("dp-skeleton-group", props.className), style: Object.assign({ display: "flex", flexDirection: "column", gap: "var(--space-2)" }, props.style) }, rows);
}

// ---------- AspectRatio (native CSS aspect-ratio; file:// safe) ----------
export function AspectRatio(props) {
  props = props || {};
  var ratio = props.ratio || 16 / 9;
  if (typeof ratio === "string" && ratio.indexOf(":") !== -1) {
    var parts = ratio.split(":"), a = parseFloat(parts[0]), b = parseFloat(parts[1]);
    ratio = (a && b) ? (a / b) : 16 / 9;
  }
  var style = { aspectRatio: String(ratio), width: cssLen(props.w || "100%"), overflow: "hidden" };
  if (props.radius != null) style.borderRadius = radiusTok(props.radius);
  if (props.bg) style.background = bgTok(props.bg);
  if (props.style) Object.assign(style, props.style);
  return h("div", Object.assign({ className: wfClass("dp-aspect", props.className), style: style }, passAttrs(props)), props.children);
}

// ---------- Icon (emoji-or-placeholder slot; no icon-font dep) ----------
var ICON_SIZE = { xs: "var(--icon-xs)", sm: "var(--icon-sm)", md: "var(--icon-md)", lg: "var(--icon-lg)" };
function isEmoji(str) {
  if (!str || typeof str !== "string") return false;
  if (!/[^\x00-\x7F]/.test(str)) return false; // ASCII (digits, #, *, letters) is never an icon glyph
  // Treat emoji + common pictographic/dingbat/arrow glyphs (checks, arrows, stars) as icons.
  try { return /\p{Emoji}/u.test(str) || /[←-⯿]/.test(str); }
  catch (e) { return str.length <= 3; }
}
export function Icon(props) {
  props = props || {};
  var name = props.name;
  var size = props.size || "md";
  var sz = ICON_SIZE[size] || cssLen(size);
  var style = Object.assign({ width: sz, height: sz, fontSize: sz, lineHeight: 1 }, props.style);
  if (props.tone) style.color = toneTok(props.tone);
  var common = {
    style: style,
    role: props.label ? "img" : undefined,
    "aria-label": props.label || undefined,
    "aria-hidden": props.label ? undefined : "true"
  };
  if (name && isEmoji(name)) {
    return h("span", Object.assign({ className: wfClass("dp-icon", props.className) }, common), name);
  }
  return h("span", Object.assign({ className: wfClass("dp-icon dp-icon-placeholder", props.className) }, common),
    typeof name === "string" && name.length <= 2 ? name : "");
}

// ====================================================================
// NEW WIREFRAME COMPONENTS (built on the primitives + tokens)
// ====================================================================

// ---------- Accordion ----------
export function Accordion(props) {
  props = props || {};
  var items = props.items || [];
  var allowMultiple = !!props.allowMultiple;
  // Namespace id vs index so a numeric/string id can never collide with a
  // fallback index (which would dupe React keys and share open-state).
  function akey(it, i) { return it.id != null ? "id:" + it.id : "i:" + i; }
  var _s = useState(function () {
    var initial = {};
    items.forEach(function (it, i) { if (it.defaultOpen) initial[akey(it, i)] = true; });
    return initial;
  }), open = _s[0], setOpen = _s[1];
  function toggle(key) {
    setOpen(function (prev) {
      var next = allowMultiple ? Object.assign({}, prev) : {};
      next[key] = !prev[key];
      return next;
    });
  }
  return h("div", { className: wfClass("wf-accordion", props.className), style: props.style },
    props.title && h("div", { className: "wf-accordion-title" }, props.title),
    items.map(function (it, i) {
      var key = akey(it, i);
      var isOpen = !!open[key];
      return h("div", { key: key, className: "wf-accordion-item" + (isOpen ? " open" : "") },
        h("button", { type: "button", className: "wf-accordion-header", "aria-expanded": isOpen, onClick: function () { toggle(key); } },
          h("span", { className: "wf-accordion-chevron" }, "▸"),
          h("span", { className: "wf-accordion-header-title" }, it.title)
        ),
        isOpen && h("div", { className: "wf-accordion-body" }, it.body != null ? it.body : it.children)
      );
    })
  );
}

// ---------- Dropdown (menu) ----------
export function Dropdown(props) {
  props = props || {};
  var trigger = props.trigger || "Menu ▾";
  var items = props.items || [];
  var align = props.align === "right" ? "right" : "left";
  var _s = useState(false), open = _s[0], setOpen = _s[1];
  var ref = useRef(null);
  useEffect(function () {
    function onDoc(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener("mousedown", onDoc);
    return function () { document.removeEventListener("mousedown", onDoc); };
  }, []);
  return h("div", { className: wfClass("wf-dropdown", props.className), ref: ref },
    h("button", { type: "button", className: "wf-dropdown-trigger", "aria-haspopup": "menu", "aria-expanded": open, onClick: function () { setOpen(!open); } }, trigger),
    open && h("div", { className: "wf-dropdown-menu wf-dropdown-" + align, role: "menu" },
      items.map(function (it, i) {
        if (it.divider) return h("div", { key: "d" + i, className: "wf-dropdown-divider" });
        return h("button", {
          key: i, type: "button", role: "menuitem", disabled: !!it.disabled,
          className: "wf-dropdown-item" + (it.danger ? " danger" : "") + (it.disabled ? " disabled" : ""),
          onClick: function () { if (!it.disabled) { setOpen(false); if (typeof props.onSelect === "function") props.onSelect(it.value != null ? it.value : it.label); } }
        },
          it.icon && h("span", { className: "wf-dropdown-item-icon" }, it.icon),
          h("span", null, it.label)
        );
      })
    )
  );
}

// ---------- Progress (linear + circular) ----------
export function Progress(props) {
  props = props || {};
  var value = Math.max(0, Math.min(100, props.value == null ? 0 : props.value));
  var variant = props.variant === "circular" ? "circular" : "linear";
  var tone = props.tone || "accent";
  var size = props.size || "md";
  var indeterminate = !!props.indeterminate;
  // Map tone -> a real token (the kit accepts success/danger aliases too).
  var toneVar = { accent: "--wf-accent", good: "--good", success: "--good", warn: "--warn", bad: "--bad", danger: "--bad", info: "--info" }[tone] || "--wf-accent";
  var color = "var(" + toneVar + ")";
  var ariaNow = indeterminate ? undefined : value;
  if (variant === "circular") {
    var dim = size === "sm" ? 36 : size === "lg" ? 72 : 52;
    var stroke = size === "sm" ? 4 : size === "lg" ? 7 : 5;
    var r = (dim - stroke) / 2;
    var circ = 2 * Math.PI * r;
    var off = circ * (1 - value / 100);
    return h("div", { className: wfClass("wf-progress-circular", indeterminate ? "indeterminate" : "", props.className), style: Object.assign({ width: dim, height: dim }, props.style) },
      h("svg", { width: dim, height: dim, viewBox: "0 0 " + dim + " " + dim, role: "progressbar", "aria-valuenow": ariaNow, "aria-valuemin": 0, "aria-valuemax": 100 },
        h("circle", { cx: dim / 2, cy: dim / 2, r: r, fill: "none", stroke: "var(--wf-border)", "stroke-width": stroke }),
        h("circle", { cx: dim / 2, cy: dim / 2, r: r, fill: "none", stroke: color, "stroke-width": stroke, "stroke-linecap": "round", "stroke-dasharray": circ, "stroke-dashoffset": indeterminate ? circ * 0.72 : off, transform: "rotate(-90 " + (dim / 2) + " " + (dim / 2) + ")", style: { transition: "stroke-dashoffset var(--dur-slow) var(--ease-standard)" } })
      ),
      (props.showLabel || props.label != null) && h("div", { className: "wf-progress-circular-label" }, props.label != null ? props.label : value + "%")
    );
  }
  return h("div", { className: wfClass("wf-progress", props.className), style: props.style },
    (props.showLabel || props.label != null) && h("div", { className: "wf-progress-head" },
      h("span", null, props.label != null ? props.label : "Progress"),
      props.showLabel && h("span", { className: "wf-progress-pct" }, value + "%")
    ),
    h("div", { className: "wf-progress-track wf-progress-" + size, role: "progressbar", "aria-valuenow": ariaNow, "aria-valuemin": 0, "aria-valuemax": 100 },
      h("div", { className: "wf-progress-fill" + (indeterminate ? " indeterminate" : ""), style: { width: indeterminate ? "40%" : value + "%", background: color } })
    )
  );
}

// ---------- Spinner ----------
export function Spinner(props) {
  props = props || {};
  var size = props.size || "md";
  var spin = h("span", { className: wfClass("wf-spinner", "wf-spinner-" + size, props.inline ? "wf-spinner-inline" : "", props.className), role: "status", "aria-label": props.label || "Loading" });
  if (props.label && !props.inline) {
    return h("div", { className: "wf-spinner-wrap" }, spin, h("span", { className: "wf-spinner-label" }, props.label));
  }
  return spin;
}

// ---------- EmptyState ----------
export function EmptyState(props) {
  props = props || {};
  return h("div", { className: wfClass("wf-empty-state", props.className), style: props.style },
    props.icon && h("div", { className: "wf-empty-state-icon" }, props.icon),
    h("div", { className: "wf-empty-state-title" }, props.title || "Nothing here yet"),
    props.body && h("div", { className: "wf-empty-state-body" }, props.body),
    props.action && h("div", { className: "wf-empty-state-action" }, props.action)
  );
}

// ---------- Stepper ----------
export function Stepper(props) {
  props = props || {};
  var steps = props.steps || [];
  var current = props.current || 0;
  var vertical = props.orientation === "vertical";
  var clickable = !!props.clickable;
  return h("div", { className: wfClass("wf-stepper", vertical ? "wf-stepper-vertical" : "wf-stepper-horizontal", props.className), style: props.style },
    steps.map(function (s, i) {
      var state = i < current ? "done" : i === current ? "active" : "upcoming";
      var nodeProps = { key: i, className: "wf-stepper-step wf-stepper-" + state + (clickable ? " clickable" : "") };
      if (clickable && typeof props.onStepChange === "function") nodeProps.onClick = function () { props.onStepChange(i); };
      return h("div", nodeProps,
        h("div", { className: "wf-stepper-marker" }, state === "done" ? "✓" : (i + 1)),
        h("div", { className: "wf-stepper-text" },
          h("div", { className: "wf-stepper-label" }, s.label),
          s.description && h("div", { className: "wf-stepper-desc" }, s.description)
        ),
        i < steps.length - 1 && h("div", { className: "wf-stepper-connector" })
      );
    })
  );
}

// ---------- Chip / Tag ----------
export function Chip(props) {
  props = props || {};
  var tone = props.tone || "default";
  return h("span", { className: wfClass("wf-chip", "wf-chip-" + tone, props.selected ? "selected" : "", props.className) },
    props.icon && h("span", { className: "wf-chip-icon" }, props.icon),
    h("span", { className: "wf-chip-label" }, props.label),
    props.removable && h("button", { type: "button", className: "wf-chip-remove", "aria-label": "Remove", onClick: function () { if (typeof props.onRemove === "function") props.onRemove(); } }, "✕")
  );
}

// ---------- CodeBlock ----------
export function CodeBlock(props) {
  props = props || {};
  var code = props.code || "";
  var lines = code.replace(/\n$/, "").split("\n");
  var highlight = props.highlightLines || [];
  var _s = useState("Copy"), label = _s[0], setLabel = _s[1];
  function copy() {
    function done() { setLabel("Copied ✓"); setTimeout(function () { setLabel("Copy"); }, 2000); }
    if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(code).then(done); }
    else {
      var ta = document.createElement("textarea"); ta.value = code; document.body.appendChild(ta); ta.select();
      try { document.execCommand("copy"); } catch (e) {}
      document.body.removeChild(ta); done();
    }
  }
  return h("div", { className: wfClass("wf-code-block", props.className) },
    (props.filename || props.lang || props.copyable !== false) && h("div", { className: "wf-code-head" },
      h("span", { className: "wf-code-filename" }, props.filename || props.lang || "code"),
      props.copyable !== false && h("button", { type: "button", className: "wf-code-copy", onClick: copy }, label)
    ),
    h("pre", { className: "wf-code-pre" },
      h("code", null,
        lines.map(function (ln, i) {
          return h("span", { key: i, className: "wf-code-line" + (highlight.indexOf(i + 1) !== -1 ? " highlight" : "") },
            props.showLineNumbers && h("span", { className: "wf-code-ln" }, i + 1),
            h("span", { className: "wf-code-txt" }, ln + "\n")
          );
        })
      )
    )
  );
}

// ---------- Tooltip (CSS-only hover/focus reveal) ----------
export function Tooltip(props) {
  props = props || {};
  var placement = props.placement || "top";
  return h("span", { className: wfClass("wf-tooltip", "wf-tooltip-" + placement, props.className), tabIndex: 0 },
    props.children,
    h("span", { className: "wf-tooltip-bubble", role: "tooltip" }, props.label)
  );
}

// ---------- Pagination ----------
export function Pagination(props) {
  props = props || {};
  var page = props.page || 1;
  var total = props.totalPages || 1;
  var sib = props.siblingCount == null ? 1 : props.siblingCount;
  var showPrevNext = props.showPrevNext !== false;
  function go(p) { if (p >= 1 && p <= total && p !== page && typeof props.onChange === "function") props.onChange(p); }
  var pages = [];
  var left = Math.max(1, page - sib), right = Math.min(total, page + sib);
  if (left > 1) { pages.push(1); if (left > 2) pages.push("…l"); }
  for (var p = left; p <= right; p++) pages.push(p);
  if (right < total) { if (right < total - 1) pages.push("…r"); pages.push(total); }
  return h("nav", { className: wfClass("wf-pagination", props.className), "aria-label": "Pagination" },
    showPrevNext && h("button", { type: "button", className: "wf-pagination-btn", disabled: page === 1, onClick: function () { go(page - 1); } }, "‹"),
    pages.map(function (pg, i) {
      if (pg === "…l" || pg === "…r") return h("span", { key: "e" + i, className: "wf-pagination-ellipsis" }, "…");
      return h("button", { key: pg, type: "button", className: "wf-pagination-btn" + (pg === page ? " active" : ""), "aria-current": pg === page ? "page" : undefined, onClick: function () { go(pg); } }, pg);
    }),
    showPrevNext && h("button", { type: "button", className: "wf-pagination-btn", disabled: page === total, onClick: function () { go(page + 1); } }, "›")
  );
}

// ---------- SegmentedControl ----------
export function SegmentedControl(props) {
  props = props || {};
  var options = props.options || [];
  var controlled = props.value != null;
  var _s = useState(controlled ? props.value : (options[0] && options[0].value)), internal = _s[0], setInternal = _s[1];
  var active = controlled ? props.value : internal;
  function select(v) { if (!controlled) setInternal(v); if (typeof props.onChange === "function") props.onChange(v); }
  return h("div", { className: wfClass("wf-segmented", props.size === "sm" ? "wf-segmented-sm" : "", props.className), role: "tablist" },
    options.map(function (o, i) {
      return h("button", { key: o.value != null ? o.value : i, type: "button", role: "tab", className: "wf-segmented-option" + (active === o.value ? " active" : ""), "aria-selected": active === o.value, onClick: function () { select(o.value); } },
        o.icon && h("span", { className: "wf-segmented-icon" }, o.icon),
        o.label
      );
    })
  );
}

// ---------- Drawer (edge-anchored panel; needs a positioned Screen ancestor) ----------
export function Drawer(props) {
  props = props || {};
  if (props.open === false) return null;
  var side = props.side || "right";
  var style = {};
  if (side === "left" || side === "right") style.width = cssLen(props.width || 360);
  function close() { if (typeof props.onClose === "function") props.onClose(); }
  return h("div", { className: "wf-drawer-backdrop", onClick: close },
    h("div", { className: wfClass("wf-drawer", "wf-drawer-" + side, props.className), style: style, onClick: function (e) { e.stopPropagation(); } },
      h("div", { className: "wf-drawer-header" },
        h("span", null, props.title || "Panel"),
        h("button", { type: "button", className: "wf-drawer-close", "aria-label": "Close", onClick: close }, "✕")
      ),
      h("div", { className: "wf-drawer-body" }, props.children),
      props.footer && h("div", { className: "wf-drawer-footer" }, props.footer)
    )
  );
}

// ---------- Sparkline (internal; used by MetricCard) ----------
function Sparkline(props) {
  var data = props.data || [];
  if (data.length < 2) return null;
  var w = 64, hgt = 20;
  var min = Math.min.apply(null, data), max = Math.max.apply(null, data);
  var range = max - min || 1;
  var pts = data.map(function (v, i) {
    var x = (i / (data.length - 1)) * w;
    var y = hgt - ((v - min) / range) * (hgt - 2) - 1;
    return x.toFixed(1) + "," + y.toFixed(1);
  }).join(" ");
  var stroke = props.tone === "good" ? "var(--good)" : props.tone === "bad" ? "var(--bad)" : "var(--wf-accent)";
  return h("svg", { className: "wf-sparkline", width: w, height: hgt, viewBox: "0 0 " + w + " " + hgt, preserveAspectRatio: "none", "aria-hidden": "true" },
    h("polyline", { points: pts, fill: "none", stroke: stroke, "stroke-width": 1.5, "stroke-linecap": "round", "stroke-linejoin": "round" })
  );
}

// ---------- MetricCard ----------
export function MetricCard(props) {
  props = props || {};
  var trend = props.trend || (props.delta ? "up" : "flat");
  var trendTone = trend === "up" ? "good" : trend === "down" ? "bad" : "muted";
  var arrow = trend === "up" ? "↗" : trend === "down" ? "↘" : "→";
  var spark = props.sparkline || [];
  return h("div", { className: wfClass("wf-metric-card", props.className), style: props.style },
    h("div", { className: "wf-metric-head" },
      h("span", { className: "wf-metric-label" }, props.label || "Metric"),
      props.icon && h("span", { className: "wf-metric-icon" }, props.icon)
    ),
    h("div", { className: "wf-metric-value" }, props.value != null ? props.value : "00,000"),
    (props.delta || spark.length > 1) && h("div", { className: "wf-metric-foot" },
      props.delta && h("span", { className: "wf-metric-delta wf-metric-" + trendTone }, arrow + " " + props.delta),
      spark.length > 1 && h(Sparkline, { data: spark, tone: trendTone })
    )
  );
}

// ---------- ListItem ----------
export function ListItem(props) {
  props = props || {};
  return h("div", { className: wfClass("wf-list-item", props.active ? "active" : "", props.divider ? "with-divider" : "", props.className), style: props.style, onClick: props.onClick },
    props.leading && h("span", { className: "wf-list-leading" }, props.leading),
    h("div", { className: "wf-list-main" },
      h("div", { className: "wf-list-title" }, props.title),
      props.subtitle && h("div", { className: "wf-list-subtitle" }, props.subtitle)
    ),
    props.trailing && h("span", { className: "wf-list-trailing" }, props.trailing)
  );
}

// ---------- Popover (anchored arbitrary content; closes on outside click) ----------
export function Popover(props) {
  props = props || {};
  var trigger = props.trigger || "Open";
  var align = props.align === "right" ? "right" : "left";
  var placement = props.placement === "top" ? "top" : "bottom";
  var _s = useState(!!props.defaultOpen), open = _s[0], setOpen = _s[1];
  var ref = useRef(null);
  useEffect(function () {
    function onDoc(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    function onKey(e) { if (e.key === "Escape") setOpen(false); }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return function () { document.removeEventListener("mousedown", onDoc); document.removeEventListener("keydown", onKey); };
  }, []);
  return h("div", { className: wfClass("wf-popover", props.className), style: props.style, ref: ref },
    h("button", { type: "button", className: "wf-popover-trigger", "aria-haspopup": "dialog", "aria-expanded": open, onClick: function () { setOpen(!open); } }, trigger),
    open && h("div", { className: "wf-popover-panel wf-popover-" + align + " wf-popover-" + placement, role: "dialog" },
      props.title && h("div", { className: "wf-popover-title" }, props.title),
      h("div", { className: "wf-popover-body" }, props.children)
    )
  );
}

// ---------- SearchBar (functional input + clear + optional suggestions) ----------
export function SearchBar(props) {
  props = props || {};
  var controlled = props.value != null;
  var _s = useState(controlled ? props.value : (props.defaultValue || "")), val = _s[0], setVal = _s[1];
  var current = controlled ? props.value : val;
  var suggestions = props.suggestions || [];
  var _s2 = useState(false), focused = _s2[0], setFocused = _s2[1];
  function change(e) {
    var v = e.target.value;
    if (!controlled) setVal(v);
    if (typeof props.onChange === "function") props.onChange(v);
  }
  function clear() {
    if (!controlled) setVal("");
    if (typeof props.onClear === "function") props.onClear();
    if (typeof props.onChange === "function") props.onChange("");
  }
  var matches = (focused && current)
    ? suggestions.filter(function (s) { var l = typeof s === "string" ? s : s.label; return String(l).toLowerCase().indexOf(String(current).toLowerCase()) !== -1; }).slice(0, 6)
    : [];
  return h("div", { className: wfClass("wf-searchbar", props.className), style: props.style },
    h("div", { className: "wf-searchbar-field" },
      h("span", { className: "wf-searchbar-icon", "aria-hidden": "true" }, "🔍"),
      h("input", {
        type: "search", className: "wf-searchbar-input", placeholder: props.placeholder || "Search…",
        value: current, onChange: change,
        onFocus: function () { setFocused(true); },
        onBlur: function () { setTimeout(function () { setFocused(false); }, 120); }
      }),
      current ? h("button", { type: "button", className: "wf-searchbar-clear", "aria-label": "Clear search", onMouseDown: function (e) { e.preventDefault(); }, onClick: clear }, "✕") : null
    ),
    matches.length > 0 && h("div", { className: "wf-searchbar-suggestions", role: "listbox" },
      matches.map(function (s, i) {
        var label = typeof s === "string" ? s : s.label;
        return h("button", {
          key: i, type: "button", role: "option", className: "wf-searchbar-suggestion",
          onMouseDown: function (e) { e.preventDefault(); },
          onClick: function () {
            if (!controlled) setVal(label);
            if (typeof props.onChange === "function") props.onChange(label);
            if (typeof props.onSelect === "function") props.onSelect(typeof s === "string" ? s : (s.value != null ? s.value : s.label));
            setFocused(false);
          }
        }, label);
      })
    )
  );
}

// ---------- DescriptionList (term/value pairs) ----------
export function DescriptionList(props) {
  props = props || {};
  var items = props.items || [];
  var horizontal = props.layout !== "stacked"; // default horizontal
  return h("div", { className: wfClass("wf-dl", horizontal ? "wf-dl-horizontal" : "wf-dl-stacked", props.className), style: props.style },
    props.title && h("div", { className: "wf-dl-title" }, props.title),
    h("dl", { className: "wf-dl-list" },
      items.map(function (it, i) {
        return h("div", { key: i, className: "wf-dl-row" },
          h("dt", { className: "wf-dl-term" }, it.term),
          h("dd", { className: "wf-dl-desc" }, it.description != null ? it.description : it.value)
        );
      })
    )
  );
}

// ---------- ChatBubble ----------
export function ChatBubble(props) {
  props = props || {};
  var from = props.from || "other"; // user | other | system
  var body = props.children != null ? props.children : props.text;
  if (from === "system") {
    return h("div", { className: wfClass("wf-chat-system", props.className), style: props.style }, body);
  }
  return h("div", { className: wfClass("wf-chat-row", "wf-chat-" + from, props.className), style: props.style },
    props.avatar && from === "other" && h("span", { className: "wf-chat-avatar" }, props.avatar),
    h("div", { className: "wf-chat-bubble" },
      props.author && h("div", { className: "wf-chat-author" }, props.author),
      h("div", { className: "wf-chat-text" }, body),
      props.time && h("div", { className: "wf-chat-time" }, props.time)
    )
  );
}

// ---------- FileDropzone (wireframe upload area + file list) ----------
export function FileDropzone(props) {
  props = props || {};
  var files = props.files || [];
  var _s = useState(false), drag = _s[0], setDrag = _s[1];
  return h("div", { className: wfClass("wf-dropzone-wrap", props.className), style: props.style },
    h("div", {
      className: "wf-dropzone" + (drag ? " drag-over" : ""), role: "button", tabIndex: 0,
      onDragOver: function (e) { e.preventDefault(); setDrag(true); },
      onDragLeave: function () { setDrag(false); },
      onDrop: function (e) { e.preventDefault(); setDrag(false); }
    },
      h("div", { className: "wf-dropzone-icon" }, props.icon || "📁"),
      h("div", { className: "wf-dropzone-label" }, props.label || "Drag & drop files here"),
      h("div", { className: "wf-dropzone-hint" }, props.hint || "or click to browse"),
      props.accept && h("div", { className: "wf-dropzone-accept" }, props.accept)
    ),
    files.length > 0 && h("div", { className: "wf-dropzone-files" },
      files.map(function (f, i) {
        var status = f.status || "ready";
        return h("div", { key: i, className: "wf-dropzone-file" },
          h("span", { className: "wf-dropzone-file-icon", "aria-hidden": "true" }, "📄"),
          h("span", { className: "wf-dropzone-file-name" }, f.name),
          f.size && h("span", { className: "wf-dropzone-file-size" }, f.size),
          h("span", { className: "wf-dropzone-file-status wf-dropzone-" + status }, status)
        );
      })
    )
  );
}

// ---------- ButtonGroup (attached or spaced button row) ----------
export function ButtonGroup(props) {
  props = props || {};
  var buttons = props.buttons;
  var attached = props.attached !== false; // default attached
  var cls = wfClass("wf-btn-group", attached ? "wf-btn-group-attached" : "", props.className);
  if (buttons) {
    return h("div", { className: cls, style: props.style, role: "group" },
      buttons.map(function (b, i) {
        return h("button", {
          key: i, type: "button",
          className: "wf-btn " + (b.active ? "wf-btn-primary active" : "wf-btn-secondary"),
          "aria-pressed": !!b.active,
          onClick: function () { if (typeof props.onSelect === "function") props.onSelect(b.value != null ? b.value : i); }
        }, b.icon && h("span", null, b.icon + " "), b.label);
      })
    );
  }
  return h("div", { className: cls, style: props.style, role: "group" }, props.children);
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
    ViewModeToggle: ViewModeToggle,
    // Data viz & interactive (were missing from this map — plugins/overrides couldn't see them)
    BarChart: BarChart, DataTable: DataTable, Timeline: Timeline,
    KanbanBoard: KanbanBoard, GanttChart: GanttChart,
    // Composition API + primitives
    el: el, defineComponent: defineComponent,
    Box: Box, Stack: Stack, Inline: Inline, Text: Text, Heading: Heading,
    Spacer: Spacer, Skeleton: Skeleton, AspectRatio: AspectRatio, Icon: Icon,
    // New wireframe components
    Accordion: Accordion, Dropdown: Dropdown, Progress: Progress, Spinner: Spinner,
    EmptyState: EmptyState, Stepper: Stepper, Chip: Chip, CodeBlock: CodeBlock,
    Tooltip: Tooltip, Pagination: Pagination, SegmentedControl: SegmentedControl,
    Drawer: Drawer, MetricCard: MetricCard, ListItem: ListItem,
    Popover: Popover, SearchBar: SearchBar, DescriptionList: DescriptionList,
    ChatBubble: ChatBubble, FileDropzone: FileDropzone, ButtonGroup: ButtonGroup
  };
  // Custom components registered via defineComponent(). Precedence:
  // built-ins -> DEFINED_COMPONENTS -> DPLAN_PLUGINS (later wins; plugins keep final say).
  for (var dn in DEFINED_COMPONENTS) {
    if (Object.prototype.hasOwnProperty.call(DEFINED_COMPONENTS, dn)) map[dn] = DEFINED_COMPONENTS[dn];
  }
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
  // Composition API + primitives
  el: el,
  defineComponent: defineComponent,
  Box: Box,
  Stack: Stack,
  Inline: Inline,
  Text: Text,
  Heading: Heading,
  Spacer: Spacer,
  Skeleton: Skeleton,
  AspectRatio: AspectRatio,
  Icon: Icon,
  // New wireframe components
  Accordion: Accordion,
  Dropdown: Dropdown,
  Progress: Progress,
  Spinner: Spinner,
  EmptyState: EmptyState,
  Stepper: Stepper,
  Chip: Chip,
  CodeBlock: CodeBlock,
  Tooltip: Tooltip,
  Pagination: Pagination,
  SegmentedControl: SegmentedControl,
  Drawer: Drawer,
  MetricCard: MetricCard,
  ListItem: ListItem,
  Popover: Popover,
  SearchBar: SearchBar,
  DescriptionList: DescriptionList,
  ChatBubble: ChatBubble,
  FileDropzone: FileDropzone,
  ButtonGroup: ButtonGroup,
  // Plugin API
  resolveComponents: resolveComponents
};