import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const packageDirectory = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const rulesDirectory = resolve(packageDirectory, "rules");
const testsDirectory = resolve(packageDirectory, "tests");

const EXPECTED_RULE_INPUTS = [
  "imports/__testfixtures__/beta32-subpaths/static-imports/input.tsx",
  "imports/__testfixtures__/web-import/static-imports/input.tsx",
  "jsx/__testfixtures__/class-list/normal/input.tsx",
  "jsx/__testfixtures__/component-renames/normal/input.tsx",
  "lifecycle/__testfixtures__/direct-call/input.tsx",
  "lifecycle/__testfixtures__/non-solid/input.tsx",
  "props/__testfixtures__/merge-props/direct-call/input.tsx",
  "props/__testfixtures__/merge-props/non-solid/input.tsx",
  "props/__testfixtures__/split-props/direct-call/input.tsx",
  "props/__testfixtures__/split-props/non-solid/input.tsx",
  "reactivity/__testfixtures__/create-computed/direct-call/input.tsx",
  "reactivity/__testfixtures__/create-computed/non-solid/input.tsx",
  "reactivity/__testfixtures__/create-effect/direct-call/input.tsx",
  "reactivity/__testfixtures__/create-effect/non-solid/input.tsx",
  "reactivity/__testfixtures__/create-memo/direct-call/input.tsx",
  "reactivity/__testfixtures__/create-memo/non-solid/input.tsx",
  "store/__testfixtures__/mutable/direct-call/input.tsx",
  "store/__testfixtures__/mutable/non-solid/input.tsx",
  "store/__testfixtures__/produce/direct-call/input.tsx",
  "store/__testfixtures__/produce/non-solid/input.tsx",
  "store/__testfixtures__/unwrap/direct-call/input.tsx",
  "store/__testfixtures__/unwrap/non-solid/input.tsx",
];

test("keeps the production workflow detection-only", () => {
  assert.deepEqual(productionScripts(), ["analyze.ts", "emit.ts"]);
  assert.deepEqual(workflowFiles(), ["workflow.yaml"]);

  for (const path of [
    "scripts/transform.ts",
    "scripts/write-report.ts",
    "shared/report.ts",
    "shared/report-path.ts",
    "workflow.transform.yaml",
  ]) {
    assert.equal(existsSync(resolve(packageDirectory, path)), false, path);
  }

  const workflow = readFileSync(
    resolve(packageDirectory, "workflow.yaml"),
    "utf8",
  );
  assert.deepEqual(
    [...workflow.matchAll(/js_file:\s*(\S+)/g)].map((match) => match[1]),
    ["scripts/analyze.ts", "scripts/emit.ts"],
  );
  assert.equal((workflow.match(/- "\*\*\/\*\.tsx"/g) ?? []).length, 2);
  assert.doesNotMatch(workflow, /transform|write.report|\.codemod-reports/i);
});

test("registers every supported detector and one deterministic emitter", () => {
  for (const path of [
    "rules/imports/beta32-subpaths.ts",
    "rules/imports/web-import.ts",
    "rules/jsx/class-list.ts",
    "rules/jsx/component-renames.ts",
    "rules/lifecycle/on-mount.ts",
    "rules/props/merge-props.ts",
    "rules/props/split-props.ts",
    "rules/reactivity/create-computed.ts",
    "rules/reactivity/create-effect.ts",
    "rules/reactivity/create-memo.ts",
    "rules/store/mutable.ts",
    "rules/store/produce.ts",
    "rules/store/unwrap.ts",
  ]) {
    assert.equal(existsSync(resolve(packageDirectory, path)), true, path);
  }

  const analyzer = readFileSync(
    resolve(packageDirectory, "scripts/analyze.ts"),
    "utf8",
  );
  for (const name of [
    "analyzeBeta32SubpathImports",
    "analyzeWebImport",
    "analyzeJsxClassListAttributes",
    "analyzeJsxComponentRenames",
    "analyzeOnMount",
    "analyzeMergeProps",
    "analyzeSplitProps",
    "analyzeCreateComputed",
    "analyzeCreateEffect",
    "analyzeCreateMemo",
    "analyzeCreateMutable",
    "analyzeModifyMutable",
    "analyzeProduce",
    "analyzeUnwrap",
  ]) {
    assert.match(analyzer, new RegExp(name));
  }

  const emitter = readFileSync(
    resolve(packageDirectory, "scripts/emit.ts"),
    "utf8",
  );
  assert.match(emitter, /\.sort\(compareGuidance\)/);
  assert.equal((emitter.match(/console\.warn\(/g) ?? []).length, 1);
});

test("exposes analysis without report or transform commands", () => {
  const packageJson = JSON.parse(
    readFileSync(resolve(packageDirectory, "package.json"), "utf8"),
  );
  const codemod = readFileSync(
    resolve(packageDirectory, "codemod.yaml"),
    "utf8",
  );

  assert.equal(typeof packageJson.scripts.analyze, "string");
  assert.deepEqual(
    Object.keys(packageJson.scripts).filter((name) =>
      /transform|report/i.test(name),
    ),
    [],
  );
  assert.match(codemod, /- name: analyze/);
  assert.doesNotMatch(codemod, /name: transform|workflow\.transform|report/i);
});

test("keeps rule fixtures single-source", () => {
  const fixtureFiles = ruleFixtureFiles();
  const inputFiles = fixtureFiles.filter((path) => path.endsWith("/input.tsx"));
  const expectedFiles = fixtureFiles.filter((path) =>
    path.endsWith("/expected.tsx"),
  );

  assert.equal(fixtureFiles.length, EXPECTED_RULE_INPUTS.length);
  assert.deepEqual(inputFiles, EXPECTED_RULE_INPUTS);
  assert.deepEqual(expectedFiles, []);
});

test("uses normal analyzer end-to-end fixtures", () => {
  assert.deepEqual(readdirSync(testsDirectory).sort(), [
    "architecture.test.mjs",
    "empty",
    "fixture",
    "workflow.test.mjs",
  ]);
  assert.equal(existsSync(resolve(testsDirectory, "transform.test.ts")), false);

  const fixturePackage = JSON.parse(
    readFileSync(resolve(testsDirectory, "fixture/package.json"), "utf8"),
  );
  const emptyPackage = JSON.parse(
    readFileSync(resolve(testsDirectory, "empty/package.json"), "utf8"),
  );
  assert.match(fixturePackage.description, /Analyzer-only.*terminal guidance/);
  assert.match(emptyPackage.description, /Analyzer-only.*no supported/);
  assert.equal(fixturePackage.scripts, undefined);
  assert.equal(fixturePackage.dependencies["solid-js"], "1.9.14");
  assert.equal(fixturePackage.devDependencies.typescript, "6.0.3");
  assert.equal(fixturePackage.devDependencies.vite, undefined);
  assert.equal(emptyPackage.scripts, undefined);
  assert.equal(emptyPackage.dependencies, undefined);
  assert.doesNotMatch(readFixtureText(), /codemod-reports|transform|report/i);
});

function ruleFixtureFiles() {
  const files = [];
  visitRuleFixtures(rulesDirectory, false, files);
  return files.sort();
}

function visitRuleFixtures(directory, insideFixtures, files) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name);
    const isFixture = insideFixtures || entry.name === "__testfixtures__";

    if (entry.isDirectory()) visitRuleFixtures(path, isFixture, files);
    if (entry.isFile() && isFixture) {
      files.push(relative(rulesDirectory, path).replaceAll("\\", "/"));
    }
  }
}

function readFixtureText() {
  const contents = [];
  for (const fixture of ["fixture", "empty"]) {
    visit(resolve(testsDirectory, fixture), contents);
  }
  return contents.join("\n");
}

function visit(directory, contents) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) visit(path, contents);
    if (entry.isFile()) contents.push(readFileSync(path, "utf8"));
  }
}

function productionScripts() {
  return readdirSync(resolve(packageDirectory, "scripts"), {
    withFileTypes: true,
  })
    .filter((entry) => entry.isFile() && !entry.name.includes(".test."))
    .map((entry) => entry.name)
    .sort();
}

function workflowFiles() {
  return readdirSync(packageDirectory)
    .filter((name) => name.startsWith("workflow") && name.endsWith(".yaml"))
    .sort();
}
