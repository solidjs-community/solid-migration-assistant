import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { test } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import ts from "typescript";
import { renderReportHtml } from "../shared/report-artifact.mjs";

const packageDirectory = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const reportModule = await loadTypeScript("shared/report.ts");
const findingModel = await loadTypeScript("dashboard/finding-model.ts");
const themeModule = await loadTypeScript("dashboard/theme.ts");

test("escapes report JSON so the inert script cannot terminate", () => {
  const envelope = {
    schemaVersion: 1,
    run: { analyzedTargetRoot: "/workspace/project" },
    reports: { unsafe: { text: "</script><script>alert(1)</script>&  " } },
  };
  const serialized = reportModule.serializeReportEnvelope(envelope);
  for (const unsafe of ["<", ">", "&", "\u2028", "\u2029"]) assert.equal(serialized.includes(unsafe), false, JSON.stringify(unsafe));
  assert.deepEqual(JSON.parse(serialized), envelope);

  const template = '<script id="solid-migration-report-data" type="application/json">{"schemaVersion":1,"reports":{}}</script>';
  const html = renderReportHtml(template, JSON.stringify(envelope), { analyzedTargetRoot: "/workspace/project" });
  assert.equal((html.match(/<script/g) ?? []).length, 1);
  assert.match(html, /"analyzedTargetRoot":"\/workspace\/project"/);
  assert.doesNotMatch(html, /<script>alert/);
});

test("rejects non-serializable report payloads", () => {
  assert.throws(
    () => reportModule.serializeReportEnvelope({ schemaVersion: 1, run: { analyzedTargetRoot: "/workspace/project" }, reports: { bad: { callback: () => null } } }),
    /non-JSON value/,
  );
  const circular = {};
  circular.self = circular;
  assert.throws(
    () => reportModule.serializeReportEnvelope({ schemaVersion: 1, run: { analyzedTargetRoot: "/workspace/project" }, reports: { bad: circular } }),
    /circular reference/,
  );
});

test("selects system theme, toggles without persistence, and applies an explicit override", () => {
  assert.equal(themeModule.preferredTheme(false), "light");
  assert.equal(themeModule.preferredTheme(true), "dark");
  assert.equal(themeModule.oppositeTheme("dark"), "light");
  const root = { dataset: {} };
  themeModule.applyTheme("dark", root);
  assert.equal(root.dataset.theme, "dark");
});

test("formats locations and documented VS Code file URIs", () => {
  assert.equal(findingModel.formatFindingLocation(".\\src\\components\\Card.tsx", 12, 7), "src/components/Card.tsx:12:7");
  assert.equal(
    findingModel.createVsCodeFileUri({
      analyzedTargetRoot: "/Users/dev/Project folder",
      filename: "src/Card #1.tsx", line: 12, column: 7,
    }),
    "vscode://file//Users/dev/Project%20folder/src/Card%20%231.tsx:12:7",
  );
  assert.deepEqual(
    findingModel.createEditorActions({ analyzedTargetRoot: "C:\\work", filename: "src\\Card.tsx", line: 3, column: 4 }).map(({ id, label }) => ({ id, label })),
    [{ id: "vscode", label: "Visual Studio Code" }],
  );
});

test("filters the full finding set before clamped 100-item pagination", () => {
  const findings = Array.from({ length: 205 }, (_, index) => ({
    filename: index % 2 === 0 ? `src/alpha-${index}.tsx` : `src/beta-${index}.tsx`,
    index,
  }));
  const matches = findingModel.filterFindings(findings, "ALPHA");
  assert.equal(matches.length, 103);
  assert.deepEqual(findingModel.paginateFindings(matches, 2), {
    items: matches.slice(100), page: 2, pageCount: 2,
  });
  assert.equal(findingModel.paginateFindings(matches, 99).page, 2);
});

test("alphabetizes manifest domains and rule titles from static metadata", () => {
  const descriptor = (id, domain, title) => ({
    id, route: id, title, domain, kind: "analysis",
    renderSummary: () => null, renderDetail: () => null,
  });
  const manifest = reportModule.createRuleManifest([
    descriptor("zeta", "Reactivity", "Zeta"),
    descriptor("web", "Imports", "Web"),
    descriptor("legacy", "Imports", "Legacy"),
    descriptor("component", "JSX", "Component"),
  ]);
  assert.deepEqual(manifest.map(({ domain, title }) => [domain, title]), [
    ["Imports", "Legacy"], ["Imports", "Web"], ["JSX", "Component"], ["Reactivity", "Zeta"],
  ]);
});

test("reads only a versioned inert JSON envelope", () => {
  const envelope = { schemaVersion: 1, run: { analyzedTargetRoot: "/workspace/project" }, reports: { sample: { findings: [] } } };
  const root = {
    getElementById: () => ({
      tagName: "SCRIPT",
      textContent: JSON.stringify(envelope),
      getAttribute: (name) => name === "type" ? "application/json" : null,
    }),
  };
  assert.deepEqual(reportModule.readEmbeddedReport(root), envelope);
  assert.throws(
    () => reportModule.readEmbeddedReport({ ...root, getElementById: () => ({ ...root.getElementById(), textContent: JSON.stringify({ ...envelope, run: { analyzedTargetRoot: "relative/path" } }) }) }),
    /absolute analyzed target root/,
  );
  assert.throws(
    () => reportModule.readEmbeddedReport({ ...root, getElementById: () => ({ ...root.getElementById(), getAttribute: () => "text/javascript" }) }),
    /type application\/json/,
  );
});

test("rejects duplicate ids, duplicate routes, and unstable routes", () => {
  const descriptor = (id, route) => ({ id, route, title: id, domain: "Test", kind: "analysis", renderSummary: () => null, renderDetail: () => null });
  assert.equal(reportModule.createRuleManifest([descriptor("one", "domain/one")]).length, 1);
  assert.throws(() => reportModule.createRuleManifest([descriptor("one", "a"), descriptor("one", "b")]), /Duplicate or empty rule id/);
  assert.throws(() => reportModule.createRuleManifest([descriptor("one", "a"), descriptor("two", "a")]), /Duplicate or invalid rule route/);
  assert.throws(() => reportModule.createRuleManifest([descriptor("one", "Bad Route")]), /Duplicate or invalid rule route/);
});

test("aggregates opaque payloads only through rule-owned behavior", () => {
  const aggregator = reportModule.defineRuleReportAggregator({
    id: "sample",
    emptyReport: () => ({ values: [] }),
    merge: (project, next) => ({ values: [...project.values, ...next.values] }),
  });
  let reports = reportModule.aggregateRuleReports({}, [[aggregator, { values: [1] }]]);
  reports = reportModule.aggregateRuleReports(reports, [[aggregator, { values: [2] }]]);
  assert.deepEqual(reports, { sample: { values: [1, 2] } });
});

test("pins pilot ids and routes", async () => {
  const cases = [
    ["rules/analysis/imports/web-import/report.ts", "WEB_IMPORT_RULE_ID", "analysis/imports/web-import", "WEB_IMPORT_RULE_ROUTE", "imports/web-import"],
    ["rules/analysis/jsx/component-renames/report.ts", "COMPONENT_RENAMES_RULE_ID", "analysis/jsx/component-renames", "COMPONENT_RENAMES_RULE_ROUTE", "jsx/component-renames"],
    ["rules/analysis/reactivity/create-effect/report.ts", "CREATE_EFFECT_RULE_ID", "analysis/reactivity/create-effect", "CREATE_EFFECT_RULE_ROUTE", "reactivity/create-effect"],
    ["rules/transformations/imports/legacy-subpath-relocation/report.ts", "LEGACY_SUBPATH_RELOCATION_RULE_ID", "transformation/imports/legacy-subpath-relocation", "LEGACY_SUBPATH_RELOCATION_RULE_ROUTE", "imports/legacy-subpath-relocation"],
  ];
  for (const [path, idName, id, routeName, route] of cases) {
    const source = readFileSync(resolve(packageDirectory, path), "utf8");
    assert.match(source, new RegExp(`export const ${idName} = "${id}"`));
    assert.match(source, new RegExp(`export const ${routeName} = "${route}"`));
  }
});

async function loadTypeScript(path) {
  const source = readFileSync(resolve(packageDirectory, path), "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
    fileName: path,
  }).outputText;
  return import(`data:text/javascript;base64,${Buffer.from(output).toString("base64")}`);
}
