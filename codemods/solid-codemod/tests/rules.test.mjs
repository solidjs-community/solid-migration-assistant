import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const packageDirectory = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const rulesDirectory = resolve(packageDirectory, "rules");
const ruleCases = [
  {
    adapter: "rules/imports/web-import.test.ts",
    fixtures: "rules/imports/__testfixtures__/web-import",
  },
  {
    adapter: "rules/imports/beta32-subpaths.test.ts",
    fixtures: "rules/imports/__testfixtures__/beta32-subpaths",
  },
  {
    adapter: "rules/jsx/component-renames.test.ts",
    fixtures: "rules/jsx/__testfixtures__/component-renames",
    semanticWorkspace: true,
  },
  {
    adapter: "rules/jsx/class-list.test.ts",
    fixtures: "rules/jsx/__testfixtures__/class-list",
  },
  {
    adapter: "rules/lifecycle/on-mount.test.ts",
    fixtures: "rules/lifecycle/__testfixtures__",
    semanticWorkspace: true,
  },
  {
    adapter: "rules/reactivity/create-effect.test.ts",
    fixtures: "rules/reactivity/__testfixtures__/create-effect",
    semanticWorkspace: true,
  },
  {
    adapter: "rules/reactivity/create-computed.test.ts",
    fixtures: "rules/reactivity/__testfixtures__/create-computed",
    semanticWorkspace: true,
  },
  {
    adapter: "rules/reactivity/create-memo.test.ts",
    fixtures: "rules/reactivity/__testfixtures__/create-memo",
    semanticWorkspace: true,
  },
  {
    adapter: "rules/props/merge-props.test.ts",
    fixtures: "rules/props/__testfixtures__/merge-props",
    semanticWorkspace: true,
  },
  {
    adapter: "rules/props/split-props.test.ts",
    fixtures: "rules/props/__testfixtures__/split-props",
    semanticWorkspace: true,
  },
  {
    adapter: "rules/store/mutable.test.ts",
    fixtures: "rules/store/__testfixtures__/mutable",
    semanticWorkspace: true,
  },
  {
    adapter: "rules/store/produce.test.ts",
    fixtures: "rules/store/__testfixtures__/produce",
    semanticWorkspace: true,
  },
  {
    adapter: "rules/store/unwrap.test.ts",
    fixtures: "rules/store/__testfixtures__/unwrap",
    semanticWorkspace: true,
  },
];

const configuredAdapters = ruleCases.map(({ adapter }) => adapter).sort();
const existingAdapters = findFiles(rulesDirectory, (name) =>
  name.endsWith(".test.ts"),
)
  .map((path) => relative(packageDirectory, path))
  .sort();

if (configuredAdapters.length !== 13 || existingAdapters.length !== 13) {
  throw new Error(
    `Expected 13 rule adapters, found ${configuredAdapters.length} configured and ${existingAdapters.length} on disk.`,
  );
}
if (configuredAdapters.join("\n") !== existingAdapters.join("\n")) {
  throw new Error(
    `Rule adapter coverage is out of date.\nConfigured:\n${configuredAdapters.join("\n")}\nOn disk:\n${existingAdapters.join("\n")}`,
  );
}

const cases = ruleCases.flatMap((ruleCase) =>
  findFiles(
    resolve(packageDirectory, ruleCase.fixtures),
    (name) => name === "input.tsx",
  ).map((target) => ({ ...ruleCase, target })),
);

const configuredFixtures = cases
  .map(({ target }) => relative(packageDirectory, target))
  .sort();
const existingFixtures = findFiles(
  rulesDirectory,
  (name) => name === "input.tsx",
)
  .map((path) => relative(packageDirectory, path))
  .sort();

if (configuredFixtures.length !== 22 || existingFixtures.length !== 22) {
  throw new Error(
    `Expected 22 input.tsx fixture cases, found ${configuredFixtures.length} configured and ${existingFixtures.length} on disk.`,
  );
}
if (configuredFixtures.join("\n") !== existingFixtures.join("\n")) {
  throw new Error(
    `Rule fixture coverage is out of date.\nConfigured:\n${configuredFixtures.join("\n")}\nOn disk:\n${existingFixtures.join("\n")}`,
  );
}

for (const ruleCase of cases) {
  runRuleCase(ruleCase);
}

console.log(
  `Rule detection passed: ${ruleCases.length} adapters, ${cases.length} fixture cases, 0 targets changed.`,
);

function runRuleCase({ adapter, semanticWorkspace, target }) {
  const adapterPath = resolve(packageDirectory, adapter);
  const fixtureDirectory = dirname(target);
  const args = [
    "dlx",
    "codemod@1.12.13",
    "jssg",
    "run",
    "--language",
    "tsx",
    adapterPath,
    "--target",
    target,
    "--dry-run",
    "--no-interactive",
    "--allow-dirty",
    "--disable-analytics",
    "--no-color",
  ];
  if (semanticWorkspace) {
    args.push("--semantic-workspace", fixtureDirectory);
  }

  const before = hashFile(target);
  const result = spawnSync("pnpm", args, {
    cwd: packageDirectory,
    encoding: "utf8",
    maxBuffer: 10 * 1024 * 1024,
    shell: false,
  });
  const after = hashFile(target);
  const context = commandContext(adapterPath, target, result);

  if (before !== after) {
    throw new Error(
      `Rule detection changed its target.\n${context}\nBefore: ${before}\nAfter:  ${after}`,
    );
  }
  if (result.error) {
    throw new Error(
      `Could not spawn the rule detection command: ${result.error.message}\n${context}`,
      { cause: result.error },
    );
  }
  if (result.signal) {
    throw new Error(
      `Rule detection was terminated by signal ${result.signal}.\n${context}`,
    );
  }
  if (result.status !== 0) {
    throw new Error(
      `Rule detection exited with status ${String(result.status)}.\n${context}`,
    );
  }
}

function hashFile(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function commandContext(adapter, target, result) {
  return [
    `Adapter: ${relative(packageDirectory, adapter)}`,
    `Fixture: ${relative(packageDirectory, target)}`,
    `stdout:\n${result.stdout || "(empty)"}`,
    `stderr:\n${result.stderr || "(empty)"}`,
  ].join("\n");
}

function findFiles(directory, predicate) {
  const matches = [];
  for (const entry of readdirSync(directory, { withFileTypes: true }).sort(
    (left, right) => left.name.localeCompare(right.name),
  )) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) matches.push(...findFiles(path, predicate));
    if (entry.isFile() && predicate(entry.name)) matches.push(path);
  }
  return matches;
}
