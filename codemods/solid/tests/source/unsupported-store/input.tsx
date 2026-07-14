import { createMutable } from "solid-js/store";

const state = createMutable({ count: 0 });
state.count += 1;
