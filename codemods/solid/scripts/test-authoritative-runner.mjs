import { strict as assert } from "node:assert";
import { chmodSync, mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const temporary = mkdtempSync(join(tmpdir(), "solid2-authoritative-runner-"));
const target = join(temporary, "target");
mkdirSync(join(target, "src"), { recursive: true });
writeFileSync(join(target, "package.json"), `${JSON.stringify({ name: "fixture", private: true, dependencies: { "solid-js": "1.9.9" }, devDependencies: { "vite-plugin-solid": "2.11.10" } }, null, 2)}\n`);
writeFileSync(join(target, "src/App.tsx"), "// TODO(solid-2 S2-BLOCKER-PROPS-001): unresolved fixture\nexport const App = () => <main />;\n");

const fake = join(temporary, "codemod");
writeFileSync(fake, "#!/bin/sh\nif [ \"$1\" = \"workflow\" ]; then exit 0; fi\nif [ \"$1\" = \"jssg\" ]; then exit 7; fi\nexit 9\n");
chmodSync(fake, 0o755);
const runner = resolve(fileURLToPath(new URL("./run.mjs", import.meta.url)));
const manifestPath = join(temporary, "migration.json");
const result = spawnSync(process.execPath, [runner, "--target", target, "--manifest", manifestPath], {
  encoding: "utf8",
  env: { ...process.env, CODEMOD_BIN: fake },
});
assert.equal(result.status, 1, `runner unexpectedly exited ${result.status}: ${result.stderr}`);
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
assert.equal(manifest.execution.authoritative, true);
assert.equal(manifest.execution.workflow.status, 0);
assert.equal(manifest.execution.validator.status, 7);
assert.equal(manifest.status, "blocked");
assert.ok(manifest.unresolvedWork.some((item) => item.code === "S2-BLOCKER-PROPS-001"));
process.stdout.write("authoritative runner propagated validator failure\n");
