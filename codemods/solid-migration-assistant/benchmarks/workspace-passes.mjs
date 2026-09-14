import { spawnSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const packageDirectory = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const driver = fileURLToPath(import.meta.url);

// The orchestration package and the generated workflows are TypeScript
// source, so the benchmark runs under the same Node flags and node_modules
// hook the launcher uses. A plain `node benchmarks/workspace-passes.mjs`
// re-runs itself that way and reports the child's status.
if (!process.execArgv.includes("--experimental-transform-types")) {
  const result = spawnSync(
    process.execPath,
    [
      "--disable-warning=ExperimentalWarning",
      "--experimental-transform-types",
      "--import",
      pathToFileURL(resolve(packageDirectory, "shared/register-ts.mjs")).href,
      driver,
      ...process.argv.slice(2),
    ],
    { stdio: "inherit" },
  );
  if (result.error) throw result.error;
  process.exit(result.status ?? 1);
}

const { resolveBridgeBinary, runWorkflowFile } = await import(
  "../shared/run-workflow.mjs"
);
const analysisStepCount = (
  readFileSync(resolve(packageDirectory, "workflows/analyze.ts"), "utf8").match(
    /^const \w+ = jssg\(\{$/gm,
  ) ?? []
).length;
const { target, samples } = parseArguments(process.argv.slice(2));
const bridge = resolveBridgeBinary();
// Reported, not configured: the benchmark runs with the same host capacity a
// production run gets, so the numbers below describe bounded parallelism.
const { DEFAULT_WEIGHTS, defaultCapacity } = await import(
  "@codemod.com/orchestration"
);
const schedulerCapacity = defaultCapacity();
const workspacePassWeight = DEFAULT_WEIGHTS.jssgWorkspace;
const admittedAtOnce = Math.max(
  1,
  Math.floor(schedulerCapacity / Math.min(workspacePassWeight, schedulerCapacity)),
);
const temporarySuffix = `${process.pid}-${randomUUID()}`;
const temporaryArtifacts = [];
let workflowSequence = 0;
// A terminal interrupt must not leak the generated workflow modules. The
// orchestration runtime kills the bridge in flight when its signal aborts,
// but this driver owns no signal; it removes its files and exits.
for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    removeTemporaryArtifacts();
    process.exit(1);
  });
}

try {
  const beforeHash = hashTarget(target);

  await run(createBenchmarkWorkflow("warmup", 1));

  const singleSamples = [];
  const repeatedSamples = [];
  for (let index = 0; index < samples; index += 1) {
    const order =
      index % 2 === 0
        ? [
            ["single", 1, singleSamples],
            ["repeated", analysisStepCount, repeatedSamples],
          ]
        : [
            ["repeated", analysisStepCount, repeatedSamples],
            ["single", 1, singleSamples],
          ];
    for (const [label, passCount, results] of order) {
      results.push(
        await run(createBenchmarkWorkflow(`${label}-${index + 1}`, passCount)),
      );
    }
  }

  const afterHash = hashTarget(target);
  if (afterHash !== beforeHash) {
    throw new Error("benchmark target changed during semantic workspace passes");
  }

  const singleMedianMs = median(singleSamples);
  const repeatedMedianMs = median(repeatedSamples);
  const addedMs = repeatedMedianMs - singleMedianMs;
  const slowdownRatio = repeatedMedianMs / singleMedianMs;
  const marginalPassMs =
    analysisStepCount > 1 ? addedMs / (analysisStepCount - 1) : 0;
  for (const [name, value] of Object.entries({
    singleMedianMs,
    repeatedMedianMs,
    addedMs,
    slowdownRatio,
    marginalPassMs,
  })) {
    if (!Number.isFinite(value)) {
      throw new Error(`benchmark metric ${name} is not finite: ${value}`);
    }
  }
  const result = {
    target,
    analysisStepCount,
    schedulerCapacity,
    workspacePassWeight,
    admittedAtOnce,
    samples,
    singleSamplesMs: singleSamples,
    repeatedSamplesMs: repeatedSamples,
    singleMedianMs,
    repeatedMedianMs,
    addedMs,
    slowdownRatio,
    marginalPassMs,
  };

  console.log("Preliminary workspace-pass benchmark");
  console.log(`Target: ${target}`);
  console.log(`Production analysis commands: ${analysisStepCount}`);
  console.log(`Measured samples per mode: ${samples}`);
  console.log(
    "Isolation: a fresh generated workflow module and transform artifacts per sample; one bridge process and one workspace index per command",
  );
  console.log(
    `Scheduling: one parallel group per sample, admitted by the engine scheduler at a capacity of ${schedulerCapacity} unit(s) and a weight of ${workspacePassWeight} per workspace-semantic command, so at most ${admittedAtOnce} run at once`,
  );
  console.log(`One-command samples: ${formatSamples(singleSamples)}`);
  console.log(`${analysisStepCount}-command samples: ${formatSamples(repeatedSamples)}`);
  console.log(`One-command median: ${singleMedianMs.toFixed(1)} ms`);
  console.log(`${analysisStepCount}-command median: ${repeatedMedianMs.toFixed(1)} ms`);
  console.log(`Added cost: ${addedMs.toFixed(1)} ms`);
  console.log(`Slowdown: ${slowdownRatio.toFixed(2)}x`);
  console.log(`Marginal command estimate: ${marginalPassMs.toFixed(1)} ms`);
  console.log(
    "Caveat: this directional pilot times one in-process workflow run per sample, so Node startup is excluded while each command's bridge process startup, workspace indexing, and per-file sandbox runtime are included; deltas inside run-to-run noise can be negative. Both modes are parallel groups admitted by the engine scheduler, so the added cost and the marginal estimate describe bounded parallel commands on this host's capacity and not a serial sum; a machine with different capacity will report different numbers for the same work. Each command forces workspace semantic resolution for one imported binding per source file, but it does not reproduce the number or shape of queries made by the real analyzers. It does not compare complete legacy and split analyzers, model full rule traversal cost, control OS caches, or constitute a stable performance test.",
  );
  console.log(JSON.stringify(result));
} finally {
  removeTemporaryArtifacts();
}

function removeTemporaryArtifacts() {
  for (const artifact of temporaryArtifacts) {
    rmSync(artifact, { recursive: true, force: true });
  }
}

function formatSamples(values) {
  return `${values.map((value) => value.toFixed(1)).join(", ")} ms`;
}

function parseArguments(argumentsList) {
  let target = resolve(packageDirectory, "tests/fixture");
  let samples = 3;

  for (let index = 0; index < argumentsList.length; index += 1) {
    const argument = argumentsList[index];
    const value = argumentsList[index + 1];
    // pnpm forwards the literal `--` separator from `pnpm <script> -- --target`.
    if (argument === "--") continue;
    if (argument === "--target" && value) {
      target = resolve(value);
      index += 1;
      continue;
    }
    if (argument === "--samples" && value) {
      samples = Number.parseInt(value, 10);
      index += 1;
      continue;
    }
    throw new Error(`unknown or incomplete argument: ${argument}`);
  }

  if (!Number.isInteger(samples) || samples < 3) {
    throw new Error("--samples must be an integer of at least 3");
  }
  if (!statSync(target, { throwIfNoEntry: false })?.isDirectory()) {
    throw new Error(`benchmark target is not an existing directory: ${target}`);
  }
  if (analysisStepCount < 1) {
    throw new Error("workflows/analyze.ts contains no inline jssg definitions");
  }

  return { target, samples };
}

/**
 * A generated workflow module with `passCount` inline workspace-semantic
 * definitions declared as one `parallel()` group, mirroring how the
 * production analyze workflow composes its commands: the group only states
 * that the passes may overlap, and the engine's admission scheduler decides
 * how many actually run at once. Each definition's transform carries its own
 * marker so the build step bundles a distinct artifact per pass.
 */
function createBenchmarkWorkflow(label, passCount) {
  workflowSequence += 1;
  const runLabel = `${label}-${workflowSequence}`;
  const path = resolve(
    packageDirectory,
    "benchmarks",
    `.workspace-pass-${runLabel}-${temporarySuffix}.ts`,
  );
  temporaryArtifacts.push(path);
  const definitions = Array.from(
    { length: passCount },
    (_, index) => `
const pass${index + 1} = jssg({
  name: ${JSON.stringify(`workspace-pass-${index + 1}`)},
  language: "tsx",
  include: SOURCE_INCLUDE,
  exclude: SOURCE_EXCLUDE,
  semanticAnalysis: "workspace",
  transform: (root) => createWorkspacePass(${JSON.stringify(`${runLabel}-${index + 1}`)})(root),
});`,
  ).join("\n");
  const group = Array.from(
    { length: passCount },
    (_, index) => `    pass${index + 1},`,
  ).join("\n");
  writeFileSync(
    path,
    `import { jssg, parallel, workflow } from "@codemod.com/orchestration";
import { SOURCE_EXCLUDE, SOURCE_INCLUDE } from "../shared/workflow.ts";
import { createWorkspacePass } from "./workspace-pass.ts";
${definitions}

export default workflow(async () => {
  await parallel([
${group}
  ]);
  return { passes: ${passCount} };
});
`,
  );
  return path;
}

async function run(workflowPath) {
  const start = process.hrtime.bigint();
  const output = await runWorkflowFile({ workflowPath, target, bridge });
  const elapsedMs = Number(process.hrtime.bigint() - start) / 1_000_000;
  if (!output || typeof output.passes !== "number") {
    throw new Error(`workflow returned no pass count: ${JSON.stringify(output)}`);
  }
  return Number(elapsedMs.toFixed(3));
}

function hashTarget(directory) {
  const hash = createHash("sha256");
  for (const file of sourceFiles(directory)) {
    hash.update(relative(directory, file));
    hash.update(readFileSync(file));
  }
  return hash.digest("hex");
}

function sourceFiles(directory) {
  const ignored = new Set([
    ".git",
    "build",
    "coverage",
    "dist",
    "node_modules",
  ]);
  const files = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (ignored.has(entry.name)) continue;
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) files.push(...sourceFiles(path));
    if (
      entry.isFile() &&
      !entry.name.endsWith(".d.ts") &&
      [".js", ".jsx", ".ts", ".tsx"].some((extension) =>
        entry.name.endsWith(extension),
      )
    ) {
      files.push(path);
    }
  }
  return files.sort();
}

function median(values) {
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
}
