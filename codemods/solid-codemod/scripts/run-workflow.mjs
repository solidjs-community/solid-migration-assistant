import { spawnSync } from "node:child_process";
import { statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const packageDirectory = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const [mode, ...rawArguments] = process.argv.slice(2);

if (mode !== "analyze" && mode !== "transform:web-imports") {
  fail("expected workflow mode analyze or transform:web-imports");
}

const parsed = parseArguments(rawArguments);
const target = resolve(parsed.target);
try {
  if (!statSync(target).isDirectory()) fail(`target is not a directory: ${target}`);
} catch (error) {
  if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
    fail(`target does not exist: ${target}`);
  }
  throw error;
}

const workflow =
  mode === "analyze"
    ? resolve(packageDirectory, "workflow.yaml")
    : resolve(packageDirectory, "workflow.transform-web-imports.yaml");
const codemodArguments = [
  "dlx",
  "codemod@1.12.13",
  "workflow",
  "run",
  "-w",
  workflow,
  "-t",
  target,
  "--allow-dirty",
  "--no-interactive",
];

if (mode === "analyze" && parsed.reportDirectory) {
  codemodArguments.push(
    "--param",
    `report_directory=${parsed.reportDirectory}`,
  );
}

const result = spawnSync("pnpm", codemodArguments, {
  cwd: packageDirectory,
  encoding: "utf8",
  stdio: "inherit",
});

if (result.error) throw result.error;
process.exit(result.status ?? 1);

function parseArguments(argumentsList) {
  let target;
  let reportDirectory;

  for (let index = 0; index < argumentsList.length; index += 1) {
    const argument = argumentsList[index];
    if (argument === "--target") {
      target = argumentsList[index + 1];
      index += 1;
      continue;
    }
    if (argument === "--report-directory") {
      reportDirectory = argumentsList[index + 1];
      index += 1;
      continue;
    }
    fail(`unknown argument: ${argument}`);
  }

  if (!target) fail("--target is required");
  if (reportDirectory !== undefined && !reportDirectory) {
    fail("--report-directory requires a value");
  }
  if (mode === "transform:web-imports" && reportDirectory !== undefined) {
    fail("--report-directory is only valid for analysis");
  }
  return { target, reportDirectory };
}

function fail(message) {
  console.error(`[solid-v2-analysis] ${message}`);
  process.exit(2);
}
