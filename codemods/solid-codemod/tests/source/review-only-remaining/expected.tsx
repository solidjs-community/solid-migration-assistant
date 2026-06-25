// TODO(solid-2): Review semantic migration sites in this file: catchError, createDeferred, createDynamic, createMutable, createSelector, enableScheduling, from, indexArray, modifyMutable, observable, onError, resetErrorBoundaries, startTransition, useTransition, writeSignal.
import { createDynamic, createSelector, createDeferred, createMutable, modifyMutable, from, observable, onError, catchError, startTransition, useTransition, indexArray, resetErrorBoundaries, enableScheduling, writeSignal } from "solid-js";

// TODO(solid-2): Review value-position removed APIs; direct call patterns may have narrower migrations.
export const values = [
  createDynamic,
  createSelector,
  createDeferred,
  createMutable,
  modifyMutable,
  from,
  observable,
  onError,
  catchError,
  startTransition,
  useTransition,
  indexArray,
  resetErrorBoundaries,
  enableScheduling,
  writeSignal,
];
