import { createMemo } from "solid-js";
import type { RouteContext } from "./types";

const routeStates = (() => {
  let __solid2PreviousSource: unknown;
  return createMemo((prev: RouteContext[] | undefined) => {
  const nextMatches = props.routerState.matches();
  const prevMatches = __solid2PreviousSource as typeof nextMatches | undefined;
  try {
    let equal = prevMatches && nextMatches.length === prevMatches.length;
        if (prev && equal) {
          return prev;
        }
        return nextMatches.map(match => ({ match } as RouteContext));
  } finally {
    __solid2PreviousSource = nextMatches;
  }
});
})();
