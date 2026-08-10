import { createStore } from "solid-js/store";
import h from "solid-js/h";
import html from "solid-js/html";
import { createRenderer } from "solid-js/universal";
import { jsx } from "solid-js/jsx-runtime";
import { jsxDEV } from "solid-js/jsx-dev-runtime";
// prettier-ignore
import type { Store } from 'solid-js/store';
import { h as escapedSlash } from "solid-js\/h";
import { html as escapedHex } from "solid-js\x2fhtml";
import { createRenderer as escapedUnicode } from "solid-js\u002funiversal";

export { createStore as reexportedStore } from "solid-js/store";
export * from "solid-js/h";

const dynamicHtml = import("solid-js/html");
declare const require: (name: string) => unknown;
const commonJsUniversal = require("solid-js/universal");
type RuntimeTypes = import("solid-js/jsx-runtime").JSX;

import { nearStore } from "solid-js/store-extra";
import { nearRuntime } from "solid-js/jsx-runtime-extra";
import { unchangedWeb } from "solid-js/web";

void createStore;
void h;
void html;
void createRenderer;
void jsx;
void jsxDEV;
void escapedSlash;
void escapedHex;
void escapedUnicode;
void dynamicHtml;
void commonJsUniversal;
void nearStore;
void nearRuntime;
void unchangedWeb;
type _Store = Store;
type _RuntimeTypes = RuntimeTypes;
