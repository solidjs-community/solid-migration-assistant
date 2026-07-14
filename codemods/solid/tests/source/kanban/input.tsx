import { createEffect, createSignal } from "solid-js";
import { createStore } from "solid-js/store";
import { render } from "solid-js/web";

const [board, setBoard] = createStore({ cards: [] as { columnId: string }[] });

createEffect(() => {
  // Track nested fields before applying the persistence side effect.
  persistCards(board.cards);
});

function moveCard(index: number) {
  setBoard("cards", index, "columnId", "done");
  persistCards(board.cards);
}

render(() => <main>{createSignal("Kanban")[0]()}</main>, document.body);
