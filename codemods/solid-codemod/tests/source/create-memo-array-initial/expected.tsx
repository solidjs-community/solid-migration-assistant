import { createMemo } from "solid-js";

type PaginationProps = string[];
const pages = createMemo<PaginationProps>((previous = []) =>
    [...Array(opts().pages)].map(
      (_, i) => previous[i] || String(i),
    ));
