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

  if (isProvenViteWebApplication && isObject(dependencies)) {
    changed = setVersion(dependencies, "solid-js", SOLID_VERSION) || changed;
    changed = setVersion(dependencies, "@solidjs/web", SOLID_VERSION) || changed;
  }

  if (isPublishableLibrary && isObject(peerDependencies)) {
    // Libraries advertise compatible peer ranges while testing against an exact beta tuple.
    changed = setVersion(peerDependencies, "solid-js", SOLID_PEER_VERSION) || changed;
    if (isObject(dependencies) && hasSolidDependency) {
      // Preserve the author's dependency classification, but never leave a mixed Solid 1 graph.
      changed = setVersion(dependencies, "solid-js", SOLID_VERSION) || changed;
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
    changed = setVersion(document.devDependencies, "solid-js", SOLID_VERSION) || changed;
    changed = setVersion(document.devDependencies, "@solidjs/web", SOLID_VERSION) || changed;
  }

  for (const section of [dependencies, document.devDependencies]) {
    if (
      hasClassifiedSolidToolchain &&
      isObject(section) &&
      hasStringProperty(section, "vite-plugin-solid")
    ) {
      changed = setVersion(section, "vite-plugin-solid", VITE_PLUGIN_VERSION) || changed;
    }
    if (
      hasClassifiedSolidToolchain &&
      isObject(section) &&
      hasStringProperty(section, "babel-preset-solid")
    ) {
      changed = setVersion(section, "babel-preset-solid", BABEL_PRESET_VERSION) || changed;
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
