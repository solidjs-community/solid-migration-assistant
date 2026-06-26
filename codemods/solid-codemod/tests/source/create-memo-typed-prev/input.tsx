import { createMemo } from "solid-js";

const value = createMemo((prev: URL) => prev, origin, { equals: false });
