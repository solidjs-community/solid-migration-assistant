function createEffect(callback: () => void) {
  callback();
}

function batch(callback: () => void) {
  callback();
}

function setBoard(value: unknown) {
  return value;
}

function produce(value: unknown) {
  return value;
}

function unwrap(value: unknown) {
  return value;
}

const board = { cards: [] };

createEffect(() => {
  persistCards(board.cards);
});

batch(() => {
  setBoard(produce(board));
  persistCards(board.cards);
});

const serialized = JSON.stringify(unwrap(board));
