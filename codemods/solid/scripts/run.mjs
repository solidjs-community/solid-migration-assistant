#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { analyzeRepository, writeManifest } from "./preflight.mjs";

function parseArguments(argv) {
  let target = null;
  let manifest = null;
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === "--target") target = argv[++index];
    else if (argv[index] === "--manifest") manifest = argv[++index];
  }
  if (!target) throw new Error("Usage: node scripts/run.mjs --target <repository> [--manifest <path>]");
  const resolvedTarget = resolve(target);
  return { target: resolvedTarget, manifest: manifest ? resolve(manifest) : join(resolvedTarget, ".solid2-migration.json") };
}

function run(command, args, cwd) {
  const result = spawnSync(command, args, { cwd, encoding: "utf8", stdio: ["inherit", "pipe", "pipe"] });
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  return { status: result.status ?? 1, signal: result.signal ?? null };
}

const options = parseArguments(process.argv.slice(2));
const codemodRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const codemodBinary = process.env.CODEMOD_BIN || "codemod";
const preflight = analyzeRepository(options.target, { phase: "preflight" });

const workflow = run(
  codemodBinary,
  ["workflow", "run", "--workflow", join(codemodRoot, "workflow.yaml"), "--target", options.target, "--allow-dirty", "--no-interactive"],
  options.target,
);
const validator = run(
  codemodBinary,
  ["jssg", "run", "--language", "tsx", join(codemodRoot, "scripts/validate.ts"), "--target", options.target, "--allow-dirty", "--no-interactive"],
  options.target,
);

const postflight = analyzeRepository(options.target, { phase: "postflight" });
const manifest = {
  ...postflight,
  execution: {
    authoritative: true,
    workflow,
    validator,
    preflightSummary: preflight.summary,
  },
};
writeManifest(manifest, options.manifest);

if (workflow.status !== 0 || validator.status !== 0 || postflight.status !== "ready") {
  process.stderr.write(`Solid 2 migration is incomplete; see ${options.manifest}.\n`);
  process.exit(1);
}
process.stdout.write(`Solid 2 migration passed the authoritative gate; see ${options.manifest}.\n`);
