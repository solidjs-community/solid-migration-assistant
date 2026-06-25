// TODO(solid-2): Review semantic migration sites in this file: Aliases, Properties, classList, clearDelegatedEvents, getPropAlias, setBoolAttribute, ssrSpread, use.
import { addEvent, Aliases, Properties, classList, clearDelegatedEvents, getPropAlias, setBoolAttribute, ssrSpread, use } from "@solidjs/web";

addEvent(node, "click", handleClick);
clearDelegatedEvents();
console.log(Aliases, Properties, classList, getPropAlias, setBoolAttribute, ssrSpread, use);
