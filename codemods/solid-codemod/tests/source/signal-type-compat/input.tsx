import type { Component, Signal } from "solid-js";

interface Integration {
  signal: Signal<{ value: string }>;
  component?: Component;
}

export const integration: Integration = {
  signal: [() => ({ value: "/" }), next => next]
};
