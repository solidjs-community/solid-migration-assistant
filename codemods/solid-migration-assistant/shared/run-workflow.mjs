import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { renderReportHtml, writeReportAtomically } from "./report-artifact.mjs";

const packageDirectory = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const packageMetadata = JSON.parse(
  readFileSync(resolve(packageDirectory, "package.json"), "utf8"),
);

const SOLID_TARGET = "solid-js@2.0.0-rc.0";
const SOLID_SOURCE_COMMIT = "ff4d3c4479163fbdd3327f5b22d0c3ea7bd1a2c5";
const MIGRATION_GUIDE = `https://github.com/solidjs/solid/blob/${SOLID_SOURCE_COMMIT}/documentation/solid-2.0/MIGRATION.md`;
const FEEDBACK_URL =
  "https://github.com/devagrawal09/solid-migration-assistant/issues";

export const DISCLOSURE = `[solid-migration-assistant] Final disclosure
Analyzer: ${packageMetadata.name}@${packageMetadata.version}
Reviewed migration destination: ${SOLID_TARGET} (source commit ${SOLID_SOURCE_COMMIT})
Immutable migration guide: ${MIGRATION_GUIDE}
Scope: This source-only analyzer covers project-owned .js, .jsx, .ts, and .tsx source. Coverage is incomplete and advisory, makes no migration-readiness claim, and supports only the exact destination above; other Solid versions are unsupported.
Execution: Read-only. The analyzer does not run target typechecks, builds, tests, scripts, or applications and creates no target report unless the user explicitly requests one with --report FILE.
Privacy and output: Analyzer telemetry is disabled; a generated report is emitted only when explicitly requested with --report FILE. Every generated HTML contains bounded project source snippets; treat and share it as project source. Codemod may retain normal workflow or task state outside the target in platform user-data directories; consult Codemod's privacy and state behavior.
Feedback: ${FEEDBACK_URL}
[solid-migration-assistant] End final disclosure`;

export class CliUsageError extends Error {}

export function parseArguments(argumentsList) {
  const options = { target: ".", report: null, force: false, open: false };
  const seen = new Set();

  for (let index = 0; index < argumentsList.length; index += 1) {
    const argument = argumentsList[index];
    if (argument === "--target" || argument === "--report") {
      if (seen.has(argument)) throw new CliUsageError(`${argument} may only be specified once`);
      const value = argumentsList[index + 1];
      if (!value || value.startsWith("--")) throw new CliUsageError(`${argument} requires a value`);
      seen.add(argument);
      if (argument === "--target") options.target = value;
      else options.report = value;
      index += 1;
      continue;
    }
    if (argument === "--force" || argument === "--open") {
      if (seen.has(argument)) throw new CliUsageError(`${argument} may only be specified once`);
      seen.add(argument);
      if (argument === "--force") options.force = true;
      else options.open = true;
      continue;
    }
    throw new CliUsageError(`unknown argument: ${argument}`);
  }

  if (options.force && options.report === null) throw new CliUsageError("--force requires --report FILE");
  if (options.open && options.report === null) throw new CliUsageError("--open requires --report FILE");
  return options;
}

export function parseTarget(argumentsList) {
  return parseArguments(argumentsList).target;
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
  { reportDataFile, spawnImpl = spawnSync } = {},
) {
  const reportMode = Boolean(reportDataFile);
  const result = spawnImpl(
    process.execPath,
    [resolveCodemodLauncher(), ...buildCodemodArguments(target)],
    {
      cwd: packageDirectory,
      // Codemod routes workflow output to stderr and progress to stdout.
      // Default mode swaps those descriptors without buffering. Report mode
      // captures both only long enough to remove the private data envelope,
      // then forwards every existing terminal byte to the same destination.
      stdio: reportMode ? [0, "pipe", "pipe"] : [0, 2, 1],
      ...(reportMode
        ? {
            encoding: "utf8",
            maxBuffer: 100 * 1024 * 1024,
            env: { ...process.env, SOLID_MIGRATION_REPORT_MODE: "1" },
          }
        : {}),
    },
  );

  if (reportMode) {
    const { output, reportData } = extractReportData(result.stderr ?? "");
    if (output) process.stdout.write(output);
    if (result.stdout) process.stderr.write(result.stdout);
    if (reportData !== null) writeFileSync(reportDataFile, reportData, { encoding: "utf8", flag: "wx" });
  }
  return result;
}

export function extractReportData(output) {
  const prefix = "__SOLID_MIGRATION_REPORT_DATA__";
  let reportData = null;
  const terminalLines = [];
  for (const line of output.split(/(?<=\n)/)) {
    const marker = line.indexOf(prefix);
    if (marker < 0) {
      terminalLines.push(line);
      continue;
    }
    if (reportData !== null) throw new Error("workflow emitted report data more than once");
    reportData = line.slice(marker + prefix.length).trimEnd();
    const before = line.slice(0, marker);
    if (before.trim()) terminalLines.push(before.endsWith("\n") ? before : `${before}\n`);
  }
  return { output: terminalLines.join(""), reportData };
}

export function main(
  argumentsList = process.argv.slice(2),
  { cwd, runImpl = runCodemod, openImpl = openReport } = {},
) {
  let status = 1;

  try {
    status = run(argumentsList, cwd ?? process.cwd(), runImpl, openImpl);
  } catch (error) {
    console.error(
      `[solid-migration-assistant] analyzer execution failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  } finally {
    console.error(DISCLOSURE);
  }

  return status;
}

function run(argumentsList, invocationDirectory, runImpl, openImpl) {
  let options;
  try {
    options = parseArguments(argumentsList);
  } catch (error) {
    if (error instanceof CliUsageError) return fail(error.message);
    throw error;
  }

  const target = resolve(invocationDirectory, options.target);
  try {
    if (!statSync(target).isDirectory()) return fail(`target is not a directory: ${target}`);
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      return fail(`target does not exist: ${target}`);
    }
    throw error;
  }

  if (options.report === null) {
    const result = runImpl(target);
    if (result.error) throw result.error;
    return result.status ?? 1;
  }

  const reportPath = resolve(invocationDirectory, options.report);
  if (existsSync(reportPath) && !options.force) {
    return fail(`report already exists (use --force to replace it): ${reportPath}`);
  }
  if (existsSync(reportPath) && !statSync(reportPath).isFile()) {
    return fail(`report path is not a file: ${reportPath}`);
  }

  const dataDirectory = mkdtempSync(join(tmpdir(), "solid-migration-report-data-"));
  const reportDataFile = join(dataDirectory, "report.json");
  try {
    const result = runImpl(target, { reportDataFile });
    if (result.error) throw result.error;
    const status = result.status ?? 1;
    if (status !== 0) return status;

    const template = readFileSync(resolve(packageDirectory, "assets/dashboard/index.html"), "utf8");
    const reportData = readFileSync(reportDataFile, "utf8");
    const html = renderReportHtml(template, reportData);
    try {
      writeReportAtomically(reportPath, html, { force: options.force });
    } catch (error) {
      if (error && typeof error === "object" && "code" in error && error.code === "EEXIST") {
        return fail(`report already exists (use --force to replace it): ${reportPath}`);
      }
      throw error;
    }
    if (options.open) openImpl(reportPath);
    return 0;
  } finally {
    rmSync(dataDirectory, { recursive: true, force: true });
  }
}

export function openReport(path, { spawnImpl = spawnSync, platform = process.platform } = {}) {
  const command = platform === "darwin" ? ["open", [path]]
    : platform === "win32" ? ["cmd", ["/c", "start", "", path]]
      : ["xdg-open", [path]];
  const result = spawnImpl(command[0], command[1], { stdio: "ignore" });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`browser launcher exited with status ${String(result.status)}`);
}

function fail(message) {
  console.error(`[solid-migration-assistant] ${message}`);
  return 2;
}
