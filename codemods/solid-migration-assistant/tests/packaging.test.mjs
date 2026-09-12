import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  readlinkSync,
  realpathSync,
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
  "benchmarks/workspace-pass.ts",
  "benchmarks/workspace-passes.mjs",
  "bin/solid-migration-assistant.mjs",
  "package.json",
  "rules/analysis/imports/beta32-subpaths/beta32-subpaths.ts",
  "rules/analysis/imports/web-import/web-import.ts",
  "rules/analysis/jsx/class-list/class-list.ts",
  "rules/analysis/jsx/component-renames/component-renames.ts",
  "rules/analysis/jsx/context-provider/context-provider.ts",
  "rules/analysis/jsx/dom-attr-namespaces/dom-attr-namespaces.ts",
  "rules/analysis/jsx/dom-event-namespaces/dom-event-namespaces.ts",
  "rules/analysis/jsx/dom-use-directive/dom-use-directive.ts",
  "rules/analysis/lifecycle/on-cleanup/on-cleanup.ts",
  "rules/analysis/lifecycle/on-mount/on-mount.ts",
  "rules/analysis/props/merge-props/merge-props.ts",
  "rules/analysis/props/split-props/split-props.ts",
  "rules/analysis/reactivity/batch/batch.ts",
  "rules/analysis/reactivity/create-computed/create-computed.ts",
  "rules/analysis/reactivity/create-dynamic/create-dynamic.ts",
  "rules/analysis/reactivity/create-effect/create-effect.ts",
  "rules/analysis/reactivity/create-memo/create-memo.ts",
  "rules/analysis/reactivity/create-resource/create-resource.ts",
  "rules/analysis/reactivity/create-selector/create-selector.ts",
  "rules/analysis/reactivity/error-handling/error-handling.ts",
  "rules/analysis/reactivity/from-observable/from-observable.ts",
  "rules/analysis/reactivity/index-array/index-array.ts",
  "rules/analysis/reactivity/on-helper/on-helper.ts",
  "rules/analysis/reactivity/transition-apis/transition-apis.ts",
  "rules/analysis/reactivity/utility-renames/utility-renames.ts",
  "rules/analysis/store/mutable/mutable.ts",
  "rules/analysis/store/produce/produce.ts",
  "rules/analysis/store/unwrap/unwrap.ts",
  "rules/transformations/imports/legacy-subpath-relocation/legacy-subpath-relocation.ts",
  "rules/transformations/imports/web-package-relocation/web-package-relocation.ts",
  "rules/transformations/jsx/class-list-to-class/class-list-to-class.ts",
  "shared/analysis.ts",
  "shared/entrypoint.ts",
  "shared/register-ts.mjs",
  "shared/run-workflow.mjs",
  "shared/transform.ts",
  "shared/workflow.ts",
  "workflows/analyze.ts",
  "workflows/transform.ts",
];
const expectedDescription =
  "Solid 1.9 to Solid 2 RC migration assistant: read-only analyzer plus deterministic legacy import-path relocation and intrinsic JSX classList-to-class rewriting for project-owned JavaScript and TypeScript source";
const expectedKeywords = [
  "solid",
  "solidjs",
  "solid-2",
  "migration",
  "codemod",
  "analyzer",
  "javascript",
  "typescript",
  "jsx",
  "tsx",
];

test("publishes complete npm metadata and names its unpublished runtime dependency honestly", () => {
  const packageJson = JSON.parse(
    readFileSync(resolve(packageDirectory, "package.json"), "utf8"),
  );
  assert.equal(packageJson.name, "solid-migration-assistant");
  assert.equal(packageJson.version, "0.3.0");
  assert.equal(packageJson.description, expectedDescription);
  assert.deepEqual(packageJson.keywords, expectedKeywords);
  assert.equal(packageJson.license, "MIT");
  // The only runtime dependency is the private orchestration prototype,
  // reachable solely through a relative link to the sibling codemod
  // checkout; the pinned Codemod CLI is gone with the YAML workflows.
  assert.deepEqual(packageJson.dependencies, {
    "@codemod.com/orchestration": "link:../../../codemod/packages/orchestration",
  });
  assert.equal(packageJson.devDependencies.codemod, undefined);
  assert.equal(packageJson.engines.node, ">=24.0.0");
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
  assert.equal(packageJson.scripts.validate, undefined);

  // No registry manifest or YAML workflow ships or remains.
  for (const obsolete of ["codemod.yaml", "workflow.yaml", "transform.yaml"]) {
    assert.equal(existsSync(resolve(packageDirectory, obsolete)), false, obsolete);
  }
  assert.match(
    readFileSync(resolve(packageDirectory, "LICENSE"), "utf8"),
    /^MIT License/,
  );

  for (const readme of [
    resolve(packageDirectory, "README.md"),
    resolve(packageDirectory, "../../README.md"),
  ]) {
    const contents = readFileSync(readme, "utf8");
    assert.match(contents, /@codemod\.com\/orchestration/);
    assert.match(contents, /link:\.\.\/\.\.\/\.\.\/codemod\/packages\/orchestration/);
    assert.match(contents, /cargo build -p butterflow-execution-bridge/);
    assert.match(contents, /CODEMOD_BRIDGE_BIN/);
    assert.match(contents, /Node 24/);
    assert.match(contents, /Publication blocker/);
    assert.doesNotMatch(contents, /Codemod 1\.12\.13/);
    assert.doesNotMatch(contents, /workflow\.yaml|transform\.yaml|codemod\.yaml/);
    assert.doesNotMatch(contents, /npx --yes solid-migration-assistant/);
  }
});

test(
  "packs only the runtime the workflows need and runs from an installed layout without pnpm on PATH",
  () => {
    const temporaryRoot = mkdtempSync(
      join(tmpdir(), "solid-migration-assistant-package-"),
    );

    try {
      assert.equal(expectedFiles.length, 45);
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

      // `npm install <tarball>` cannot resolve the `link:` dependency from a
      // consumer, which is the publication blocker the README documents. The
      // installed layout is therefore assembled by hand: the tarball's files
      // under node_modules, plus the private orchestration prototype provided
      // exactly as this checkout provides it, as a link to the sibling
      // codemod checkout.
      const consumer = join(temporaryRoot, "consumer");
      const installed = join(consumer, "node_modules", "solid-migration-assistant");
      mkdirSync(join(installed, "node_modules", "@codemod.com"), { recursive: true });
      const extract = command(
        "tar",
        ["-xzf", tarball, "--strip-components=1", "-C", installed],
        temporaryRoot,
      );
      assert.equal(extract.status, 0, output(extract));
      symlinkSync(
        realpathSync.native(
          resolve(packageDirectory, "node_modules/@codemod.com/orchestration"),
        ),
        join(installed, "node_modules", "@codemod.com", "orchestration"),
        "dir",
      );
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

      const externalSurface = join(temporaryRoot, "external-surface");
      const analyzerEnvironment =
        controlledAnalyzerEnvironment(externalSurface);
      const executable = join(installed, "bin/solid-migration-assistant.mjs");
      const before = treeSnapshot(consumer);
      const isolatedPath = join(temporaryRoot, "runtime-bin");
      mkdirSync(isolatedPath);
      let runtimePath = isolatedPath;
      if (process.platform === "win32") {
        runtimePath = "";
      } else {
        symlinkSync(process.execPath, join(isolatedPath, "node"));
        assert.deepEqual(readdirSync(isolatedPath), ["node"]);
      }

      const smokeRuns = [];
      for (let run = 1; run <= 2; run += 1) {
        const smoke = command(process.execPath, [executable], consumer, {
          ...analyzerEnvironment,
          PATH: runtimePath,
        });
        smokeRuns.push(smoke);

        assert.equal(smoke.status, 0, `packed run ${run}: ${output(smoke)}`);
        assert.match(smoke.stdout, /^src\/example\.tsx:1:24 Move this Solid web renderer static import\./);
        assert.match(
          smoke.stdout,
          /github\.com\/solidjs\/solid\/blob\/ff4d3c44.*imports-where-things-live-now/,
        );
        assert.doesNotMatch(smoke.stdout, /S2-IMPORT-WEB-001/);
        assert.equal(smoke.stderr, `${DISCLOSURE}\n`);
        assert.deepEqual(
          treeSnapshot(consumer),
          before,
          `packed run ${run} changed the consumer tree`,
        );
        assertNoAnalyzerArtifacts(consumer);
      }

      assert.deepEqual(
        Buffer.from(`${smokeRuns[0].stdout}\0${smokeRuns[0].stderr}`, "utf8"),
        Buffer.from(`${smokeRuns[1].stdout}\0${smokeRuns[1].stderr}`, "utf8"),
        "packed runtime output changed between runs",
      );
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
    maxBuffer: 10 * 1024 * 1024,
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
    if (entry.isSymbolicLink()) {
      snapshot[`symlink:${relativePath}`] = readlinkSync(path);
      continue;
    }
    if (entry.isDirectory()) {
      snapshot[`directory:${relativePath}`] = true;
      visit(root, path, snapshot);
      continue;
    }
    if (!entry.isFile() || !lstatSync(path).isFile()) continue;
    snapshot[`file:${relativePath}`] = createHash("sha256")
      .update(readFileSync(path))
      .digest("hex");
  }
}
