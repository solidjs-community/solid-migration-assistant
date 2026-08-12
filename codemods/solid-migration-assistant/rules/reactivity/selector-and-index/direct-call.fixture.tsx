import { /* before */ createSelector /* after */, indexArray } from "solid-js";
import { createSelector as aliased } from "solid-js";
import * as Solid from "solid-js";
import * as Other from "other-library";

createSelector(() => items);
indexArray(() => items, (item) => item);
// prettier-ignore
(createSelector /* callee */)(...args);
aliased();
Solid.createSelector();
Other.createSelector();

const indirect = createSelector;
indirect();

function shadowed(createSelector: (...args: unknown[]) => unknown) {
  createSelector();
}

void shadowed;
