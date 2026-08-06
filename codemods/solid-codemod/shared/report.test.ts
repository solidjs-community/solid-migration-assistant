import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildReport,
  renderHtmlReport,
  renderJsonReport,
} from "./report.ts";
import type { MigrationFinding, RuleMetadata } from "./types.ts";

const rules: RuleMetadata[] = [
  {
    ruleId: "S2-EFFECT-001",
    description:
      "Direct one-argument createEffect calls bound to an exact named import from solid-js.",
  },
  {
    ruleId: "S2-IMPORT-WEB-001",
    description: "Static ES imports whose module source is exactly solid-js/web.",
  },
];

const webFinding: MigrationFinding = {
  id: "S2-IMPORT-WEB-001:src/App.tsx:2:24",
  ruleId: "S2-IMPORT-WEB-001",
  title: "Move the Solid web renderer import",
  route: "safe-transform",
  confidence: "high",
  location: {
    file: "src/App.tsx",
    line: 2,
    column: 24,
    endLine: 2,
    endColumn: 38,
  },
  excerpt: {
    startLine: 1,
    text: 'import { render } from "solid-js/web";',
  },
  reason: "Move the renderer package.",
  evidence: { moduleSource: "solid-js/web", syntax: "static-import" },
  guidance: "Run `pnpm transform --target .`.",
};

const effectFinding: MigrationFinding = {
  id: "S2-EFFECT-001:src/App.tsx:4:1",
  ruleId: "S2-EFFECT-001",
  title: "Split this one-argument createEffect",
  route: "agent-guided",
  confidence: "high",
  location: {
    file: "src/App.tsx",
    line: 4,
    column: 1,
    endLine: 6,
    endColumn: 3,
  },
  excerpt: {
    startLine: 4,
    text: "createEffect(() => {\n  document.title = title();\n});",
  },
  reason: "Split compute and side effect.",
  evidence: { importedName: "createEffect", argumentCount: 1 },
  guidance: "Explain the migration and stop when intent is unclear.",
};

test("builds a sorted report with complete route buckets", () => {
  const report = buildReport({
    rules,
    findings: [effectFinding, webFinding],
    generatedAt: "2026-08-05T12:00:00.000Z",
  });

  assert.deepEqual(
    report.findings.map((finding) => finding.id),
    [webFinding.id, effectFinding.id],
  );
  assert.deepEqual(report.summary.byRoute, {
    "safe-transform": 1,
    "agent-guided": 1,
    manual: 0,
  });
  assert.deepEqual(report.summary.byRule, {
    "S2-EFFECT-001": 1,
    "S2-IMPORT-WEB-001": 1,
  });
  assert.equal(report.summary.findings, 2);
  assert.equal(report.migration.to, "solid-js@2.0.0-beta.30");
  assert.ok(
    report.coverage.excluded.includes(
      "Aliased and namespace createComputed, createEffect, createMemo, mergeProps, and onMount calls",
    ),
  );
  assert.ok(
    report.coverage.excluded.includes(
      "Unsupported createComputed, createEffect, createMemo, and onMount argument counts",
    ),
  );
  assert.ok(
    report.coverage.excluded.includes(
      "Indirect calls and shadowed bindings for analyzed Solid APIs",
    ),
  );
  assert.ok(
    report.coverage.excluded.includes(
      "Similar API names imported from packages other than solid-js",
    ),
  );
  assert.equal(JSON.parse(renderJsonReport(report)).schemaVersion, 1);
});

test("renders self-contained HTML from the same escaped report data", () => {
  const report = buildReport({
    rules,
    findings: [
      {
        ...effectFinding,
        excerpt: { startLine: 1, text: "</script><b>unsafe</b>" },
      },
    ],
    generatedAt: "2026-08-05T12:00:00.000Z",
  });
  const html = renderHtmlReport(report);

  assert.match(html, /<!doctype html>/);
  assert.match(html, /id="report-data"/);
  assert.match(html, /Coverage and deliberate limits/);
  assert.match(html, /finding\.guidance/);
  assert.doesNotMatch(html, /<\/script><b>unsafe<\/b>/);
  assert.match(html, /\\u003c\/script>\\u003cb>unsafe\\u003c\/b>/);
  const embedded = html.match(
    /<script id="report-data" type="application\/json">(.*?)<\/script>/s,
  );
  assert.ok(embedded?.[1]);
  assert.deepEqual(JSON.parse(embedded[1]), report);
});

test("builds a valid empty report", () => {
  const report = buildReport({
    rules,
    findings: [],
    generatedAt: "2026-08-05T12:00:00.000Z",
  });
  assert.equal(report.summary.findings, 0);
  assert.equal(report.summary.files, 0);
  assert.equal(report.findings.length, 0);
  assert.deepEqual(report.coverage.supportedRules, rules);
  assert.deepEqual(report.summary.byRule, {
    "S2-EFFECT-001": 0,
    "S2-IMPORT-WEB-001": 0,
  });
});
