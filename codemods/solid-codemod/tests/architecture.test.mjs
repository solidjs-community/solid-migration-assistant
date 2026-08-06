import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const packageDirectory = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const workspaceDirectory = resolve(packageDirectory, "../..");

test("keeps production composition to two workflows and three entry scripts", () => {
  assert.deepEqual(productionScripts(), [
    "analyze.ts",
    "transform.ts",
    "write-report.ts",
  ]);
  assert.deepEqual(workflowFiles(), ["workflow.transform.yaml", "workflow.yaml"]);

  for (const workflow of workflowFiles()) {
    const source = readFileSync(resolve(packageDirectory, workflow), "utf8");
    assert.match(source, /\*\*\/\*\.tsx/);
    assert.doesNotMatch(source, /\*\*\/\*\.ts(?:"|$)/m);
  }
});

test("organizes existing rules by domain without an agent skill", () => {
  assert.equal(existsSync(resolve(packageDirectory, "rules/imports/web-import.ts")), true);
  assert.equal(
    existsSync(resolve(packageDirectory, "rules/reactivity/create-effect.ts")),
    true,
  );
  assert.equal(existsSync(resolve(packageDirectory, "agents")), false);
});

test("exposes one aggregate transform command", () => {
  const packageJson = JSON.parse(
    readFileSync(resolve(packageDirectory, "package.json"), "utf8"),
  );
  const workspacePackageJson = JSON.parse(
    readFileSync(resolve(workspaceDirectory, "package.json"), "utf8"),
  );

  assert.equal(typeof packageJson.scripts.transform, "string");
  assert.equal(packageJson.scripts["transform:web-imports"], undefined);
  assert.equal(packageJson.scripts["test:skill"], undefined);
  assert.equal(typeof workspacePackageJson.scripts.transform, "string");
  assert.equal(workspacePackageJson.scripts["transform:web-imports"], undefined);
});

function productionScripts() {
  return readdirSync(resolve(packageDirectory, "scripts"), { withFileTypes: true })
    .filter((entry) => entry.isFile() && !entry.name.includes(".test."))
    .map((entry) => entry.name)
    .sort();
}

function workflowFiles() {
  return readdirSync(packageDirectory)
    .filter((name) => name.startsWith("workflow") && name.endsWith(".yaml"))
    .sort();
}
