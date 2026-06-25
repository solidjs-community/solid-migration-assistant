import { addEventListener, Aliases, Properties, classList, clearDelegatedEvents, getPropAlias, setBoolAttribute, ssrSpread, use } from "solid-js/web";

addEventListener(node, "click", handleClick);
clearDelegatedEvents();
console.log(Aliases, Properties, classList, getPropAlias, setBoolAttribute, ssrSpread, use);
