// TODO(solid-2): Review semantic migration sites in this file: createSelector.
import { For } from "solid-js";
// TODO(solid-2): Removed Solid 1 imports below are compatibility stubs for type-checking only. Replace each with a Solid 2 migration before relying on runtime behavior.
const createSelector: (source: any, fn?: any, options?: any) => (key: any) => boolean = undefined as any;


// TODO(solid-2): Review createSelector migration; createProjection rewrites require binding-safe state names.
const isSelected = createSelector(selectedId);

export const view = <For each={items()}>{item => <Row selected={isSelected(item.id)} item={item} />}</For>;
