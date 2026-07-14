import { flush as batch, createEffect, For, createStore, deep, flush, onSettled, snapshot, storePath } from "solid-js";
import { type ComponentProps } from "@solidjs/web";

const columns = [{ id: "backlog" }, { id: "done" }] as const;
const [board, setBoard] = createStore({
  cards: [{ id: "one", columnId: "backlog" }],
});

function ToolbarButton(props: ComponentProps<"button">) {
  return <button {...props} />;
}

createEffect(
  () => deep(board.cards),
  (cards) => persistCards(cards),
);

onSettled(() => {
  const handleKeydown = () => focusFilter();
  window.addEventListener("keydown", handleKeydown);
  return () => window.removeEventListener("keydown", handleKeydown);
});

function moveCard() {
  flush(() => setBoard(storePath("cards", 0, "columnId", "done")));
  persistCards(board.cards);
}

function completeCards() {
  const nextCards = board.cards.map(card => ({ ...card, columnId: "done" }));
  batch(() => {
    setBoard(
      draft => {
        for (const card of draft.cards) card.columnId = "done";
      },
    );
    persistCards(nextCards);
  });
}

function exportBoard() {
  return JSON.stringify(snapshot(board), null, 2);
}

export function App() {
  return (
    <main>
      <ToolbarButton type="button">Complete</ToolbarButton>
      <article class={{ card: true, done: board.cards[0].columnId === "done" }} />
      <For each={columns} keyed={false}>
        {column => <p>{column().id}</p>}
      </For>
      <For each={board.cards}>{card => <p>{card.id}</p>}</For>
    </main>
  );
}
