// fixture: runtime-forms
const dynamicWeb = import("solid-js/web");
declare const require: (name: string) => unknown;
const requiredWeb = require("solid-js/web");
type WebJsx = import("solid-js/web").JSX;
type WebModule = typeof import("solid-js/web");

async function loadRenderer() {
  const { render } = await import("solid-js/web");
  return render;
}

const lazyWeb = () => import("solid-js/web").then(({ hydrate }) => hydrate);

void dynamicWeb;
void requiredWeb;
void loadRenderer;
void lazyWeb;
type _WebJsx = WebJsx;
type _WebModule = WebModule;
