import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { test } from "node:test";
import {
  buildCodemodArguments,
  DISCLOSURE,
  main,
  openReport,
  parseArguments,
  parseTarget,
  resolveCodemodLauncher,
  runCodemod,
} from "../shared/run-workflow.mjs";

const packageDirectory = resolve(import.meta.dirname, "..");
const require = createRequire(import.meta.url);

test("defaults the target to the invocation directory", () => {
  assert.equal(parseTarget([]), ".");
  assert.equal(parseTarget(["--target", "project"]), "project");
  assert.deepEqual(parseArguments(["--report", "report.html", "--open", "--force"]), {
    target: ".",
    report: "report.html",
    force: true,
    open: true,
  });
});

test("rejects unknown, missing, and duplicate options", () => {
  assert.throws(() => parseTarget(["project"]), /unknown argument: project/);
  assert.throws(
    () => parseTarget(["--unknown"]),
    /unknown argument: --unknown/,
  );
  assert.throws(() => parseTarget(["--target"]), /--target requires a value/);
  assert.throws(
    () => parseTarget(["--target", "first", "--target", "second"]),
    /--target may only be specified once/,
  );
  assert.throws(() => parseArguments(["--report"]), /--report requires a value/);
  assert.throws(() => parseArguments(["--force"]), /--force requires --report FILE/);
  assert.throws(() => parseArguments(["--open"]), /--open requires --report FILE/);
});

test("runs the pinned package-local Codemod launcher with safe flags", () => {
  const launcher = resolveCodemodLauncher();
  assert.equal(
    launcher,
    resolve(dirname(require.resolve("codemod/package.json")), "codemod"),
  );
  const codemodPackage = require("codemod/package.json");
  assert.equal(codemodPackage.version, "1.12.13");
  assert.deepEqual(Object.keys(codemodPackage.optionalDependencies).sort(), [
    "@codemod.com/cli-darwin-arm64",
    "@codemod.com/cli-darwin-x64",
    "@codemod.com/cli-linux-arm64-gnu",
    "@codemod.com/cli-linux-x64-gnu",
    "@codemod.com/cli-win32-x64-msvc",
  ]);

  const target = resolve(packageDirectory, "example");
  assert.deepEqual(buildCodemodArguments(target), [
    "--disable-analytics",
    "workflow",
    "run",
    "-w",
    resolve(packageDirectory, "workflow.yaml"),
    "-t",
    target,
    "--allow-dirty",
    "--no-interactive",
  ]);
});

test("delegates runtime availability to the pinned Codemod launcher", () => {
  const target = resolve(packageDirectory, "example");
  let invocation;
  const result = runCodemod(target, {
    spawnImpl: (executable, argumentsList, options) => {
      invocation = { executable, argumentsList, options };
      return { status: 23 };
    },
  });

  assert.equal(result.status, 23);
  assert.equal(invocation.executable, process.execPath);
  assert.deepEqual(invocation.argumentsList, [
    resolveCodemodLauncher(),
    ...buildCodemodArguments(target),
  ]);
  assert.deepEqual(invocation.options, {
    cwd: packageDirectory,
    stdio: [0, 2, 1],
  });
  assert.equal(Object.hasOwn(invocation.options, "env"), false);
});

test("does not reject platforms before invoking Codemod", () => {
  let receivedTarget;
  const result = captureMain([], {
    cwd: packageDirectory,
    platform: "assistant-does-not-preflight-this",
    architecture: "assistant-does-not-preflight-this",
    glibcVersionRuntime: undefined,
    runImpl: (target) => {
      receivedTarget = target;
      return { status: 0 };
    },
  });

  assert.equal(result.status, 0);
  assert.equal(receivedTarget, packageDirectory);
  assertFinalDisclosure(result.diagnostics);
});

test("publishes exact immutable public-preview disclosure", () => {
  const packageJson = require("../package.json");
  assert.match(DISCLOSURE, /Final disclosure/);
  assert.ok(
    DISCLOSURE.includes(`Analyzer: ${packageJson.name}@${packageJson.version}`),
  );
  assert.match(DISCLOSURE, /solid-js@2\.0\.0-rc\.0/);
  assert.match(DISCLOSURE, /ff4d3c4479163fbdd3327f5b22d0c3ea7bd1a2c5/);
  assert.match(
    DISCLOSURE,
    /source-only.*incomplete.*no migration-readiness claim/is,
  );
  assert.match(
    DISCLOSURE,
    /does not run target typechecks, builds, tests, scripts, or applications/,
  );
  assert.match(DISCLOSURE, /Read-only/);
  assert.match(
    DISCLOSURE,
    /only the exact destination above; other Solid versions are unsupported/,
  );
  assert.match(DISCLOSURE, /generated report is emitted only when explicitly requested/);
  assert.match(DISCLOSURE, /Every generated HTML contains bounded project source snippets/);
  assert.match(DISCLOSURE, /Codemod may retain normal workflow or task state/);
  assert.match(DISCLOSURE, /github\.com\/solidjs\/solid\/blob\/ff4d3c44/);
  assert.match(
    DISCLOSURE,
    /github\.com\/devagrawal09\/solid-migration-assistant\/issues/,
  );
  assert.match(DISCLOSURE, /End final disclosure$/);
});

test("ends successful, nonzero, and thrown engine invocations with disclosure", () => {
  for (const childStatus of [0, 23]) {
    const result = captureMain([], {
      cwd: packageDirectory,
      runImpl: () => ({ status: childStatus }),
    });
    assert.equal(result.status, childStatus);
    assert.deepEqual(result.diagnostics, [DISCLOSURE]);
    assertFinalDisclosure(result.diagnostics);
  }

  const thrown = captureMain([], {
    cwd: packageDirectory,
    runImpl: () => {
      throw new Error("engine unavailable");
    },
  });
  assert.equal(thrown.status, 1);
  assert.deepEqual(thrown.diagnostics, [
    "[solid-migration-assistant] analyzer execution failed: engine unavailable",
    DISCLOSURE,
  ]);
  assertFinalDisclosure(thrown.diagnostics);
});

test("writes report only when explicitly requested and launches only with --open", () => {
  const surface = mkdtempSync(join(tmpdir(), "sma-cli-report-test-"));
  const report = join(surface, "migration.html");
  let opened = null;
  try {
    const noFlag = captureMain([], {
      cwd: surface,
      runImpl: (...args) => {
        assert.equal(args.length, 1);
        return { status: 0 };
      },
      openImpl: () => assert.fail("default run must not open a browser"),
    });
    assert.equal(noFlag.status, 0);
    assert.equal(existsSync(report), false);

    const generated = captureMain(["--report", report, "--open"], {
      cwd: surface,
      runImpl: (_target, { reportDataFile }) => {
        writeFileSync(reportDataFile, '{"schemaVersion":1,"reports":{}}');
        return { status: 0 };
      },
      openImpl: (path) => { opened = path; },
    });
    assert.equal(generated.status, 0);
    assert.equal(opened, report);
    const html = readFileSync(report, "utf8");
    assert.match(html, /solid-migration-report-data/);
    assert.match(html, /"schemaVersion":1/);
    assert.match(html, new RegExp(`"analyzedTargetRoot":"${surface.replaceAll("\\", "\\\\")}"`));
  } finally {
    rmSync(surface, { recursive: true, force: true });
  }
});

test("refuses report collisions unless --force is explicit", () => {
  const surface = mkdtempSync(join(tmpdir(), "sma-cli-collision-test-"));
  const report = join(surface, "migration.html");
  writeFileSync(report, "old");
  try {
    const refused = captureMain(["--report", report], {
      cwd: surface,
      runImpl: () => assert.fail("collision must be rejected before analysis"),
    });
    assert.equal(refused.status, 2);
    assert.equal(readFileSync(report, "utf8"), "old");

    const replaced = captureMain(["--report", report, "--force"], {
      cwd: surface,
      runImpl: (_target, { reportDataFile }) => {
        writeFileSync(reportDataFile, '{"schemaVersion":1,"reports":{}}');
        return { status: 0 };
      },
    });
    assert.equal(replaced.status, 0);
    assert.notEqual(readFileSync(report, "utf8"), "old");
  } finally {
    rmSync(surface, { recursive: true, force: true });
  }
});

test("uses platform browser launchers", () => {
  const invocations = [];
  for (const [platform, executable] of [["darwin", "open"], ["linux", "xdg-open"], ["win32", "cmd"]]) {
    openReport("/tmp/report.html", {
      platform,
      spawnImpl: (...args) => { invocations.push(args); return { status: 0 }; },
    });
    assert.equal(invocations.at(-1)[0], executable);
  }
});

test("ends usage and target failures with disclosure", () => {
  const surface = mkdtempSync(join(tmpdir(), "sma-cli-target-test-"));
  const fileTarget = join(surface, "file-target");
  writeFileSync(fileTarget, "not a directory\n");

  try {
    const cases = [
      {
        argumentsList: ["--unknown"],
        expected: "[solid-migration-assistant] unknown argument: --unknown",
      },
      {
        argumentsList: ["--target", "missing"],
        expected: `[solid-migration-assistant] target does not exist: ${join(surface, "missing")}`,
      },
      {
        argumentsList: ["--target", fileTarget],
        expected: `[solid-migration-assistant] target is not a directory: ${fileTarget}`,
      },
    ];

    for (const { argumentsList, expected } of cases) {
      const result = captureMain(argumentsList, {
        cwd: surface,
        runImpl: () => assert.fail("must not launch Codemod"),
      });
      assert.equal(result.status, 2);
      assert.deepEqual(result.diagnostics, [expected, DISCLOSURE]);
      assertFinalDisclosure(result.diagnostics);
    }
  } finally {
    rmSync(surface, { recursive: true, force: true });
  }
});

function captureMain(argumentsList, options) {
  const diagnostics = [];
  const originalError = console.error;
  console.error = (...values) => diagnostics.push(values.join(" "));
  try {
    return { status: main(argumentsList, options), diagnostics };
  } finally {
    console.error = originalError;
  }
}

function assertFinalDisclosure(diagnostics) {
  assert.equal(diagnostics.at(-1), DISCLOSURE);
  assert.equal(
    diagnostics.filter((diagnostic) => diagnostic === DISCLOSURE).length,
    1,
  );
}
