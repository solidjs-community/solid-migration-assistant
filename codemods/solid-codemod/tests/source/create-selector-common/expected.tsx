import { createProjection, For } from "solid-js";

let previousSelectedId;

const selected = createProjection(draft => {
  const id = selectedId();

  if (previousSelectedId !== undefined) {
    delete draft[previousSelectedId];
  }

  draft[id] = true;
  previousSelectedId = id;
}, {});

export const view = <For each={items()}>{item => <Row selected={selected[item.id]} item={item} />}</For>;
