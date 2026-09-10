import { spawnSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import {
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const packageDirectory = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const workflowPath = resolve(packageDirectory, "workflow.yaml");
const codemodPath = resolve(packageDirectory, "node_modules/codemod/codemod");
const analysisStepCount = readFileSync(workflowPath, "utf8")
  .split("\n")
  .filter((line) => line.includes("js_file: scripts/analysis/")).length;
const { target, samples } = parseArguments(process.argv.slice(2));
const temporarySuffix = `${process.pid}-${randomUUID()}`;
const temporaryWorkflows = [];
// Without handlers a terminal interrupt kills this process mid-run and leaks
// the temporary workflows. With them, Node defers the signal until the current
// synchronous Codemod run returns (the interrupted child fails that run), so
// the `finally` below and this handler both remove the temporary workflows.
for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    removeTemporaryWorkflows();
    process.exit(1);
  });
}

try {
  const singleWorkflow = writeWorkflow("single", 1);
  const repeatedWorkflow = writeWorkflow("repeated", analysisStepCount);
  const beforeHash = hashTarget(target);

  run(singleWorkflow);

  const singleSamples = [];
  const repeatedSamples = [];
  for (let index = 0; index < samples; index += 1) {
    const order =
      index % 2 === 0
        ? [
            [singleWorkflow, singleSamples],
            [repeatedWorkflow, repeatedSamples],
          ]
        : [
            [repeatedWorkflow, repeatedSamples],
            [singleWorkflow, singleSamples],
          ];
    for (const [workflow, results] of order) results.push(run(workflow));
  }

  const afterHash = hashTarget(target);
  if (afterHash !== beforeHash) {
    throw new Error("benchmark target changed during no-op workspace passes");
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
  console.log(`Production analysis rule steps: ${analysisStepCount}`);
  console.log(`Measured samples per mode: ${samples}`);
  console.log(`One-pass samples: ${formatSamples(singleSamples)}`);
  console.log(`${analysisStepCount}-pass samples: ${formatSamples(repeatedSamples)}`);
  console.log(`One-pass median: ${singleMedianMs.toFixed(1)} ms`);
  console.log(`${analysisStepCount}-pass median: ${repeatedMedianMs.toFixed(1)} ms`);
  console.log(`Added cost: ${addedMs.toFixed(1)} ms`);
  console.log(`Slowdown: ${slowdownRatio.toFixed(2)}x`);
  console.log(`Marginal pass estimate: ${marginalPassMs.toFixed(1)} ms`);
  console.log(
    "Caveat: this directional pilot times whole Codemod CLI invocations, so process startup dominates small targets such as the default fixture, and deltas inside run-to-run noise can be negative. The no-op rule never queries semantic references, so in the current runtime it does not exercise the workspace semantic index; the measurement isolates per-step workflow dispatch and file traversal overhead only. It does not compare complete legacy and split analyzers, model rule traversal cost, control OS caches, or constitute a stable performance test.",
  );
  console.log(JSON.stringify(result));
} finally {
  removeTemporaryWorkflows();
}

function removeTemporaryWorkflows() {
  for (const workflow of temporaryWorkflows) rmSync(workflow, { force: true });
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
    throw new Error("workflow.yaml contains no analysis rule steps");
  }

  return { target, samples };
}

function writeWorkflow(label, passCount) {
  const path = resolve(
    packageDirectory,
    `.workspace-pass-${label}-${temporarySuffix}.yaml`,
  );
  temporaryWorkflows.push(path);
  const steps = Array.from({ length: passCount }, (_, index) => `
      - name: Benchmark workspace pass ${index + 1}
        js-ast-grep:
          js_file: benchmarks/workspace-pass.ts
          base_path: "."
          language: "tsx"
          semantic_analysis: workspace
          include:
            - "**/*.js"
            - "**/*.jsx"
            - "**/*.ts"
            - "**/*.tsx"
          exclude:
            - "**/node_modules/**"
            - "**/dist/**"
            - "**/build/**"
            - "**/coverage/**"
            - "**/*.d.ts"`).join("");
  writeFileSync(
    path,
    `version: "1"
nodes:
  - id: benchmark-${label}
    name: Benchmark ${label} workspace passes
    type: automatic
    steps:${steps}
`,
  );
  return path;
}

function run(workflow) {
  const start = process.hrtime.bigint();
  const result = spawnSync(
    process.execPath,
    [
      codemodPath,
      "--disable-analytics",
      "workflow",
      "run",
      "-w",
      workflow,
      "-t",
      target,
      "--allow-dirty",
      "--no-interactive",
    ],
    { cwd: packageDirectory, encoding: "utf8" },
  );
  const elapsedMs = Number(process.hrtime.bigint() - start) / 1_000_000;
  if (result.status !== 0) {
    throw new Error(
      `workflow failed (${result.status}): ${result.stderr || result.stdout}`,
    );
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
