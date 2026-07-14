import type { Codemod } from "codemod:ast-grep";
import type JSON from "codemod:ast-grep/langs/json";

type JsonObject = Record<string, unknown>;

const SOLID_VERSION = "2.0.0-beta.17";
const SOLID_PEER_VERSION = "^2.0.0-beta.17";
const BABEL_PRESET_VERSION = "2.0.0-beta.17";
const VITE_PLUGIN_VERSION = "3.0.0-next.5";

const isObject = (value: unknown): value is JsonObject =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const hasStringProperty = (value: unknown, property: string): boolean =>
  isObject(value) && typeof value[property] === "string";

/** Updates one dependency entry and reports whether the document changed. */
function setVersion(section: JsonObject, name: string, version: string): boolean {
  if (section[name] === version) return false;
  section[name] = version;
  return true;
}

/** Returns whether a dependency version is owned by a Bun catalog instead of this manifest. */
function isCatalogReference(value: unknown): value is string {
  return typeof value === "string" && /^catalog(?::[^:]*)?$/.test(value);
}

/** Updates a direct version while preserving `catalog:` ownership for catalog consumers. */
function setManagedVersion(section: JsonObject, name: string, version: string): boolean {
  return isCatalogReference(section[name]) ? false : setVersion(section, name, version);
}

/** Collects default and named catalog objects from Bun's supported root manifest locations. */
function catalogObjects(document: JsonObject): JsonObject[] {
  const catalogs: JsonObject[] = [];
  const collect = (owner: unknown) => {
    if (!isObject(owner)) return;
    if (isObject(owner.catalog)) catalogs.push(owner.catalog);
    if (isObject(owner.catalogs)) {
      for (const catalog of Object.values(owner.catalogs)) {
        if (isObject(catalog)) catalogs.push(catalog);
      }
    }
  };
  collect(document);
  collect(document.workspaces);
  return catalogs;
}

/** Preserves the input file's indentation and final-newline conventions after JSON edits. */
function serializeLike(source: string, document: JsonObject): string {
  const indent = source.match(/\n([ \t]+)"/)?.[1] ?? "  ";
  const indentation = indent.includes("\t") ? "\t" : indent.length;
  return `${JSON.stringify(document, null, indentation)}${source.endsWith("\n") ? "\n" : ""}`;
}

const codemod: Codemod<JSON> = async (root) => {
  const source = root.root().text();
  let document: unknown;

  try {
    document = JSON.parse(source);
  } catch {
    return null;
  }

  if (!isObject(document)) return null;

  const dependencies = document.dependencies;
  const devDependencies = document.devDependencies;
  const peerDependencies = document.peerDependencies;
  const hasSolidDependency = hasStringProperty(dependencies, "solid-js");
  const hasSolidDevDependency = hasStringProperty(devDependencies, "solid-js");
  const hasSolidPeerDependency = hasStringProperty(peerDependencies, "solid-js");
  const hasVitePlugin = [dependencies, devDependencies].some((section) =>
    hasStringProperty(section, "vite-plugin-solid"),
  );
  const isPublishableLibrary = hasSolidPeerDependency;
  const isProvenViteWebApplication = hasSolidDependency && hasVitePlugin && !isPublishableLibrary;
  const isWorkspaceRoot =
    hasSolidDevDependency &&
    (document.private === true || Array.isArray(document.workspaces) || isObject(document.workspaces));
  const isDevViteApplication = hasSolidDevDependency && hasVitePlugin && !isPublishableLibrary;
  const hasClassifiedSolidToolchain =
    isPublishableLibrary || isProvenViteWebApplication || isWorkspaceRoot || isDevViteApplication;
  let changed = false;

  // Catalog owners are authoritative. Update them before their consumers so the workspace cannot
  // install a mixed Solid 1/2 graph while every leaf manifest still says `catalog:`.
  for (const catalog of catalogObjects(document)) {
    if (!hasStringProperty(catalog, "solid-js")) continue;
    changed = setVersion(catalog, "solid-js", SOLID_VERSION) || changed;
    changed = setVersion(catalog, "@solidjs/web", SOLID_VERSION) || changed;
    if (hasStringProperty(catalog, "vite-plugin-solid")) {
      changed = setVersion(catalog, "vite-plugin-solid", VITE_PLUGIN_VERSION) || changed;
    }
    if (hasStringProperty(catalog, "babel-preset-solid")) {
      changed = setVersion(catalog, "babel-preset-solid", BABEL_PRESET_VERSION) || changed;
    }
  }

  if (isProvenViteWebApplication && isObject(dependencies)) {
    const solidVersion = dependencies["solid-js"];
    changed = setManagedVersion(dependencies, "solid-js", SOLID_VERSION) || changed;
    changed =
      setVersion(
        dependencies,
        "@solidjs/web",
        isCatalogReference(solidVersion) ? solidVersion : SOLID_VERSION,
      ) || changed;
  }

  if (isPublishableLibrary && isObject(peerDependencies)) {
    // Libraries advertise compatible peer ranges while testing against an exact beta tuple.
    changed = setVersion(peerDependencies, "solid-js", SOLID_PEER_VERSION) || changed;
    if (isObject(dependencies) && hasSolidDependency) {
      // Preserve the author's dependency classification, but never leave a mixed Solid 1 graph.
      changed = setManagedVersion(dependencies, "solid-js", SOLID_VERSION) || changed;
    }
    if (!isObject(devDependencies)) {
      document.devDependencies = {};
    }
    const libraryDevDependencies = document.devDependencies as JsonObject;
    changed = setVersion(libraryDevDependencies, "solid-js", SOLID_VERSION) || changed;
    // Until discovery can scope JSX-bearing packages, source migration may move renderer-owned
    // imports in any included library. Overprovision renderer peers rather than emit broken builds.
    changed = setVersion(peerDependencies, "@solidjs/web", SOLID_PEER_VERSION) || changed;
    changed = setVersion(libraryDevDependencies, "@solidjs/web", SOLID_VERSION) || changed;
  }

  if ((isWorkspaceRoot || isDevViteApplication) && isObject(document.devDependencies)) {
    const solidVersion = document.devDependencies["solid-js"];
    changed = setManagedVersion(document.devDependencies, "solid-js", SOLID_VERSION) || changed;
    changed =
      setVersion(
        document.devDependencies,
        "@solidjs/web",
        isCatalogReference(solidVersion) ? solidVersion : SOLID_VERSION,
      ) || changed;
  }

  for (const section of [dependencies, document.devDependencies]) {
    if (
      hasClassifiedSolidToolchain &&
      isObject(section) &&
      hasStringProperty(section, "vite-plugin-solid")
    ) {
      changed = setManagedVersion(section, "vite-plugin-solid", VITE_PLUGIN_VERSION) || changed;
    }
    if (
      hasClassifiedSolidToolchain &&
      isObject(section) &&
      hasStringProperty(section, "babel-preset-solid")
    ) {
      changed = setManagedVersion(section, "babel-preset-solid", BABEL_PRESET_VERSION) || changed;
    }
  }

  const compilerOptions = document.compilerOptions;
  if (isObject(compilerOptions) && compilerOptions.jsxImportSource === "solid-js") {
    compilerOptions.jsxImportSource = "@solidjs/web";
    changed = true;
  }

  return changed ? serializeLike(source, document) : null;
};

export default codemod;
