import { createEffect, createSignal, createStore, deep, flush, storePath } from "solid-js";
import { render } from "@solidjs/web";

const [board, setBoard] = createStore({ cards: [] as { columnId: string }[] });

// Track nested fields before applying the persistence side effect.
createEffect(
  () => deep(board.cards),
  (cards) => persistCards(cards),
);

function moveCard(index: number) {
  flush(() => setBoard(storePath("cards", index, "columnId", "done")));
  persistCards(board.cards);
}

render(() => <main>{createSignal("Kanban")[0]()}</main>, document.body);
