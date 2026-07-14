import { flush as batch, createSignal } from "solid-js";

const [selectedIds, setSelectedIds] = createSignal<ReadonlySet<string>>(new Set());
const isSelected = (key: string) => ((cardId, ids) => ids.has(cardId))(key, selectedIds());

batch(() => {
  setSelectedIds(new Set(["one"]));
});

export const selected = isSelected("one");
