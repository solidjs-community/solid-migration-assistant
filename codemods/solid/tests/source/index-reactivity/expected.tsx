import { For } from "solid-js";

const items = [{ id: "one", title: "Plan migration", active: true }];

export const view = (
  <For each={items} keyed={false}>
    {(item, index) => {
      const chipProps = {
        get label() { return `${index + 1}. ${item().title}`; },
        get state() { return { active: item().active }; },
        get item() { return item(); },
        onRemove: () => remove(item().id),
        role: "status",
      };
      return <SelectionChip {...chipProps} />;
    }}
  </For>
);
