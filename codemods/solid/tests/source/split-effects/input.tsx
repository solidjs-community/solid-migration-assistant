import { createEffect } from "solid-js";
import { createStore } from "solid-js/store";

const [board] = createStore({ cards: [{ id: "one" }] });
const storageKey = "cards";

createEffect(() => persistCards(board.cards));
createEffect(() => localStorage.setItem(storageKey, JSON.stringify({ count: board.cards.length })));
