import * as Store from "solid-js/store";
import * as Solid from "solid-js";
import * as Web from "solid-js/web";

Store.produce(state, recipe);
Solid.batch(() => setCount(1));
const resource = Solid.createResource;
Web.createDynamic(() => Component);

export const view = <Solid.ErrorBoundary fallback={err => err.message}><Solid.Suspense /></Solid.ErrorBoundary>;
