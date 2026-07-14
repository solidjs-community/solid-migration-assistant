import { strict as assert } from "node:assert";
import { cpSync, mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { analyzeRepository } from "./preflight.mjs";

const fixture = resolve(fileURLToPath(new URL("../tests/preflight/bun-workspace", import.meta.url)));
const preflight = analyzeRepository(fixture, { phase: "preflight" });
assert.equal(preflight.summary.manifestsScanned, 2);
assert.equal(preflight.summary.targetPackages, 2);
assert.equal(preflight.summary.catalogOwners, 1);
assert.ok(preflight.unresolvedWork.some((item) => item.code === "S2-EFFECT-001"));
assert.ok(preflight.unresolvedWork.some((item) => item.code === "S2-SOURCE-DEEP-STORE"));
assert.ok(preflight.unresolvedWork.some((item) => item.code === "S2-SOURCE-REMOVED-EXPORT" && item.evidence === "createResource"));
assert.ok(!preflight.unresolvedWork.some((item) => item.code === "S2-CATALOG-OWNER-001"));

const postflight = analyzeRepository(fixture, { phase: "postflight" });
assert.ok(postflight.unresolvedWork.some((item) => item.code === "S2-CATALOG-MIXED-001"));
assert.equal(postflight.status, "blocked");

const installedFixture = join(mkdtempSync(join(tmpdir(), "solid2-preflight-dependency-")), "repo");
cpSync(fixture, installedFixture, { recursive: true });
const appManifestPath = join(installedFixture, "packages/app/package.json");
const appManifest = JSON.parse(readFileSync(appManifestPath, "utf8"));
appManifest.dependencies["legacy-solid-widget"] = "1.0.0";
writeFileSync(appManifestPath, `${JSON.stringify(appManifest, null, 2)}\n`);
const installedPackage = join(installedFixture, "node_modules/legacy-solid-widget");
mkdirSync(installedPackage, { recursive: true });
writeFileSync(join(installedPackage, "package.json"), `${JSON.stringify({ name: "legacy-solid-widget", version: "1.0.0", peerDependencies: { "solid-js": "^1.8.0" } }, null, 2)}\n`);
writeFileSync(join(installedPackage, "index.js"), 'export { render } from "solid-js/web";\n');
const dependencyCheck = analyzeRepository(installedFixture, { phase: "postflight" });
assert.ok(dependencyCheck.unresolvedWork.some((item) => item.code === "S2-DEPS-PEER-001" && item.dependency === "legacy-solid-widget"));
assert.ok(dependencyCheck.unresolvedWork.some((item) => item.code === "S2-DEPS-DEEP-001" && item.dependency === "legacy-solid-widget"));
process.stdout.write("preflight manifest fixture passed\n");
