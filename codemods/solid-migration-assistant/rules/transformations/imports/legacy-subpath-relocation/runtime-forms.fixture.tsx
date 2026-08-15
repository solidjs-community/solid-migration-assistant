// fixture: runtime-forms
const dynamicH = import("solid-js/h");

async function load() {
  const dynamicHtml = await import("solid-js/html");
  return dynamicHtml;
}

declare const require: (name: string) => unknown;
const requiredUniversal = require("solid-js/universal");
type RuntimeTypes = import("solid-js/jsx-runtime").JSX;
type DevTypes = typeof import("solid-js/jsx-dev-runtime");

void dynamicH;
void load;
void requiredUniversal;
type _RuntimeTypes = RuntimeTypes;
type _DevTypes = DevTypes;
