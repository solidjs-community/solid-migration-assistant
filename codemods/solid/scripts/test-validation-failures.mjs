import { readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join } from "node:path";

const root = new URL("../tests/validate-fail/", import.meta.url);
const packageManager = process.env.npm_execpath;
if (!packageManager) throw new Error("npm_execpath is required to run validator failure fixtures");

let passed = 0;
for (const fixture of readdirSync(root, { withFileTypes: true }).filter((entry) => entry.isDirectory())) {
  const target = join(root.pathname, fixture.name);
  const result = spawnSync(
    process.execPath,
    [
      packageManager,
      "dlx",
      "codemod@latest",
      "jssg",
      "test",
      "-l",
      "tsx",
      "./scripts/validate.ts",
      target,
      "--strictness",
      "strict",
    ],
    { cwd: new URL("..", import.meta.url), encoding: "utf8" },
  );
  if (result.status === 0) {
    process.stderr.write(`validator unexpectedly accepted failure fixture: ${fixture.name}\n`);
    process.exit(1);
  }
  passed += 1;
}

process.stdout.write(`validator rejected ${passed}/${passed} failure fixtures\n`);
