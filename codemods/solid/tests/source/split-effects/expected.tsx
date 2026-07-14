import { createEffect, createStore, deep } from "solid-js";

const [board] = createStore({ cards: [{ id: "one" }] });
const storageKey = "cards";

createEffect(() => deep(board.cards), (cards) => persistCards(cards));
createEffect(
  () => [storageKey, JSON.stringify({ count: board.cards.length })] as const,
  ([value0, value1]) => localStorage.setItem(value0, value1),
);
