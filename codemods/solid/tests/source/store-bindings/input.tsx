import { createStore, produce, reconcile, unwrap } from "solid-js/store";

const [board, setBoard] = createStore({ cards: [{ id: "one", title: "One" }] });
const updateBoard = setBoard;

setBoard("cards", 0, "title", "Updated");
updateBoard("cards", reconcile([{ id: "two", title: "Two" }]));
setBoard(produce((draft) => {
  draft.cards.push({ id: "three", title: "Three" });
}));
setBoard({ cards: [] });

const plain = unwrap(board.cards);

function unrelated(setBoard: () => void) {
  setBoard();
}

void plain;
void unrelated;
