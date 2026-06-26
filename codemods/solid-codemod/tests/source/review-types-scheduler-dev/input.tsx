import type { EffectFunction, InitializedResource, InitializedResourceReturn, MemoOptions, OnEffectFunction, OnOptions, ResolvedJSXElement, Resource, ResourceActions, ResourceFetcher, ResourceFetcherInfo, ResourceOptions, ResourceReturn, ResourceSource, Transition } from "solid-js";
import { $DEVCOMP, $PROXY, $TRACK, DEV, cancelCallback, enableExternalSource, requestCallback } from "solid-js";

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
