import { createComputed, createMemo, mergeProps } from "solid-js";

createComputed(() => 1);
mergeProps({ value: 1 }, { value: undefined });
createMemo((previous) => previous + 1, 0);
