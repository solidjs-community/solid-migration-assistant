import { spawnSync } from "node:child_process";
import { statSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const packageDirectory = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);

export class CliUsageError extends Error {}

export function parseTarget(argumentsList) {
  let target = ".";
  let hasExplicitTarget = false;

  for (let index = 0; index < argumentsList.length; index += 1) {
    const argument = argumentsList[index];
    if (argument !== "--target") {
      throw new CliUsageError(`unknown argument: ${argument}`);
    }
    if (hasExplicitTarget) {
      throw new CliUsageError("--target may only be specified once");
    }

    const value = argumentsList[index + 1];
    if (!value || value.startsWith("--")) {
      throw new CliUsageError("--target requires a value");
    }
    target = value;
    hasExplicitTarget = true;
    index += 1;
  }

  return target;
}

export function resolveCodemodLauncher() {
  return resolve(dirname(require.resolve("codemod/package.json")), "codemod");
}

export function buildCodemodArguments(target) {
  return [
    "--disable-analytics",
    "workflow",
    "run",
    "-w",
    resolve(packageDirectory, "workflow.yaml"),
    "-t",
    target,
    "--allow-dirty",
    "--no-interactive",
  ];
}

export function main(argumentsList = process.argv.slice(2)) {
  let targetArgument;
  try {
    targetArgument = parseTarget(argumentsList);
  } catch (error) {
    if (error instanceof CliUsageError) return fail(error.message);
    throw error;
  }

  const target = resolve(process.cwd(), targetArgument);
  try {
    if (!statSync(target).isDirectory()) {
      return fail(`target is not a directory: ${target}`);
    }
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      return fail(`target does not exist: ${target}`);
    }
    throw error;
  }

  const result = spawnSync(
    process.execPath,
    [resolveCodemodLauncher(), ...buildCodemodArguments(target)],
    {
      cwd: packageDirectory,
      stdio: "inherit",
    },
  );

  if (result.error) throw result.error;
  return result.status ?? 1;
}

function fail(message) {
  console.error(`[solid-migration-assistant] ${message}`);
  return 2;
}
