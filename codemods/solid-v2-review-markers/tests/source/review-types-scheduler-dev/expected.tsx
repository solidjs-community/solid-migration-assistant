// TODO(solid-2): Review semantic migration sites in this file: $DEVCOMP, $PROXY, $TRACK, DEV, EffectFunction, InitializedResource, InitializedResourceReturn, MemoOptions, OnEffectFunction, OnOptions, ResolvedJSXElement, Resource, ResourceActions, ResourceFetcher, ResourceFetcherInfo, ResourceOptions, ResourceReturn, ResourceSource, Transition, cancelCallback, enableExternalSource, requestCallback.

import { $DEVCOMP, $PROXY, $TRACK } from "solid-js";
// TODO(solid-2): Removed Solid 1 imports below are compatibility stubs for type-checking only. Replace each with a Solid 2 migration before relying on runtime behavior.
type EffectFunction<T = any, U = any, V = any> = any & { __solid2Compat?: [T, U, V] };
type InitializedResource<T = any, U = any, V = any> = any & { __solid2Compat?: [T, U, V] };
type InitializedResourceReturn<T = any, U = any, V = any> = any & { __solid2Compat?: [T, U, V] };
type MemoOptions<T = any, U = any, V = any> = any & { __solid2Compat?: [T, U, V] };
type OnEffectFunction<T = any, U = any, V = any> = any & { __solid2Compat?: [T, U, V] };
type OnOptions<T = any, U = any, V = any> = any & { __solid2Compat?: [T, U, V] };
type ResolvedJSXElement<T = any, U = any, V = any> = any & { __solid2Compat?: [T, U, V] };
type Resource<T = any, U = any, V = any> = any & { __solid2Compat?: [T, U, V] };
type ResourceActions<T = any, U = any, V = any> = any & { __solid2Compat?: [T, U, V] };
type ResourceFetcher<T = any, U = any, V = any> = any & { __solid2Compat?: [T, U, V] };
type ResourceFetcherInfo<T = any, U = any, V = any> = any & { __solid2Compat?: [T, U, V] };
type ResourceOptions<T = any, U = any, V = any> = any & { __solid2Compat?: [T, U, V] };
type ResourceReturn<T = any, U = any, V = any> = any & { __solid2Compat?: [T, U, V] };
type ResourceSource<T = any, U = any, V = any> = any & { __solid2Compat?: [T, U, V] };
type Transition<T = any, U = any, V = any> = any & { __solid2Compat?: [T, U, V] };
const DEV = undefined as any;
const cancelCallback: (task: any) => any = undefined as any;
const enableExternalSource: (factory: (track: any, trigger: any) => any) => any = undefined as any;
const requestCallback: (fn: () => any, options?: any) => any = undefined as any;


export type LegacyTypes<T, S> = {
  effect: EffectFunction<T>;
  initialized: InitializedResource<T>;
  initializedResult: InitializedResourceReturn<T>;
  memo: MemoOptions<T>;
  onEffect: OnEffectFunction<T, T>;
  onOptions: OnOptions;
  resolved: ResolvedJSXElement;
  resource: Resource<T>;
  actions: ResourceActions<T>;
  fetcher: ResourceFetcher<S, T>;
  fetcherInfo: ResourceFetcherInfo<T>;
  options: ResourceOptions<T, S>;
  result: ResourceReturn<T>;
  source: ResourceSource<S>;
  transition: Transition;
};

export const devSentinels = [$DEVCOMP, $PROXY, $TRACK, DEV];

const task = requestCallback(() => undefined);
cancelCallback(task);
enableExternalSource((track, trigger) => ({ track, dispose: trigger }));
