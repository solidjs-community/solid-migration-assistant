import h from "solid-js/h";
import html from "solid-js/html";
import { createRenderer } from "solid-js/universal";
import { jsx } from "solid-js/jsx-runtime";
import { jsxDEV } from "solid-js/jsx-dev-runtime";
// prettier-ignore
import { html as singleHtml } from 'solid-js/html';
// prettier-ignore
import { createRenderer as singleRenderer } from 'solid-js/universal';
import { html as escapedHex } from "solid-js\x2fhtml";
import { createRenderer as escapedUnicode } from "solid-js\u002funiversal";
import { jsx as escapedCodePoint } from "solid-js\u{2f}jsx-runtime";
import { jsxDEV as continued } from "solid-js/\
jsx-dev-runtime";

export { h as reexportedH } from "solid-js/h";
export * from "solid-js/html";

const dynamicHtml = import("solid-js/html");
declare const require: (name: string) => unknown;
const commonJsUniversal = require("solid-js/universal");
type RuntimeTypes = import("solid-js/jsx-runtime").JSX;

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
