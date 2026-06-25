import { For, Index } from "solid-js";

export const view = <Index each={items()}>{item => <span>{item()}</span>}</Index>;
