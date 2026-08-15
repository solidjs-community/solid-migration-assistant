// Negative transform coverage: every reference below must stay byte-identical.
import constructorModule from "constructor";
import toStringModule from "toString";
import hasOwnPropertyModule from "hasOwnProperty";
import protoModule from "__proto__";
export default "solid-js/h";
import { nearH as prefixNearMiss } from "solid-js/h-extra";
import { nearH as suffixNearMiss } from "vendor/solid-js/h";
import { nearStore as escapedNearMiss } from "solid-js\\x2fstore";
import { createStore } from "solid-js/store";
import { render } from "solid-js/web";
import migratedH from "@solidjs/h";

function require(name: string): unknown {
  return name;
}
const shadowed = require("solid-js/html");

const viaResolve = require.resolve("solid-js/universal");
const viaTemplate = import(`solid-js/jsx-runtime`);
const url = new URL("solid-js/jsx-dev-runtime", import.meta.url);

void constructorModule;
void toStringModule;
void hasOwnPropertyModule;
void protoModule;
void prefixNearMiss;
void suffixNearMiss;
void escapedNearMiss;
void createStore;
void render;
void migratedH;
void shadowed;
void viaResolve;
void viaTemplate;
void url;
