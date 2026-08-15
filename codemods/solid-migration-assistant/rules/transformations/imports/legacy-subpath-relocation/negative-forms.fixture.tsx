// fixture: negative-forms
import { nearH as prefixNearMiss } from "solid-js/h-extra";
import { nearH as suffixNearMiss } from "vendor/solid-js/h";
import { nearH as trailingSlashNearMiss } from "solid-js/h/";
import { nearStore as escapedNearMiss } from "solid-js\\x2fstore";
import { createStore } from "solid-js/store";
import { render } from "solid-js/web";
import migratedH from "@solidjs/h";
export default "solid-js/h";
const viaResolve = require.resolve("solid-js/html");
const viaTemplate = import(`solid-js/universal`);
const url = new URL("solid-js/jsx-runtime", import.meta.url);

void prefixNearMiss;
void suffixNearMiss;
void trailingSlashNearMiss;
void escapedNearMiss;
void createStore;
void render;
void migratedH;
void viaResolve;
void viaTemplate;
void url;
