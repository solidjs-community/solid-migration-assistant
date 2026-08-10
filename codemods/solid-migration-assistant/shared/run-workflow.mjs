import { spawnSync } from "node:child_process";
import { chmodSync, mkdirSync, mkdtempSync, rmSync, statSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
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

export function runCodemod(
  target,
  { spawnImpl = spawnSync, temporaryDirectory = tmpdir() } = {},
) {
  const sandboxRoot = mkdtempSync(
    join(temporaryDirectory, "solid-migration-assistant-"),
  );

  try {
    chmodSync(sandboxRoot, 0o700);
    const sandboxEnvironment = createSandboxEnvironment(sandboxRoot);
    return spawnImpl(
      process.execPath,
      [resolveCodemodLauncher(), ...buildCodemodArguments(target)],
      {
        cwd: packageDirectory,
        stdio: "inherit",
        env: {
          ...process.env,
          ...sandboxEnvironment,
        },
      },
    );
  } finally {
    rmSync(sandboxRoot, {
      recursive: true,
      force: true,
      maxRetries: 3,
      retryDelay: 50,
    });
  }
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

  const result = runCodemod(target);

  if (result.error) throw result.error;
  return result.status ?? 1;
}

function createSandboxEnvironment(sandboxRoot) {
  const home = resolve(sandboxRoot, "home");
  const temporary = resolve(sandboxRoot, "temporary");
  const environment = {
    HOME: home,
    USERPROFILE: home,
    XDG_CONFIG_HOME: resolve(sandboxRoot, "xdg-config"),
    XDG_DATA_HOME: resolve(sandboxRoot, "xdg-data"),
    XDG_STATE_HOME: resolve(sandboxRoot, "xdg-state"),
    XDG_CACHE_HOME: resolve(sandboxRoot, "xdg-cache"),
    XDG_RUNTIME_DIR: resolve(sandboxRoot, "xdg-runtime"),
    APPDATA: resolve(sandboxRoot, "appdata"),
    LOCALAPPDATA: resolve(sandboxRoot, "local-appdata"),
    TMPDIR: temporary,
    TMP: temporary,
    TEMP: temporary,
  };

  for (const path of new Set(Object.values(environment))) {
    mkdirSync(path, { recursive: true, mode: 0o700 });
  }
  return environment;
}

function fail(message) {
  console.error(`[solid-migration-assistant] ${message}`);
  return 2;
}
