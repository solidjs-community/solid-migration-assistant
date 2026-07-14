import { Index } from "solid-js";

const items = [{ id: "one", title: "Plan migration", active: true }];

export const view = (
  <Index each={items}>
    {(item, index) => {
      const chipProps = {
        label: `${index + 1}. ${item().title}`,
        state: { active: item().active },
        item: item(),
        onRemove: () => remove(item().id),
        role: "status",
      };
      return <SelectionChip {...chipProps} />;
    }}
  </Index>
);
