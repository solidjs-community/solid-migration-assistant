import { batch, createSelector, createSignal } from "solid-js";

const [selectedIds, setSelectedIds] = createSignal<ReadonlySet<string>>(new Set());
const isSelected = createSelector<ReadonlySet<string>, string>(
  selectedIds,
  (cardId, ids) => ids.has(cardId),
);

batch(() => {
  setSelectedIds(new Set(["one"]));
});

export const selected = isSelected("one");
