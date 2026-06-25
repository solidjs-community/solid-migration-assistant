import { createMemo } from "solid-js";

const value = createMemo(async () => await fetchValue());
