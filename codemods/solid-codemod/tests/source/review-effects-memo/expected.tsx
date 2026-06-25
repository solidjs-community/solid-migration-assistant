// TODO(solid-2): Review semantic migration sites in this file: createEffect, createMemo.
import { createEffect, createMemo } from "solid-js";

// TODO(solid-2): Review createEffect split.
createEffect(() => console.log("effect"));
// TODO(solid-2): Review createMemo initial prev migration.
const value = createMemo(() => count(), 0);
