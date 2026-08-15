import type { Codemod } from "codemod:ast-grep";
import type TSX from "codemod:ast-grep/langs/tsx";
import {
  relocateLegacySubpaths,
  TRANSFORM_MIGRATION_GUIDE,
} from "./legacy-subpath-relocation.ts";

const EXPECTED_RELOCATIONS = [
  { location: "1:15", from: "solid-js/h", to: "@solidjs/h" },
  { location: "2:18", from: "solid-js/html", to: "@solidjs/html" },
  { location: "3:32", from: "solid-js/universal", to: "@solidjs/universal" },
  { location: "4:21", from: "solid-js/jsx-runtime", to: "@solidjs/web/jsx-runtime" },
  { location: "5:24", from: "solid-js/jsx-dev-runtime", to: "@solidjs/web/jsx-dev-runtime" },
  { location: "7:36", from: "solid-js/html", to: "@solidjs/html" },
  { location: "9:50", from: "solid-js/universal", to: "@solidjs/universal" },
  { location: "10:36", from: "solid-js/html", to: "@solidjs/html" },
  { location: "11:50", from: "solid-js/universal", to: "@solidjs/universal" },
  { location: "12:41", from: "solid-js/jsx-runtime", to: "@solidjs/web/jsx-runtime" },
  { location: "13:37", from: "solid-js/jsx-dev-runtime", to: "@solidjs/web/jsx-dev-runtime" },
  { location: "16:34", from: "solid-js/h", to: "@solidjs/h" },
  { location: "17:15", from: "solid-js/html", to: "@solidjs/html" },
  { location: "19:28", from: "solid-js/html", to: "@solidjs/html" },
  { location: "21:35", from: "solid-js/universal", to: "@solidjs/universal" },
  { location: "22:28", from: "solid-js/jsx-runtime", to: "@solidjs/web/jsx-runtime" },
] as const;

const EXPECTED_TRANSFORMED = String.raw`import h from "@solidjs/h";
import html from "@solidjs/html";
import { createRenderer } from "@solidjs/universal";
import { jsx } from "@solidjs/web/jsx-runtime";
import { jsxDEV } from "@solidjs/web/jsx-dev-runtime";
// prettier-ignore
import { html as singleHtml } from '@solidjs/html';
// prettier-ignore
import { createRenderer as singleRenderer } from '@solidjs/universal';
import { html as escapedHex } from "@solidjs/html";
import { createRenderer as escapedUnicode } from "@solidjs/universal";
import { jsx as escapedCodePoint } from "@solidjs/web/jsx-runtime";
import { jsxDEV as continued } from "@solidjs/web/jsx-dev-runtime";

export { h as reexportedH } from "@solidjs/h";
export * from "@solidjs/html";

const dynamicHtml = import("@solidjs/html");
declare const require: (name: string) => unknown;
const commonJsUniversal = require("@solidjs/universal");
type RuntimeTypes = import("@solidjs/web/jsx-runtime").JSX;

// Out-of-scope and already-migrated references that must remain byte-identical.
import { createStore as storeIsOutOfScope } from "solid-js/store";
import { render as webIsOutOfScope } from "solid-js/web";
import migratedH from "@solidjs/h";
import migratedHtml from "@solidjs/html";
import { createRenderer as migratedUniversal } from "@solidjs/universal";
import { jsx as migratedRuntime } from "@solidjs/web/jsx-runtime";
import { jsxDEV as migratedDevRuntime } from "@solidjs/web/jsx-dev-runtime";
import { nearH as prefixNearMiss } from "solid-js/h-extra";
import { nearH as suffixNearMiss } from "vendor/solid-js/h";
import { nearH as trailingSlashNearMiss } from "solid-js/h/";
import { nearStore as escapedNearMiss } from "solid-js\\x2fstore";

void h;
void html;
void createRenderer;
void jsx;
void jsxDEV;
void singleHtml;
void singleRenderer;
void escapedHex;
void escapedUnicode;
void escapedCodePoint;
void continued;
void reexportedH;
void dynamicHtml;
void commonJsUniversal;
void storeIsOutOfScope;
void webIsOutOfScope;
void migratedH;
void migratedHtml;
void migratedUniversal;
void migratedRuntime;
void migratedDevRuntime;
void prefixNearMiss;
void suffixNearMiss;
void trailingSlashNearMiss;
void escapedNearMiss;
type _RuntimeTypes = RuntimeTypes;
`;

const testLegacySubpathRelocation: Codemod<TSX> = async (root) => {
  const rootNode = root.root();
  const filename = root.relativeFilename().replaceAll("\\", "/");
  const relocations = relocateLegacySubpaths(rootNode, filename);

  const expected = EXPECTED_RELOCATIONS.map(
    ({ location, from, to }) =>
      `${filename}:${location} Relocate ${from} to ${to}. Official migration guide: ${TRANSFORM_MIGRATION_GUIDE}`,
  ).sort();

  const actual = relocations.map(({ report }) => report).sort();
  if (actual.join("\n") !== expected.join("\n")) {
    throw new Error(
      `unexpected relocation report:\n${actual.join("\n")}\nExpected:\n${expected.join("\n")}`,
    );
  }

  const transformed = rootNode.commitEdits(relocations.map(({ edit }) => edit));
  if (transformed !== EXPECTED_TRANSFORMED) {
    throw new Error(
      `unexpected transformed output:\n${transformed}\nExpected:\n${EXPECTED_TRANSFORMED}`,
    );
  }

  const source = root.source();
  for (const nearestNegative of [
    'solid-js\\\\x2fstore',
    'from "solid-js/store"',
    'from "solid-js/web"',
    'from "@solidjs/h"',
    'from "solid-js/h-extra"',
    'from "vendor/solid-js/h"',
    'from "solid-js/h/"',
  ]) {
    if (!source.includes(nearestNegative)) {
      throw new Error(`missing nearest-negative fixture: ${nearestNegative}`);
    }
  }

  return null;
};

export default testLegacySubpathRelocation;
