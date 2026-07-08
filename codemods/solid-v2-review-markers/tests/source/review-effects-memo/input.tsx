import { createEffect, createMemo } from "solid-js";

createEffect(() => console.log("effect"));
const value = createMemo(() => count(), 0);
