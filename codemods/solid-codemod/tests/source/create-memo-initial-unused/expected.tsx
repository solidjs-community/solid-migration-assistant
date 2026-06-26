import { createMemo } from "solid-js";

const search = createMemo(() => url().search);
