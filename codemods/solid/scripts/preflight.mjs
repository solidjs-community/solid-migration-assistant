#!/usr/bin/env node

import { existsSync, readFileSync, readdirSync, realpathSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const SOURCE_EXTENSIONS = new Set([".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs", ".mts", ".cts"]);
const EXCLUDED_DIRECTORIES = new Set([".git", "dist", "build", "coverage", ".next", ".solid", ".output"]);
const DEPENDENCY_SECTIONS = ["dependencies", "devDependencies", "peerDependencies", "optionalDependencies"];
const CORE_PACKAGES = new Set([
  "solid-js",
  "@solidjs/web",
  "vite-plugin-solid",
  "babel-preset-solid",
]);
const REMOVED_EXPORTS = new Set([
  "ErrorBoundary", "Index", "Suspense", "batch", "catchError", "createComputed",
  "createResource", "createSelector", "getListener", "mergeProps", "onMount", "on",
  "resetErrorBoundaries", "splitProps", "startTransition", "useTransition",
]);

function isObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function posix(path) {
  return path.split(sep).join("/") || ".";
}

function extension(path) {
  const match = path.match(/(\.[^.\\/]+)$/);
  return match?.[1] ?? "";
}

function walk(root, { includeNodeModules = false } = {}) {
  const files = [];
  const pending = [root];
  while (pending.length > 0) {
    const current = pending.pop();
    let entries;
    try {
      entries = readdirSync(current, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      const path = join(current, entry.name);
      if (entry.isSymbolicLink()) continue;
      if (entry.isDirectory()) {
        if (EXCLUDED_DIRECTORIES.has(entry.name)) continue;
        if (!includeNodeModules && entry.name === "node_modules") continue;
        pending.push(path);
      } else if (entry.isFile()) {
        files.push(path);
      }
    }
  }
  return files;
}

function dependencyEntries(document) {
  const entries = [];
  for (const section of DEPENDENCY_SECTIONS) {
    if (!isObject(document[section])) continue;
    for (const [name, version] of Object.entries(document[section])) {
      if (typeof version === "string") entries.push({ section, name, version });
    }
  }
  return entries;
}

function catalogRecords(document, manifestPath) {
  const records = [];
  const collect = (owner, location) => {
    if (!isObject(owner)) return;
    if (isObject(owner.catalog)) records.push({ manifestPath, location: `${location}.catalog`, name: "default", values: owner.catalog });
    if (isObject(owner.catalogs)) {
      for (const [name, values] of Object.entries(owner.catalogs)) {
        if (isObject(values)) records.push({ manifestPath, location: `${location}.catalogs.${name}`, name, values });
      }
    }
  };
  collect(document, "root");
  collect(document.workspaces, "workspaces");
  return records;
}

function classifyPackage(document, entries) {
  if (isObject(document.workspaces) || Array.isArray(document.workspaces)) return "workspace-root";
  if (entries.some((entry) => entry.section === "peerDependencies" && entry.name === "solid-js")) return "library";
  if (entries.some((entry) => entry.name === "vite-plugin-solid")) return "vite-application";
  return document.private === true ? "private-package" : "package";
}

function isSolidEcosystem(name) {
  return CORE_PACKAGES.has(name) || name.includes("solid") || name.startsWith("@solidjs/");
}

function isSolid2Version(version) {
  return /(?:^|[^\d])2(?:\.\d|\b)/.test(version);
}

function peerRangeAllowsSolid2(range) {
  if (range === "*" || range === "latest" || range.startsWith("workspace:")) return true;
  if (/<\s*2(?:\.0\.0)?\b/.test(range)) return false;
  if (isSolid2Version(range)) return true;
  const lower = range.match(/>=\s*(\d+)/)?.[1];
  return lower !== undefined && Number(lower) <= 2 && !/<\s*2/.test(range);
}

function resolveInstalledPackage(target, packageDir, name) {
  const relativeName = name.split("/");
  for (const base of [packageDir, target]) {
    const candidate = join(base, "node_modules", ...relativeName);
    if (!existsSync(candidate)) continue;
    try {
      return realpathSync(candidate);
    } catch {
      return candidate;
    }
  }
  return null;
}

function lineNumber(source, index) {
  return source.slice(0, index).split(/\r?\n/).length;
}

function sourceWorkItems(target, files) {
  const items = [];
  const seen = new Set();
  const add = (item) => {
    const key = `${item.code}\0${item.path}\0${item.line ?? 0}\0${item.evidence ?? ""}`;
    if (!seen.has(key)) {
      seen.add(key);
      items.push(item);
    }
  };

  for (const path of files.filter((file) => SOURCE_EXTENSIONS.has(extension(file)))) {
    let source;
    try {
      source = readFileSync(path, "utf8");
    } catch {
      continue;
    }
    const localPath = posix(relative(target, path));
    for (const marker of source.matchAll(/TODO\(solid-2\s+([A-Z0-9-]+)\):?([^\r\n]*)/g)) {
      add({
        code: marker[1],
        category: marker[1].startsWith("S2-EFFECT") ? "effect" : "manual",
        severity: "blocker",
        path: localPath,
        line: lineNumber(source, marker.index),
        evidence: marker[0].trim(),
        action: "Resolve this structured AST/AI work item and remove its marker.",
      });
    }
    for (const match of source.matchAll(/(?:from\s*|import\s*)["']solid-js\/(store|web)["']/g)) {
      add({
        code: `S2-SOURCE-DEEP-${match[1].toUpperCase()}`,
        category: "removed-deep-import",
        severity: "blocker",
        path: localPath,
        line: lineNumber(source, match.index),
        evidence: match[0],
        action: `Migrate the binding to ${match[1] === "web" ? "@solidjs/web" : "a supported solid-js store export"}.`,
      });
    }
    for (const declaration of source.matchAll(/import\s*\{([\s\S]*?)\}\s*from\s*["']solid-js["']/g)) {
      for (const raw of declaration[1].split(",")) {
        const imported = raw.trim().replace(/^type\s+/, "").split(/\s+as\s+/)[0];
        if (!REMOVED_EXPORTS.has(imported)) continue;
        add({
          code: "S2-SOURCE-REMOVED-EXPORT",
          category: "removed-export",
          severity: "blocker",
          path: localPath,
          line: lineNumber(source, declaration.index),
          evidence: imported,
          action: `Apply a proven ${imported} recipe or route this file to semantic AI review.`,
        });
      }
    }
    const legacyPatterns = [
      ["S2-SOURCE-INDEX", /<\/?Index\b/g, "Migrate Index with its callback and keyed semantics as one transaction."],
      ["S2-SOURCE-DIRECTIVE", /<[a-z][\w:-]*\b[^>]*\buse:[A-Za-z_$][\w$-]*/g, "Migrate the directive definition and all call sites together."],
      ["S2-SOURCE-PROVIDER", /<\/?[A-Z][\w$]*\.Provider\b/g, "Resolve the context binding across files before rewriting its provider."],
    ];
    for (const [code, pattern, action] of legacyPatterns) {
      for (const match of source.matchAll(pattern)) {
        add({ code, category: "semantic", severity: "blocker", path: localPath, line: lineNumber(source, match.index), evidence: match[0], action });
      }
    }
  }
  return items;
}

function installedDependencyRisks(target, packages) {
  const risks = [];
  const scanned = new Set();
  for (const pkg of packages) {
    const packageDir = dirname(join(target, pkg.path));
    for (const entry of pkg.dependencies) {
      if (CORE_PACKAGES.has(entry.name) || entry.name.startsWith("@types/")) continue;
      const installed = resolveInstalledPackage(target, packageDir, entry.name);
      if (!installed || scanned.has(installed)) continue;
      scanned.add(installed);
      let installedManifest;
      try {
        installedManifest = JSON.parse(readFileSync(join(installed, "package.json"), "utf8"));
      } catch {
        continue;
      }
      const peer = installedManifest.peerDependencies?.["solid-js"];
      const hasSolidIdentity = isSolidEcosystem(entry.name) || typeof peer === "string";
      if (!hasSolidIdentity) continue;
      if (typeof peer === "string" && !peerRangeAllowsSolid2(peer)) {
        risks.push({
          code: "S2-DEPS-PEER-001",
          category: "dependency-peer",
          severity: "blocker",
          path: pkg.path,
          dependency: entry.name,
          evidence: `installed peerDependencies.solid-js=${peer}`,
          action: "Upgrade, replace, patch, or remove this dependency before regenerating the lockfile.",
        });
      }
      let scannedFiles = 0;
      for (const file of walk(installed, { includeNodeModules: false })) {
        if (scannedFiles >= 2000 || !SOURCE_EXTENSIONS.has(extension(file))) continue;
        scannedFiles += 1;
        let text;
        try {
          text = readFileSync(file, "utf8");
        } catch {
          continue;
        }
        const deep = text.match(/["']solid-js\/(web|store)["']/)?.[1];
        if (!deep) continue;
        risks.push({
          code: "S2-DEPS-DEEP-001",
          category: "dependency-deep-import",
          severity: "blocker",
          path: pkg.path,
          dependency: entry.name,
          evidence: `${posix(relative(installed, file))} imports solid-js/${deep}`,
          action: "Use a Solid 2-compatible dependency release or patch its removed deep import.",
        });
        break;
      }
    }
  }
  return risks;
}

export function analyzeRepository(targetInput, { phase = "preflight" } = {}) {
  const target = resolve(targetInput);
  const files = walk(target);
  const packageFiles = files.filter((file) => file.endsWith(`${sep}package.json`) || file === join(target, "package.json"));
  const packages = [];
  const catalogs = [];

  for (const packageFile of packageFiles.sort()) {
    let document;
    try {
      document = JSON.parse(readFileSync(packageFile, "utf8"));
    } catch {
      continue;
    }
    if (!isObject(document)) continue;
    const entries = dependencyEntries(document);
    const path = posix(relative(target, packageFile));
    catalogs.push(...catalogRecords(document, path));
    const solidEntries = entries.filter((entry) => isSolidEcosystem(entry.name));
    if (solidEntries.length === 0 && catalogRecords(document, path).every((record) => typeof record.values["solid-js"] !== "string")) continue;
    packages.push({
      path,
      name: typeof document.name === "string" ? document.name : null,
      private: document.private === true,
      role: classifyPackage(document, entries),
      dependencies: entries,
      solidEntries,
      workspaceDependencies: entries.filter((entry) => entry.version.startsWith("workspace:")),
    });
  }

  const unresolvedWork = sourceWorkItems(target, files);
  const catalogByName = new Map(catalogs.map((catalog) => [catalog.name, catalog]));
  for (const pkg of packages) {
    for (const entry of pkg.solidEntries) {
      if (entry.name === "solid-js" || entry.name === "@solidjs/web") {
        if (entry.version.startsWith("catalog:")) {
          const name = entry.version.slice("catalog:".length) || "default";
          const owner = catalogByName.get(name);
          const ownedVersion = owner?.values[entry.name];
          if (!owner || typeof ownedVersion !== "string") {
            unresolvedWork.push({ code: "S2-CATALOG-OWNER-001", category: "catalog", severity: "blocker", path: pkg.path, dependency: entry.name, evidence: entry.version, action: `Define ${entry.name} in the referenced ${name} catalog.` });
          } else if (phase !== "preflight" && !isSolid2Version(ownedVersion)) {
            unresolvedWork.push({ code: "S2-CATALOG-MIXED-001", category: "catalog", severity: "blocker", path: owner.manifestPath, dependency: entry.name, evidence: `${owner.location}=${ownedVersion}`, action: "Update the authoritative catalog to the Solid 2 tuple before installation." });
          }
        } else if (phase !== "preflight" && !isSolid2Version(entry.version) && entry.section !== "peerDependencies") {
          unresolvedWork.push({ code: "S2-DEPS-MIXED-001", category: "dependency-version", severity: "blocker", path: pkg.path, dependency: entry.name, evidence: `${entry.section}=${entry.version}`, action: "Use one coherent Solid 2 runtime/renderer version across the target graph." });
        }
      } else if (!CORE_PACKAGES.has(entry.name)) {
        unresolvedWork.push({ code: "S2-DEPS-REVIEW-001", category: "dependency-review", severity: "warning", path: pkg.path, dependency: entry.name, evidence: `${entry.section}=${entry.version}`, action: "Verify this ecosystem package against Solid 2 and record the compatible version." });
      }
    }
  }
  unresolvedWork.push(...installedDependencyRisks(target, packages));

  const blockers = unresolvedWork.filter((item) => item.severity === "blocker");
  const warnings = unresolvedWork.filter((item) => item.severity === "warning");
  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    phase,
    target,
    status: blockers.length === 0 ? "ready" : "blocked",
    summary: {
      manifestsScanned: packageFiles.length,
      targetPackages: packages.length,
      catalogOwners: catalogs.length,
      blockers: blockers.length,
      warnings: warnings.length,
    },
    packages,
    catalogs: catalogs.map((catalog) => ({ ...catalog, values: Object.fromEntries(Object.entries(catalog.values).filter(([name]) => isSolidEcosystem(name))) })),
    unresolvedWork,
  };
}

export function writeManifest(manifest, path) {
  writeFileSync(path, `${JSON.stringify(manifest, null, 2)}\n`);
}

function parseArguments(argv) {
  let target = null;
  let output = null;
  let phase = "preflight";
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === "--target") target = argv[++index];
    else if (argv[index] === "--output") output = argv[++index];
    else if (argv[index] === "--phase") phase = argv[++index];
  }
  if (!target) throw new Error("Usage: node scripts/preflight.mjs --target <repository> [--output <manifest>] [--phase preflight|postflight]");
  return { target, output: output ?? join(resolve(target), ".solid2-migration.json"), phase };
}

if (resolve(process.argv[1] ?? "") === fileURLToPath(import.meta.url)) {
  const options = parseArguments(process.argv.slice(2));
  const manifest = analyzeRepository(options.target, { phase: options.phase });
  writeManifest(manifest, options.output);
  process.stdout.write(`${options.output}: ${manifest.status} (${manifest.summary.blockers} blockers, ${manifest.summary.warnings} warnings)\n`);
}
