import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const packageDirectory = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const skillDirectory = resolve(
  packageDirectory,
  "agents/skills/migrate-solid-create-effect",
);
const skill = readFileSync(resolve(skillDirectory, "SKILL.md"), "utf8");
const metadata = readFileSync(
  resolve(skillDirectory, "agents/openai.yaml"),
  "utf8",
);

assert.match(skill, /^---\nname: migrate-solid-create-effect\n/);
assert.match(skill, /description: .+S2-EFFECT-001/);
assert.doesNotMatch(skill, /\[TODO/);
assert.match(skill, /references\/plain-effect\.md/);
assert.equal(
  existsSync(resolve(skillDirectory, "references/plain-effect.md")),
  true,
);
assert.match(metadata, /display_name: "Migrate Solid createEffect"/);
assert.match(metadata, /\$migrate-solid-create-effect/);

console.log("skill structure verification passed");
