import { createDynamic, createEffect, createMemo, createRenderEffect, on } from "solid-js";

createDynamic(source, props);
createEffect(() => update());
createRenderEffect(() => update(), seed);
createMemo(() => count(), 0, { equals: false });
createEffect(on(source, value => update(value)));
