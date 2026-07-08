import { createEffect, on } from "solid-js";

const aliasCount = count;

createEffect(on([count, aliasCount], (values, previous) => update(values, previous)), "seed");
