import { createStore, reconcile, flush, snapshot, storePath } from "solid-js";

const [board, setBoard] = createStore({ cards: [{ id: "one", title: "One" }] });
const updateBoard = setBoard;

setBoard(storePath("cards", 0, "title", "Updated"));
updateBoard((draft) => reconcile([{ id: "two", title: "Two" }], "id")(draft["cards"]));
setBoard((draft) => {
  draft.cards.push({ id: "three", title: "Three" });
});
flush(() => setBoard(() => ({ cards: [] })));

const plain = snapshot(board.cards);

function unrelated(setBoard: () => void) {
  setBoard();
}

void plain;
void unrelated;
