import { createEffect as effect } from "solid-js";
import * as Solid from "solid-js";

effect(() => console.log("alias"));
Solid.createEffect(() => console.log("namespace"));

export { render } from "solid-js/web";
const dynamicModule = import("solid-js/web");
declare const require: (name: string) => unknown;
const commonJsModule = require("solid-js/web");
type WebTypes = import("solid-js/web").JSX;

const text = "import from solid-js/web";
// import { hydrate } from "solid-js/web";

void dynamicModule;
void commonJsModule;
void text;
type _WebTypes = WebTypes;
