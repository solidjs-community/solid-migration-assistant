import { strict as assert } from "node:assert";
import { createHash } from "node:crypto";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const packageManager = process.env.npm_execpath;
if (!packageManager) throw new Error("npm_execpath is required to run idempotency fixtures");
const codemodBinary = process.env.CODEMOD_BIN;
const codemodRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const temporary = mkdtempSync(join(tmpdir(), "solid2-idempotency-"));

function fixtureExpectedFiles(kind, extension) {
  const root = join(codemodRoot, "tests", kind);
  return readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => ({ name: entry.name, path: join(root, entry.name, `expected.${extension}`) }));
}

function digest(files) {
  const hash = createHash("sha256");
  for (const file of files.sort((a, b) => a.name.localeCompare(b.name))) {
    hash.update(file.name);
    hash.update("\0");
    hash.update(readFileSync(file.path));
    hash.update("\0");
  }
  return hash.digest("hex");
}

function assertNoSecondPass(kind, extension, language, script) {
  const originals = fixtureExpectedFiles(kind, extension);
  const target = join(temporary, kind);
  const copies = originals.map((file) => {
    const path = join(target, file.name, `expected.${extension}`);
    mkdirSync(join(target, file.name), { recursive: true });
    cpSync(file.path, join(target, file.name, `input.${extension}`), { force: true });
    cpSync(file.path, path, { force: true });
    return { name: file.name, path };
  });
  const codemodArgs = ["jssg", "test", "-l", language, join(codemodRoot, script), target, "--strictness", "strict"];
  const result = codemodBinary
    ? spawnSync(codemodBinary, codemodArgs, { cwd: codemodRoot, encoding: "utf8", timeout: 60_000 })
    : spawnSync(process.execPath, [packageManager, "dlx", "codemod@latest", ...codemodArgs], { cwd: codemodRoot, encoding: "utf8", timeout: 60_000 });
  assert.equal(result.status, 0, `${kind} second pass failed:\n${result.stdout}\n${result.stderr}`);
  return { count: copies.length, sha256: digest(copies) };
}

const config = assertNoSecondPass("config", "json", "json", "scripts/config.ts");
const source = assertNoSecondPass("source", "tsx", "tsx", "scripts/source.ts");
process.stdout.write(`exact second-pass no-op: config ${config.count}/${config.count} sha256=${config.sha256}; source ${source.count}/${source.count} sha256=${source.sha256}\n`);
