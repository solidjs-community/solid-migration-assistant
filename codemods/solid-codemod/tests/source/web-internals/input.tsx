import { addEventListener, Aliases, Properties, SVGNamespace, classList, clearDelegatedEvents, effect, getPropAlias, setBoolAttribute, ssrSpread, use } from "solid-js/web";

addEventListener(node, "click", handleClick);
clearDelegatedEvents();
effect((previous = 0) => previous + 1, 0);
console.log(Aliases, Properties, SVGNamespace, classList, getPropAlias, setBoolAttribute, ssrSpread, use);
