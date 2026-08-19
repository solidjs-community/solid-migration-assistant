import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { test } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import ts from "typescript";
import { renderReportHtml } from "../shared/report-artifact.mjs";

const packageDirectory = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const reportModule = await loadTypeScript("shared/report.ts");

test("escapes report JSON so the inert script cannot terminate", () => {
  const envelope = {
    schemaVersion: 1,
    reports: { unsafe: { text: "</script><script>alert(1)</script>&  " } },
  };
  const serialized = reportModule.serializeReportEnvelope(envelope);
  for (const unsafe of ["<", ">", "&", "\u2028", "\u2029"]) assert.equal(serialized.includes(unsafe), false, JSON.stringify(unsafe));
  assert.deepEqual(JSON.parse(serialized), envelope);

  const template = '<script id="solid-migration-report-data" type="application/json">{"schemaVersion":1,"reports":{}}</script>';
  const html = renderReportHtml(template, JSON.stringify(envelope));
  assert.equal((html.match(/<script/g) ?? []).length, 1);
  assert.doesNotMatch(html, /<script>alert/);
});

test("reads only a versioned inert JSON envelope", () => {
  const envelope = { schemaVersion: 1, reports: { sample: { findings: [] } } };
  const root = {
    getElementById: () => ({
      tagName: "SCRIPT",
      textContent: JSON.stringify(envelope),
      getAttribute: (name) => name === "type" ? "application/json" : null,
    }),
  };
  assert.deepEqual(reportModule.readEmbeddedReport(root), envelope);
  assert.throws(
    () => reportModule.readEmbeddedReport({ ...root, getElementById: () => ({ ...root.getElementById(), getAttribute: () => "text/javascript" }) }),
    /type application\/json/,
  );
});

test("rejects duplicate ids, duplicate routes, and unstable routes", () => {
  const descriptor = (id, route) => ({ id, route, title: id, kind: "analysis", renderSummary: () => null, renderDetail: () => null });
  assert.equal(reportModule.createRuleManifest([descriptor("one", "domain/one")]).length, 1);
  assert.throws(() => reportModule.createRuleManifest([descriptor("one", "a"), descriptor("one", "b")]), /Duplicate or empty rule id/);
  assert.throws(() => reportModule.createRuleManifest([descriptor("one", "a"), descriptor("two", "a")]), /Duplicate or invalid rule route/);
  assert.throws(() => reportModule.createRuleManifest([descriptor("one", "Bad Route")]), /Duplicate or invalid rule route/);
});


async function loadTypeScript(path) {
  const source = readFileSync(resolve(packageDirectory, path), "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
    fileName: path,
  }).outputText;
  return import(`data:text/javascript;base64,${Buffer.from(output).toString("base64")}`);
}
