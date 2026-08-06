import type {
  FindingRoute,
  MigrationFinding,
  RuleMetadata,
} from "./types.ts";

export const REPORT_SCHEMA_VERSION = 1;

export type MigrationReport = {
  schemaVersion: typeof REPORT_SCHEMA_VERSION;
  generatedAt: string;
  target: ".";
  migration: {
    from: "solid-js@1.9.14";
    to: "solid-js@2.0.0-beta.30";
    upstreamCommit: "edb3e36faad698d0368d5eade19e4cb3b5d5cf10";
  };
  coverage: {
    profile: "single-package Vite TSX client app";
    supportedRules: RuleMetadata[];
    excluded: string[];
  };
  summary: {
    findings: number;
    files: number;
    byRoute: Record<FindingRoute, number>;
    byRule: Record<string, number>;
  };
  findings: MigrationFinding[];
};

export function buildReport(input: {
  rules: RuleMetadata[];
  findings: MigrationFinding[];
  generatedAt?: string;
}): MigrationReport {
  const supportedRules = [...new Map(input.rules.map((rule) => [rule.ruleId, rule])).values()].sort(
    (left, right) => left.ruleId.localeCompare(right.ruleId),
  );
  const findings = [...input.findings].sort(compareFindings);
  const byRoute: Record<FindingRoute, number> = {
    "safe-transform": 0,
    "agent-guided": 0,
    manual: 0,
  };
  const byRule: Record<string, number> = Object.fromEntries(
    supportedRules.map((rule) => [rule.ruleId, 0]),
  );

  for (const finding of findings) {
    byRoute[finding.route] += 1;
    byRule[finding.ruleId] = (byRule[finding.ruleId] ?? 0) + 1;
  }

  return {
    schemaVersion: REPORT_SCHEMA_VERSION,
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    target: ".",
    migration: {
      from: "solid-js@1.9.14",
      to: "solid-js@2.0.0-beta.30",
      upstreamCommit: "edb3e36faad698d0368d5eade19e4cb3b5d5cf10",
    },
    coverage: {
      profile: "single-package Vite TSX client app",
      supportedRules,
      excluded: [
        "JavaScript files",
        "TypeScript files without JSX (.ts)",
        "Aliased and namespace createComputed, createEffect, createMemo, mergeProps, and onMount calls",
        "Indirect calls and shadowed bindings for analyzed Solid APIs",
        "Similar API names imported from packages other than solid-js",
        "Unsupported createEffect, createMemo, and onMount argument counts",
        "Re-exports, dynamic imports, require calls, and TypeScript import types",
        "Configuration and dependency changes",
        "SSR applications, libraries, and monorepos",
        "Cross-file meaning and application behavior",
      ],
    },
    summary: {
      findings: findings.length,
      files: new Set(findings.map((finding) => finding.location.file)).size,
      byRoute,
      byRule,
    },
    findings,
  };
}

export function renderJsonReport(report: MigrationReport): string {
  return `${JSON.stringify(report, null, 2)}\n`;
}

export function renderHtmlReport(report: MigrationReport): string {
  const embedded = JSON.stringify(report)
    .replaceAll("<", "\\u003c")
    .replaceAll("\u2028", "\\u2028")
    .replaceAll("\u2029", "\\u2029");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Solid 2 migration report</title>
  <style>
    :root { color-scheme: light dark; --bg:#f4f6f9; --panel:#fff; --ink:#18202c; --muted:#647084; --line:#dce1e8; --safe:#146c43; --safe-bg:#e8f6ee; --agent:#6c4bc1; --agent-bg:#f0ebff; --manual:#99510b; --manual-bg:#fff0df; }
    @media (prefers-color-scheme: dark) { :root { --bg:#11151c; --panel:#1a202a; --ink:#edf1f7; --muted:#aab4c3; --line:#313946; --safe:#83d8ac; --safe-bg:#18372a; --agent:#c0afff; --agent-bg:#2b2442; --manual:#ffc184; --manual-bg:#402b1d; } }
    * { box-sizing:border-box; }
    body { margin:0; background:var(--bg); color:var(--ink); font:14px/1.5 ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; }
    main { width:min(1180px,calc(100% - 32px)); margin:auto; padding:44px 0 70px; }
    h1 { margin:4px 0 8px; font-size:clamp(30px,5vw,48px); letter-spacing:-.04em; }
    h2 { margin:0; font-size:17px; }
    p { margin:0; }
    code,pre { font-family:ui-monospace,SFMono-Regular,Menlo,monospace; }
    .eyebrow { color:var(--agent); font-size:12px; font-weight:800; letter-spacing:.12em; text-transform:uppercase; }
    .muted { color:var(--muted); }
    .meta { display:flex; flex-wrap:wrap; gap:8px 18px; margin-top:16px; color:var(--muted); font-size:12px; }
    .cards { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:12px; margin:26px 0; }
    .card,.panel,.finding { border:1px solid var(--line); border-radius:14px; background:var(--panel); }
    .card { padding:16px; }
    .card span { display:block; color:var(--muted); font-size:11px; font-weight:800; text-transform:uppercase; }
    .card strong { display:block; margin-top:3px; font-size:28px; }
    .panel { overflow:hidden; }
    .toolbar { display:grid; grid-template-columns:1fr 220px; gap:10px; padding:14px; border-bottom:1px solid var(--line); }
    input,select { min-height:40px; width:100%; border:1px solid var(--line); border-radius:9px; padding:8px 10px; background:var(--bg); color:var(--ink); font:inherit; }
    #results { display:grid; gap:12px; padding:14px; }
    .finding { padding:16px; }
    .finding-head { display:flex; align-items:flex-start; justify-content:space-between; gap:12px; }
    .path { margin-top:3px; color:var(--muted); font-size:12px; overflow-wrap:anywhere; }
    .badge { display:inline-flex; padding:3px 8px; border-radius:999px; font-size:11px; font-weight:800; white-space:nowrap; }
    .safe-transform { color:var(--safe); background:var(--safe-bg); }
    .agent-guided { color:var(--agent); background:var(--agent-bg); }
    .manual { color:var(--manual); background:var(--manual-bg); }
    .reason { margin-top:12px; }
    pre { margin:12px 0 0; padding:12px; overflow:auto; border-radius:9px; background:var(--bg); font-size:12px; }
    .action { margin-top:12px; padding-top:12px; border-top:1px solid var(--line); color:var(--muted); }
    details { margin-top:18px; padding:14px 16px; border:1px solid var(--line); border-radius:12px; background:var(--panel); }
    summary { cursor:pointer; font-weight:800; }
    li { margin:5px 0; }
    .empty { padding:36px; text-align:center; color:var(--muted); }
    @media (max-width:760px) { .cards { grid-template-columns:repeat(2,1fr); } .toolbar { grid-template-columns:1fr; } }
  </style>
</head>
<body>
  <main>
    <header>
      <p class="eyebrow">Read-only analysis</p>
      <h1>Solid 2 migration report</h1>
      <p class="muted">${report.coverage.supportedRules.length} exact rules for a small, verified Solid 1.9 TSX client-app slice.</p>
      <div class="meta"><span>Target: <code>.</code></span><span>Solid: <code>${escapeHtml(report.migration.from)}</code> → <code>${escapeHtml(report.migration.to)}</code></span><span>Generated: ${escapeHtml(report.generatedAt)}</span></div>
    </header>
    <section class="cards" aria-label="Summary">
      <div class="card"><span>Findings</span><strong>${report.summary.findings}</strong></div>
      <div class="card"><span>Files</span><strong>${report.summary.files}</strong></div>
      <div class="card"><span>Safe transforms</span><strong>${report.summary.byRoute["safe-transform"]}</strong></div>
      <div class="card"><span>Agent-guided</span><strong>${report.summary.byRoute["agent-guided"]}</strong></div>
    </section>
    <section class="panel">
      <div class="toolbar">
        <input id="search" type="search" placeholder="Search file, rule, or reason" aria-label="Search findings">
        <select id="route" aria-label="Filter route"><option value="all">All routes</option><option value="safe-transform">Safe transform</option><option value="agent-guided">Agent guided</option><option value="manual">Manual</option></select>
      </div>
      <div id="results"></div>
    </section>
    <details>
      <summary>Coverage and deliberate limits</summary>
      <ul>${report.coverage.excluded.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
    </details>
  </main>
  <script id="report-data" type="application/json">${embedded}</script>
  <script>
    const report = JSON.parse(document.getElementById('report-data').textContent)
    const results = document.getElementById('results')
    const search = document.getElementById('search')
    const route = document.getElementById('route')
    const esc = value => String(value).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[ch]))
    const render = () => {
      const query = search.value.trim().toLowerCase()
      const visible = report.findings.filter(finding => (route.value === 'all' || finding.route === route.value) && (!query || (finding.location.file + ' ' + finding.ruleId + ' ' + finding.reason + ' ' + finding.guidance).toLowerCase().includes(query)))
      results.innerHTML = visible.length ? visible.map(finding => '<article class="finding"><div class="finding-head"><div><h2>' + esc(finding.title) + '</h2><div class="path"><code>' + esc(finding.location.file) + ':' + finding.location.line + ':' + finding.location.column + '</code> · ' + esc(finding.ruleId) + '</div></div><span class="badge ' + finding.route + '">' + esc(finding.route) + '</span></div><p class="reason">' + esc(finding.reason) + '</p><pre><code>' + esc(finding.excerpt.text) + '</code></pre><p class="action">Guidance: ' + esc(finding.guidance) + '</p></article>').join('') : '<div class="empty">No findings match this filter.</div>'
    }
    search.addEventListener('input', render)
    route.addEventListener('change', render)
    render()
  </script>
</body>
</html>
`;
}

function compareFindings(
  left: MigrationFinding,
  right: MigrationFinding,
): number {
  return (
    left.location.file.localeCompare(right.location.file) ||
    left.location.line - right.location.line ||
    left.location.column - right.location.column ||
    left.ruleId.localeCompare(right.ruleId)
  );
}

function escapeHtml(value: string | number): string {
  return String(value).replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    };
    return entities[character] ?? character;
  });
}
