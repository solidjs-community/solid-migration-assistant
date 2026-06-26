// TODO(solid-2): Review semantic migration sites in this file: createDynamic, createResource, produce.
import * as Store from "solid-js";
import * as Solid from "solid-js";
import * as Web from "@solidjs/web";

// TODO(solid-2): Review produce namespace usage; only direct produce wrappers are mechanically safe.
Store.produce(state, recipe);
Solid.flush(() => setCount(1));
// TODO(solid-2): Review createResource resource cluster.
const resource = (Solid as any).createResource;
// TODO(solid-2): Review createDynamic namespace usage; direct two-argument calls can use createComponent(dynamic(source), props).
Web.createDynamic(() => Component);

export const view = <Solid.Errored fallback={err => (err() as Error).message}><Solid.Loading /></Solid.Errored>;
