import { /* before */ from /* after */, observable } from "solid-js";
import { from as aliased } from "solid-js";
import * as Solid from "solid-js";
import * as Other from "other-library";

from(observable$);
observable(() => sig);
import { createDynamic } from "solid-js/web";
createDynamic(() => Component, { prop: 1 });
// prettier-ignore
(from /* callee */)(...args);
aliased();
Solid.from();
Other.from();

const indirect = from;
indirect();

function shadowed(from: (...args: unknown[]) => unknown) {
  from();
}

void shadowed;
