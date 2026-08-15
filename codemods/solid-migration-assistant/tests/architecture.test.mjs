import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { basename, dirname, relative, resolve } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const packageDirectory = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const analysisDirectory = resolve(packageDirectory, "rules/analysis");
const transformationsDirectory = resolve(packageDirectory, "rules/transformations");
const testsDirectory = resolve(packageDirectory, "tests");

const EXPECTED_ANALYSIS_PRODUCTION = [
"imports/beta32-subpaths/beta32-subpaths.ts",
  "imports/web-import/web-import.ts",
  "jsx/class-list/class-list.ts",
  "jsx/component-renames/component-renames.ts",
  "jsx/context-provider/context-provider.ts",
  "jsx/dom-attr-namespaces/dom-attr-namespaces.ts",
  "jsx/dom-event-namespaces/dom-event-namespaces.ts",
  "jsx/dom-use-directive/dom-use-directive.ts",
  "lifecycle/on-cleanup/on-cleanup.ts",
  "lifecycle/on-mount/on-mount.ts",
  "props/merge-props/merge-props.ts",
  "props/split-props/split-props.ts",
  "reactivity/batch/batch.ts",
  "reactivity/create-computed/create-computed.ts",
  "reactivity/create-dynamic/create-dynamic.ts",
  "reactivity/create-effect/create-effect.ts",
  "reactivity/create-memo/create-memo.ts",
  "reactivity/create-resource/create-resource.ts",
  "reactivity/create-selector/create-selector.ts",
  "reactivity/error-handling/error-handling.ts",
  "reactivity/from-observable/from-observable.ts",
  "reactivity/index-array/index-array.ts",
  "reactivity/on-helper/on-helper.ts",
  "reactivity/transition-apis/transition-apis.ts",
  "reactivity/utility-renames/utility-renames.ts",
  "store/mutable/mutable.ts",
  "store/produce/produce.ts",
  "store/unwrap/unwrap.ts",
];
const EXPECTED_ANALYSIS_TESTS = [
"imports/beta32-subpaths/beta32-subpaths.test.ts",
  "imports/web-import/web-import.test.ts",
  "jsx/class-list/class-list.test.ts",
  "jsx/component-renames/component-renames.test.ts",
  "jsx/context-provider/context-provider.test.ts",
  "jsx/dom-attr-namespaces/dom-attr-namespaces.test.ts",
  "jsx/dom-event-namespaces/dom-event-namespaces.test.ts",
  "jsx/dom-use-directive/dom-use-directive.test.ts",
  "lifecycle/on-cleanup/on-cleanup.test.ts",
  "lifecycle/on-mount/on-mount.test.ts",
  "props/merge-props/merge-props.test.ts",
  "props/split-props/split-props.test.ts",
  "reactivity/batch/batch.test.ts",
  "reactivity/create-computed/create-computed.test.ts",
  "reactivity/create-dynamic/create-dynamic.test.ts",
  "reactivity/create-effect/create-effect.test.ts",
  "reactivity/create-memo/create-memo.test.ts",
  "reactivity/create-resource/create-resource.test.ts",
  "reactivity/create-selector/create-selector.test.ts",
  "reactivity/error-handling/error-handling.test.ts",
  "reactivity/from-observable/from-observable.test.ts",
  "reactivity/index-array/index-array.test.ts",
  "reactivity/on-helper/on-helper.test.ts",
  "reactivity/transition-apis/transition-apis.test.ts",
  "reactivity/utility-renames/utility-renames.test.ts",
  "store/mutable/mutable.test.ts",
  "store/produce/produce.test.ts",
  "store/unwrap/unwrap.test.ts",
];
const EXPECTED_ANALYSIS_FIXTURES = [
"imports/beta32-subpaths/static-imports.fixture.tsx",
  "imports/web-import/static-imports.fixture.tsx",
  "jsx/class-list/normal.fixture.tsx",
  "jsx/component-renames/normal.fixture.tsx",
  "jsx/context-provider/normal.fixture.tsx",
  "jsx/dom-attr-namespaces/normal.fixture.tsx",
  "jsx/dom-event-namespaces/normal.fixture.tsx",
  "jsx/dom-use-directive/normal.fixture.tsx",
  "lifecycle/on-cleanup/direct-call.fixture.tsx",
  "lifecycle/on-cleanup/non-solid.fixture.tsx",
  "lifecycle/on-mount/direct-call.fixture.tsx",
  "lifecycle/on-mount/non-solid.fixture.tsx",
  "props/merge-props/direct-call.fixture.tsx",
  "props/merge-props/non-solid.fixture.tsx",
  "props/split-props/direct-call.fixture.tsx",
  "props/split-props/non-solid.fixture.tsx",
  "reactivity/batch/direct-call.fixture.tsx",
  "reactivity/batch/non-solid.fixture.tsx",
  "reactivity/create-computed/direct-call.fixture.tsx",
  "reactivity/create-computed/non-solid.fixture.tsx",
  "reactivity/create-dynamic/direct-call.fixture.tsx",
  "reactivity/create-dynamic/non-solid.fixture.tsx",
  "reactivity/create-effect/direct-call.fixture.tsx",
  "reactivity/create-effect/non-solid.fixture.tsx",
  "reactivity/create-memo/direct-call.fixture.tsx",
  "reactivity/create-memo/non-solid.fixture.tsx",
  "reactivity/create-resource/direct-call.fixture.tsx",
  "reactivity/create-resource/non-solid.fixture.tsx",
  "reactivity/create-selector/direct-call.fixture.tsx",
  "reactivity/create-selector/non-solid.fixture.tsx",
  "reactivity/error-handling/direct-call.fixture.tsx",
  "reactivity/error-handling/non-solid.fixture.tsx",
  "reactivity/from-observable/direct-call.fixture.tsx",
  "reactivity/from-observable/non-solid.fixture.tsx",
  "reactivity/index-array/direct-call.fixture.tsx",
  "reactivity/index-array/non-solid.fixture.tsx",
  "reactivity/on-helper/direct-call.fixture.tsx",
  "reactivity/on-helper/non-solid.fixture.tsx",
  "reactivity/transition-apis/direct-call.fixture.tsx",
  "reactivity/transition-apis/non-solid.fixture.tsx",
  "reactivity/utility-renames/direct-call.fixture.tsx",
  "reactivity/utility-renames/non-solid.fixture.tsx",
  "store/mutable/direct-call.fixture.tsx",
  "store/mutable/non-solid.fixture.tsx",
  "store/produce/direct-call.fixture.tsx",
  "store/produce/non-solid.fixture.tsx",
  "store/unwrap/direct-call.fixture.tsx",
  "store/unwrap/non-solid.fixture.tsx",
];

const EXPECTED_ANALYSIS_FOLDERS = EXPECTED_ANALYSIS_PRODUCTION.map((path) =>
  dirname(path),
).sort();

const EXPECTED_TRANSFORM_PRODUCTION = [
  "imports/legacy-subpath-relocation/legacy-subpath-relocation.ts",
];
const EXPECTED_TRANSFORM_TESTS = [
  "imports/legacy-subpath-relocation/legacy-subpath-relocation.test.ts",
];
const EXPECTED_TRANSFORM_FIXTURES = [
  "imports/legacy-subpath-relocation/fixtures/escaped-specifiers.fixture.tsx",
  "imports/legacy-subpath-relocation/fixtures/negative-forms.fixture.tsx",
  "imports/legacy-subpath-relocation/fixtures/no-matches.fixture.tsx",
  "imports/legacy-subpath-relocation/fixtures/prototype-names.fixture.tsx",
  "imports/legacy-subpath-relocation/fixtures/re-exports.fixture.tsx",
  "imports/legacy-subpath-relocation/fixtures/relocations.fixture.tsx",
  "imports/legacy-subpath-relocation/fixtures/runtime-forms.fixture.tsx",
  "imports/legacy-subpath-relocation/fixtures/shadowed-require.fixture.tsx",
  "imports/legacy-subpath-relocation/fixtures/single-quotes.fixture.tsx",
  "imports/legacy-subpath-relocation/fixtures/static-imports.fixture.tsx",
];
const EXPECTED_TRANSFORM_FOLDERS = EXPECTED_TRANSFORM_PRODUCTION.map((path) =>
  dirname(path),
).sort();

test("ships read-only analyze and deterministic transform workflows", () => {
  assert.deepEqual(
    productionScripts(),
    ["analyze.ts", "emit-report.ts", "transform.ts"],
  );
  assert.deepEqual(workflowFiles(), ["workflow.yaml"]);
  assert.equal(
    existsSync(resolve(packageDirectory, "transform.yaml")),
    true,
  );

  for (const path of [
    "scripts/write-report.ts",
    "shared/report.ts",
    "shared/report-path.ts",
    "workflow.transform.yaml",
  ]) {
    assert.equal(existsSync(resolve(packageDirectory, path)), false, path);
  }

  const analyzeWorkflow = readFileSync(
    resolve(packageDirectory, "workflow.yaml"),
    "utf8",
  );
  assert.deepEqual(
    [...analyzeWorkflow.matchAll(/js_file:\s*(\S+)/g)].map((match) => match[1]),
    ["scripts/analyze.ts", "scripts/emit-report.ts"],
  );
  assert.deepEqual(
    [...analyzeWorkflow.matchAll(/- "(\*\*\/\*\.(?:js|jsx|ts|tsx))"/g)].map(
      (match) => match[1],
    ),
    [
      "**/*.js",
      "**/*.jsx",
      "**/*.ts",
      "**/*.tsx",
      "**/*.js",
      "**/*.jsx",
      "**/*.ts",
      "**/*.tsx",
    ],
  );
  assert.equal(
    (analyzeWorkflow.match(/semantic_analysis: workspace/g) ?? []).length,
    1,
  );
  assert.doesNotMatch(analyzeWorkflow, /semantic_analysis: file/);
  for (const exclusion of ["node_modules", "dist", "build", "coverage"]) {
    assert.equal(
      (analyzeWorkflow.match(new RegExp(`- "\\*\\*/${exclusion}/\\*\\*"`, "g")) ?? [])
        .length,
      2,
      exclusion,
    );
  }
  assert.equal((analyzeWorkflow.match(/- "\*\*\/\*\.d\.ts"/g) ?? []).length, 2);
  assert.doesNotMatch(analyzeWorkflow, /transform|write.report|\.codemod-reports/i);

  const transformWorkflow = readFileSync(
    resolve(packageDirectory, "transform.yaml"),
    "utf8",
  );
  assert.deepEqual(
    [...transformWorkflow.matchAll(/js_file:\s*(\S+)/g)].map((match) => match[1]),
    ["scripts/transform.ts", "scripts/emit-report.ts"],
  );
  assert.deepEqual(
    [...transformWorkflow.matchAll(/- "(\*\*\/\*\.(?:js|jsx|ts|tsx))"/g)].map(
      (match) => match[1],
    ),
    [
      "**/*.js",
      "**/*.jsx",
      "**/*.ts",
      "**/*.tsx",
      "**/*.js",
      "**/*.jsx",
      "**/*.ts",
      "**/*.tsx",
    ],
  );
  for (const exclusion of ["node_modules", "dist", "build", "coverage"]) {
    assert.equal(
      (transformWorkflow.match(new RegExp(`- "\\*\\*/${exclusion}/\\*\\*"`, "g")) ?? [])
        .length,
      2,
      exclusion,
    );
  }
  assert.equal((transformWorkflow.match(/- "\*\*\/\*\.d\.ts"/g) ?? []).length, 2);
  assert.equal((transformWorkflow.match(/max_threads: 1/g) ?? []).length, 1);
  assert.doesNotMatch(
    transformWorkflow,
    /semantic_analysis|scripts\/analyze\.ts|\.codemod-reports/i,
  );
});

test("registers every supported detector and one deterministic emitter", () => {
  for (const path of EXPECTED_ANALYSIS_PRODUCTION) {
    assert.equal(existsSync(resolve(analysisDirectory, path)), true, path);
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
    "analyzeOnCleanup",
    "analyzeMergeProps",
    "analyzeSplitProps",
    "analyzeCreateComputed",
    "analyzeCreateEffect",
    "analyzeCreateMemo",
    "analyzeCreateMutable",
    "analyzeModifyMutable",
    "analyzeProduce",
    "analyzeUnwrap",
    "analyzeBatch",
    "analyzeOnHelper",
    "analyzeCreateResource",
    "analyzeOnError",
    "analyzeCatchError",
    "analyzeResetErrorBoundaries",
    "analyzeStartTransition",
    "analyzeUseTransition",
    "analyzeCreateDeferred",
    "analyzeCreateSelector",
    "analyzeIndexArray",
    "analyzeCreateDynamic",
    "analyzeFrom",
    "analyzeObservable",
    "analyzeEqualFn",
    "analyzeGetListener",
    "analyzeWriteSignal",
    "analyzeEnableScheduling",
    "analyzeDomAttrNamespaces",
    "analyzeDomEventNamespaces",
    "analyzeDomUseDirective",
    "analyzeContextProvider",
  ]) {
    assert.match(analyzer, new RegExp(name));
  }

  const emitter = readFileSync(
    resolve(packageDirectory, "scripts/emit-report.ts"),
    "utf8",
  );
  assert.match(emitter, /\.sort\(\)/);
  assert.doesNotMatch(emitter, /localeCompare|compareGuidance/);
  const analysis = readFileSync(
    resolve(packageDirectory, "shared/analysis.ts"),
    "utf8",
  );
  assert.doesNotMatch(analysis, /compareGuidance|guidanceLocation|siteGuidance/);
  assert.equal((emitter.match(/console\.log\(/g) ?? []).length, 1);
});

test("exposes analyze and transform workflows", () => {
  const packageJson = JSON.parse(
    readFileSync(resolve(packageDirectory, "package.json"), "utf8"),
  );
  const codemod = readFileSync(
    resolve(packageDirectory, "codemod.yaml"),
    "utf8",
  );

  assert.equal(typeof packageJson.scripts.analyze, "string");
  assert.equal(typeof packageJson.scripts.transform, "string");
  assert.deepEqual(
    Object.keys(packageJson.scripts)
      .filter((name) => /^test:transform/.test(name))
      .sort(),
    ["test:transform", "test:transform-rules"],
  );
  assert.match(codemod, /- name: analyze/);
  assert.match(codemod, /- name: transform/);
  assert.doesNotMatch(codemod, /name: write|report\.yaml/i);
});

test("colocates exact analysis rule production, adapters, and fixtures", () => {
  assert.deepEqual(directRuleFolders(analysisDirectory), EXPECTED_ANALYSIS_FOLDERS);
  assert.deepEqual(
    ruleFiles(analysisDirectory, (name) => name.endsWith(".ts") && !name.endsWith(".test.ts")),
    EXPECTED_ANALYSIS_PRODUCTION,
  );
  assert.deepEqual(
    ruleFiles(analysisDirectory, (name) => name.endsWith(".test.ts")),
    EXPECTED_ANALYSIS_TESTS,
  );
  assert.deepEqual(
    ruleFiles(analysisDirectory, (name) => name.endsWith(".fixture.tsx")),
    EXPECTED_ANALYSIS_FIXTURES,
  );
  assertRuleLayout(analysisDirectory, EXPECTED_ANALYSIS_PRODUCTION);
});

test("colocates exact transformation rule production, adapters, and fixtures", () => {
  assert.deepEqual(
    directRuleFolders(transformationsDirectory),
    EXPECTED_TRANSFORM_FOLDERS,
  );
  assert.deepEqual(
    ruleFiles(transformationsDirectory, (name) => name.endsWith(".ts") && !name.endsWith(".test.ts")),
    EXPECTED_TRANSFORM_PRODUCTION,
  );
  assert.deepEqual(
    ruleFiles(transformationsDirectory, (name) => name.endsWith(".test.ts")),
    EXPECTED_TRANSFORM_TESTS,
  );
  assert.deepEqual(
    ruleFiles(transformationsDirectory, (name) => name.endsWith(".fixture.tsx")),
    EXPECTED_TRANSFORM_FIXTURES,
  );
  assertRuleLayout(transformationsDirectory, EXPECTED_TRANSFORM_PRODUCTION, {
    fixturesSubdirectory: true,
  });
});

test("uses normal analyzer end-to-end fixtures", () => {
  assert.deepEqual(readdirSync(testsDirectory).sort(), [
    "architecture.test.mjs",
    "cli.test.mjs",
    "empty",
    "fixture",
    "packaging.test.mjs",
    "rules.test.mjs",
    "transform-expected",
    "transform-fixture",
    "transform-rules.test.mjs",
    "transform.test.mjs",
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

function directRuleFolders(directory) {
  const folders = [];
  for (const domain of readdirSync(directory, { withFileTypes: true })) {
    if (!domain.isDirectory()) continue;
    const domainDirectory = resolve(directory, domain.name);
    for (const rule of readdirSync(domainDirectory, { withFileTypes: true })) {
      if (rule.isDirectory()) folders.push(`${domain.name}/${rule.name}`);
    }
  }
  return folders.sort();
}

function ruleFiles(directory, predicate) {
  return ruleEntries(directory, (entry) => entry.isFile() && predicate(entry.name));
}

function ruleEntries(directory, predicate = () => true) {
  const entries = [];
  visitRules(directory, directory, entries, predicate);
  return entries.sort();
}

function visitRules(directory, baseDirectory, entries, predicate) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name);
    if (predicate(entry)) {
      entries.push(relative(baseDirectory, path).replaceAll("\\", "/"));
    }
    if (entry.isDirectory()) visitRules(path, baseDirectory, entries, predicate);
  }
}

function assertRuleLayout(
  directory,
  productionPaths,
  { fixturesSubdirectory = false } = {},
) {
  for (const entry of ruleEntries(directory)) {
    assert.equal(entry.split("/").includes("__testfixtures__"), false, entry);
    assert.notEqual(basename(entry), "input.tsx", entry);
    assert.notEqual(basename(entry), "expected.tsx", entry);
  }

  for (const production of productionPaths) {
    const folder = dirname(production);
    const ruleName = basename(production, ".ts");
    const entries = readdirSync(resolve(directory, folder), {
      withFileTypes: true,
    });
    const files = entries
      .filter((entry) => entry.isFile())
      .map((entry) => entry.name)
      .sort();
    const directories = entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort();

    assert.deepEqual(
      directories,
      fixturesSubdirectory ? ["fixtures"] : [],
      folder,
    );
    assert.deepEqual(
      files.filter(
        (name) => name.endsWith(".ts") && !name.endsWith(".test.ts"),
      ),
      [`${ruleName}.ts`],
      folder,
    );
    assert.deepEqual(
      files.filter((name) => name.endsWith(".test.ts")),
      [`${ruleName}.test.ts`],
      folder,
    );
    const fixtureEntries = fixturesSubdirectory
      ? readdirSync(resolve(directory, folder, "fixtures"), {
          withFileTypes: true,
        })
      : entries;
    assert.ok(
      fixtureEntries.some(
        (entry) => entry.isFile() && entry.name.endsWith(".fixture.tsx"),
      ),
      `${folder} must contain at least one fixture`,
    );
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
