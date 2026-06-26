import { createMemo, on } from "solid-js";
import type { RouteContext } from "./types";

const routeStates = createMemo(
  on(props.routerState.matches, (nextMatches, prevMatches, prev: RouteContext[] | undefined) => {
    let equal = prevMatches && nextMatches.length === prevMatches.length;
    if (prev && equal) {
      return prev;
    }
    return nextMatches.map(match => ({ match } as RouteContext));
  })
);
