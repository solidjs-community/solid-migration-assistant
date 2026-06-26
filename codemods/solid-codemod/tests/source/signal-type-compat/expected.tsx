// TODO(solid-2): Review semantic migration sites in this file: Signal.
import type { Component } from "solid-js";

// TODO(solid-2): Removed Solid 1 imports below are compatibility stubs for type-checking only. Replace each with a Solid 2 migration before relying on runtime behavior.
type Signal<T = any> = [() => T, (value: T | ((prev: T) => T)) => unknown];


interface Integration {
  signal: Signal<{ value: string }>;
  component?: Component;
}

export const integration: Integration = {
  signal: [() => ({ value: "/" }), next => next]
};
