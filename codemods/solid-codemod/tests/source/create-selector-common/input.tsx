import { createSelector, For } from "solid-js";

const isSelected = createSelector(selectedId);

export const view = <For each={items()}>{item => <Row selected={isSelected(item.id)} item={item} />}</For>;
