import { render } from "@solidjs/web";
import '@solidjs/web';
import { render as escapedDouble } from "@solidjs/web";
import { render as escapedSingle } from '@solidjs/web';

export { hydrate } from "solid-js/web";

const dynamicModule = import("solid-js/web");
declare const require: (name: string) => unknown;
const commonJsModule = require("solid-js/web");
type WebTypes = import("solid-js/web").JSX;

void render;
void escapedDouble;
void escapedSingle;
void dynamicModule;
void commonJsModule;
type _WebTypes = WebTypes;
