// TODO(solid-2): Review semantic migration sites in this file: catchError, createDeferred, createDynamic, createMutable, createSelector, enableScheduling, from, indexArray, modifyMutable, observable, onError, resetErrorBoundaries, startTransition, useTransition, writeSignal.

// TODO(solid-2): Removed Solid 1 imports below are compatibility stubs for type-checking only. Replace each with a Solid 2 migration before relying on runtime behavior.
const createDynamic = undefined as any;
const createSelector: (source: any, fn?: any, options?: any) => (key: any) => boolean = undefined as any;
const createDeferred: (source: any, options?: any) => (() => any) = undefined as any;
const createMutable = undefined as any;
const modifyMutable = undefined as any;
const from: <T = any>(producer: (set: (value: T) => void) => any, initial?: T) => any = undefined as any;
const observable: (input: any) => any = undefined as any;
const onError: (fn: (...args: any[]) => any) => any = undefined as any;
const catchError: (fn: (...args: any[]) => any, handler?: (...args: any[]) => any) => any = ((fn: (...args: any[]) => any, handler?: (...args: any[]) => any) => { try { return fn(); } catch (err) { return handler ? handler(err) : undefined; } }) as any;
const startTransition: (fn: () => any) => any = ((fn: () => any) => fn()) as any;
const useTransition: () => [() => boolean, (fn: () => any) => any] = undefined as any;
const indexArray = undefined as any;
const resetErrorBoundaries = undefined as any;
const enableScheduling = undefined as any;
const writeSignal = undefined as any;


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
