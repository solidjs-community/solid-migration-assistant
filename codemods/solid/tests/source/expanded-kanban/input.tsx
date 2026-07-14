import {
  batch,
  createEffect,
  For,
  Index,
  onCleanup,
  onMount,
  type ComponentProps,
} from "solid-js";
import { createStore, produce, unwrap } from "solid-js/store";

const columns = [{ id: "backlog" }, { id: "done" }] as const;
const [board, setBoard] = createStore({
  cards: [{ id: "one", columnId: "backlog" }],
});

function ToolbarButton(props: ComponentProps<"button">) {
  return <button {...props} />;
}

createEffect(() => {
  persistCards(board.cards);
});

onMount(() => {
  const handleKeydown = () => focusFilter();
  window.addEventListener("keydown", handleKeydown);
  onCleanup(() => window.removeEventListener("keydown", handleKeydown));
});

function moveCard() {
  setBoard("cards", 0, "columnId", "done");
  persistCards(board.cards);
}

function completeCards() {
  const nextCards = board.cards.map(card => ({ ...card, columnId: "done" }));
  batch(() => {
    setBoard(
      produce(draft => {
        for (const card of draft.cards) card.columnId = "done";
      }),
    );
    persistCards(nextCards);
  });
}

function exportBoard() {
  return JSON.stringify(unwrap(board), null, 2);
}

export function App() {
  return (
    <main>
      <ToolbarButton type="button">Complete</ToolbarButton>
      <article classList={{ card: true, done: board.cards[0].columnId === "done" }} />
      <Index each={columns}>
        {column => <p>{column().id}</p>}
      </Index>
      <For each={board.cards}>{card => <p>{card.id}</p>}</For>
    </main>
  );
}
