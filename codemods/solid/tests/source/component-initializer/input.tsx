import { createSignal, Show, type JSXElement } from "solid-js";

interface Card {
  title: string;
}

function CardEditor(props: { card: Card }): JSXElement {
  const [title] = createSignal(props.card.title);
  return <h2>Edit {title()}</h2>;
}

export const view = (
  <Show when={editingCard()} keyed>
    {(card) => <CardEditor card={card} />}
  </Show>
);
