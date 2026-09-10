// fixture: vetoed-bindings
import { Portal } from "solid-js/web";
import { isDev } from "solid-js/web";
import { createDynamic } from "solid-js/web";
import { Suspense, ErrorBoundary } from "solid-js/web";
import { renderToString, renderToStream } from "solid-js/web";
import { renderToStringAsync, pipeToNodeWritable } from "solid-js/web";
import { generateHydrationScript, HydrationScript } from "solid-js/web";
import { getRequestEvent } from "solid-js/web";
import { For, Show, Switch, Match } from "solid-js/web";
import { Index, SuspenseList, mergeProps } from "solid-js/web";
import { NoHydration, Hydration } from "solid-js/web";
import { template, insert, spread, delegateEvents } from "solid-js/web";
import { ssr, ssrClassList, ssrHydrationKey } from "solid-js/web";
import type { DynamicProps } from "solid-js/web";
// Dynamic is prescribed by the migration guide and by the Babel plugin's
// auto-import defaults, but no such export exists in the rc.7 runtime source,
// so it is vetoed on its own and it vetoes any statement it appears in.
import { Dynamic } from "solid-js/web";
import { Dynamic as DynamicAliased } from "solid-js/web";
import { Dynamic as DynamicWithRender, render as renderVetoedByDynamic } from "solid-js/web";
export { Portal as PortalOut } from "solid-js/web";
export { Dynamic as DynamicOut } from "solid-js/web";
export { Dynamic as DynamicWithProven, isServer as isServerVetoedByDynamic } from "solid-js/web";
export type { DynamicProps as DynamicPropsOut } from "solid-js/web";

void Portal;
void isDev;
void createDynamic;
void Suspense;
void ErrorBoundary;
void renderToString;
void renderToStream;
void renderToStringAsync;
void pipeToNodeWritable;
void generateHydrationScript;
void HydrationScript;
void getRequestEvent;
void For;
void Show;
void Switch;
void Match;
void Index;
void SuspenseList;
void mergeProps;
void NoHydration;
void Hydration;
void template;
void insert;
void spread;
void delegateEvents;
void ssr;
void ssrClassList;
void ssrHydrationKey;
void Dynamic;
void DynamicAliased;
void DynamicWithRender;
void renderVetoedByDynamic;
type _DynamicProps = DynamicProps;
