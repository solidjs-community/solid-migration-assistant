// TODO(solid-2): Review semantic migration sites in this file: Aliases, Properties, SVGNamespace, classList, clearDelegatedEvents, effect, getPropAlias, setBoolAttribute, ssrSpread, use.
import { addEvent } from "@solidjs/web";
// TODO(solid-2): Removed Solid 1 imports below are compatibility stubs for type-checking only. Replace each with a Solid 2 migration before relying on runtime behavior.
const Aliases = undefined as any;
const Properties = undefined as any;
const SVGNamespace = undefined as any;
const classList = undefined as any;
const clearDelegatedEvents: () => any = undefined as any;
const effect: (fn: (previous?: any) => any, value?: any, options?: any) => any = ((fn: (previous?: any) => any, value?: any) => fn(value)) as any;
const getPropAlias: (name: any, tag?: any) => any = undefined as any;
const setBoolAttribute: (node: any, name: any, value: any) => any = undefined as any;
const ssrSpread: (...args: any[]) => any = undefined as any;
const use: <T extends Element, A extends unknown[], R>(fn: (element: T, ...args: A) => R, element: T, ...args: A) => R = undefined as any;


addEvent(node, "click", handleClick);
clearDelegatedEvents();
effect((previous = 0) => previous + 1, 0);
console.log(Aliases, Properties, SVGNamespace, classList, getPropAlias, setBoolAttribute, ssrSpread, use);
