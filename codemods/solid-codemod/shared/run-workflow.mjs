import { spawnSync } from "node:child_process";
import { statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const packageDirectory = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const invocationDirectory = process.env.INIT_CWD ?? process.cwd();
const targetArgument = parseTarget(process.argv.slice(2));
const target = resolve(invocationDirectory, targetArgument);

try {
  if (!statSync(target).isDirectory()) {
    fail(`target is not a directory: ${target}`);
  }
} catch (error) {
  if (
    error &&
    typeof error === "object" &&
    "code" in error &&
    error.code === "ENOENT"
  ) {
    fail(`target does not exist: ${target}`);
  }
  throw error;
}

const result = spawnSync(
  "pnpm",
  [
    "dlx",
    "codemod@1.12.13",
    "workflow",
    "run",
    "-w",
    resolve(packageDirectory, "workflow.yaml"),
    "-t",
    target,
    "--allow-dirty",
    "--no-interactive",
  ],
  {
    cwd: packageDirectory,
    stdio: "inherit",
  },
);

if (result.error) throw result.error;
process.exit(result.status ?? 1);

function parseTarget(argumentsList) {
  let target;

  for (let index = 0; index < argumentsList.length; index += 1) {
    const argument = argumentsList[index];
    if (argument !== "--target") fail(`unknown argument: ${argument}`);
    target = argumentsList[index + 1];
    if (!target) fail("--target requires a value");
    index += 1;
  }

  if (!target) fail("--target is required");
  return target;
}

function fail(message) {
  console.error(`[solid-v2-codemod] ${message}`);
  process.exit(2);
}
