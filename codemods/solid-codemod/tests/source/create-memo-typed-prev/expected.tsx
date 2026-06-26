import { createMemo } from "solid-js";

const value = createMemo((prev: URL = origin) => prev, { equals: false });
