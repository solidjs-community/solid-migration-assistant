import { /* before */ createResource /* after */ } from "solid-js";
import { createResource as aliased } from "solid-js";
import * as Solid from "solid-js";
import * as Other from "other-library";

createResource(() => id, fetchUser);
// prettier-ignore
(createResource /* callee */)(...args);
aliased();
Solid.createResource();
Other.createResource();

const indirect = createResource;
indirect();

function shadowed(createResource: (...args: unknown[]) => unknown) {
  createResource();
}

void shadowed;
