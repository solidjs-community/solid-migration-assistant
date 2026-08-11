import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  chmodSync,
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  readlinkSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import { DISCLOSURE } from "../shared/run-workflow.mjs";

const packageDirectory = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const expectedFiles = [
  "LICENSE",
  "README.md",
  "bin/solid-migration-assistant.mjs",
  "package.json",
  "rules/imports/beta32-subpaths/beta32-subpaths.ts",
  "rules/imports/web-import/web-import.ts",
  "rules/jsx/class-list/class-list.ts",
  "rules/jsx/component-renames/component-renames.ts",
  "rules/lifecycle/on-mount/on-mount.ts",
  "rules/props/merge-props/merge-props.ts",
  "rules/props/split-props/split-props.ts",
  "rules/reactivity/create-computed/create-computed.ts",
  "rules/reactivity/create-effect/create-effect.ts",
  "rules/reactivity/create-memo/create-memo.ts",
  "rules/store/mutable/mutable.ts",
  "rules/store/produce/produce.ts",
  "rules/store/unwrap/unwrap.ts",
  "scripts/analyze.ts",
  "scripts/emit.ts",
  "shared/analysis.ts",
  "shared/run-workflow.mjs",
  "workflow.yaml",
];

test("publishes complete public npm metadata", () => {
  const packageJson = JSON.parse(
    readFileSync(resolve(packageDirectory, "package.json"), "utf8"),
  );
  assert.equal(packageJson.name, "solid-migration-assistant");
  assert.equal(packageJson.version, "0.1.1");
  assert.equal(packageJson.license, "MIT");
  assert.equal(packageJson.dependencies.codemod, "1.12.13");
  assert.equal(packageJson.engines.node, ">=20.0.0");
  assert.equal(packageJson.publishConfig.access, "public");
  assert.equal(packageJson.os, undefined);
  assert.equal(packageJson.cpu, undefined);
  assert.equal(packageJson.libc, undefined);
  assert.deepEqual(packageJson.bin, {
    "solid-migration-assistant": "./bin/solid-migration-assistant.mjs",
  });
  assert.equal(packageJson.repository.type, "git");
  assert.match(packageJson.repository.url, /solid-migration-assistant/);
  assert.match(packageJson.homepage, /solid-migration-assistant/);
  assert.match(packageJson.bugs.url, /solid-migration-assistant\/issues/);
  assert.ok(packageJson.keywords.includes("solidjs"));
  assert.match(
    readFileSync(resolve(packageDirectory, "LICENSE"), "utf8"),
    /^MIT License/,
  );

  for (const readme of [
    resolve(packageDirectory, "README.md"),
    resolve(packageDirectory, "../../README.md"),
  ]) {
    const contents = readFileSync(readme, "utf8");
    assert.match(
      contents,
      /assistant itself imposes no operating-system, CPU-architecture, or libc restriction/,
    );
    assert.match(
      contents,
      /Actual execution support depends on native runtime availability from the pinned Codemod 1\.12\.13 dependency/,
    );
    assert.match(
      contents,
      /may persist workflow and task state in normal platform user-data directories/,
    );
  }
});

test(
  "packs only the npm runtime and runs without pnpm on PATH",
  () => {
    const temporaryRoot = mkdtempSync(
      join(tmpdir(), "solid-migration-assistant-package-"),
    );

    try {
      assert.equal(expectedFiles.length, 22);
      const packDirectory = join(temporaryRoot, "pack");
      mkdirSync(packDirectory);
      const pack = command(
        "npm",
        ["pack", "--json", "--pack-destination", packDirectory],
        packageDirectory,
      );
      assert.equal(pack.status, 0, output(pack));
      const manifest = JSON.parse(pack.stdout)[0];
      assert.deepEqual(
        manifest.files.map((file) => file.path).sort(),
        expectedFiles,
      );
      assert.equal(
        manifest.files.find(
          (file) => file.path === "bin/solid-migration-assistant.mjs",
        ).mode,
        0o755,
      );

      const tarball = join(packDirectory, manifest.filename);
      assert.equal(existsSync(tarball), true);

      const consumer = join(temporaryRoot, "consumer");
      mkdirSync(join(consumer, "src"), { recursive: true });
      writeFileSync(
        join(consumer, "package.json"),
        JSON.stringify({ name: "package-smoke", private: true }, null, 2) +
          "\n",
      );
      writeFileSync(
        join(consumer, "src/example.tsx"),
        'import { render } from "solid-js/web";\nvoid render;\n',
      );

      const install = command(
        "npm",
        [
          "install",
          "--no-audit",
          "--no-fund",
          "--no-save",
          "--package-lock=false",
          tarball,
        ],
        consumer,
      );
      assert.equal(install.status, 0, output(install));

      const externalSurface = join(temporaryRoot, "external-surface");
      const analyzerEnvironment =
        controlledAnalyzerEnvironment(externalSurface);

      const executable = join(
        consumer,
        `node_modules/.bin/solid-migration-assistant${
          process.platform === "win32" ? ".cmd" : ""
        }`,
      );
      assert.equal(existsSync(executable), true);
      const before = treeSnapshot(consumer);
      const isolatedPath = join(temporaryRoot, "runtime-bin");
      mkdirSync(isolatedPath);

      let smoke;
      if (process.platform === "win32") {
        smoke = command(
          process.execPath,
          [
            join(
              consumer,
              "node_modules/solid-migration-assistant/bin/solid-migration-assistant.mjs",
            ),
          ],
          consumer,
          { ...analyzerEnvironment, PATH: "" },
        );
      } else {
        const nodeLink = join(isolatedPath, "node");
        symlinkSync(process.execPath, nodeLink);
        assert.deepEqual(readdirSync(isolatedPath), ["node"]);
        chmodSync(executable, 0o755);
        smoke = command(executable, [], consumer, {
          ...analyzerEnvironment,
          PATH: isolatedPath,
        });
      }

      assert.equal(smoke.status, 0, output(smoke));
      assert.match(output(smoke), /\[S2-IMPORT-WEB-001\]/);
      assertFinalDisclosure(output(smoke));
      assert.deepEqual(treeSnapshot(consumer), before);
      assertNoAnalyzerArtifacts(consumer);
    } finally {
      rmSync(temporaryRoot, { recursive: true, force: true });
    }
  },
  { timeout: 120_000 },
);

function controlledAnalyzerEnvironment(root) {
  const paths = {
    HOME: join(root, "home"),
    USERPROFILE: join(root, "home"),
    XDG_CONFIG_HOME: join(root, "xdg-config"),
    XDG_DATA_HOME: join(root, "xdg-data"),
    XDG_STATE_HOME: join(root, "xdg-state"),
    XDG_CACHE_HOME: join(root, "xdg-cache"),
    XDG_RUNTIME_DIR: join(root, "xdg-runtime"),
    APPDATA: join(root, "appdata"),
    LOCALAPPDATA: join(root, "local-appdata"),
    TMPDIR: join(root, "temporary"),
    TMP: join(root, "temporary"),
    TEMP: join(root, "temporary"),
  };
  for (const path of new Set(Object.values(paths))) {
    mkdirSync(path, { recursive: true });
  }
  return paths;
}

function command(executable, argumentsList, cwd, environment = {}) {
  return spawnSync(executable, argumentsList, {
    cwd,
    encoding: "utf8",
    env: {
      ...process.env,
      CI: "true",
      FORCE_COLOR: undefined,
      NO_COLOR: "1",
      ...environment,
    },
  });
}

function output(result) {
  return `${result.stdout ?? ""}${result.stderr ?? ""}`;
}

function assertFinalDisclosure(value) {
  const stripped = value
    .replace(/\u001b\[[0-?]*[ -/]*[@-~]/g, "")
    .trimEnd();
  assert.ok(stripped.endsWith(DISCLOSURE));
  assert.equal(
    stripped.split("[solid-migration-assistant] Final disclosure").length - 1,
    1,
  );
}

function assertNoAnalyzerArtifacts(target) {
  for (const path of [
    ".codemod",
    ".codemod-reports",
    "build",
    "coverage",
    "dist",
  ]) {
    assert.equal(existsSync(join(target, path)), false, path);
  }
}

function treeSnapshot(root) {
  const snapshot = {};
  visit(root, root, snapshot);
  return snapshot;
}

function visit(root, directory, snapshot) {
  for (const entry of readdirSync(directory, { withFileTypes: true }).sort(
    (left, right) => left.name.localeCompare(right.name),
  )) {
    const path = join(directory, entry.name);
    const relativePath = relative(root, path).replaceAll("\\", "/");
    if (entry.isDirectory()) {
      snapshot[`directory:${relativePath}`] = true;
      visit(root, path, snapshot);
      continue;
    }
    if (entry.isSymbolicLink()) {
      snapshot[`symlink:${relativePath}`] = readlinkSync(path);
      continue;
    }
    if (!entry.isFile() || !lstatSync(path).isFile()) continue;
    snapshot[`file:${relativePath}`] = createHash("sha256")
      .update(readFileSync(path))
      .digest("hex");
  }
}
