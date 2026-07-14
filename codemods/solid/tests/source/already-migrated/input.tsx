import { createEffect, deep, flush, For, onSettled, snapshot, storePath } from "solid-js";
import { type ComponentProps } from "@solidjs/web";

const [board, setBoard] = createStore({ cards: [] });
createEffect(
  () => deep(board.cards),
  cards => persistCards(cards),
);
onSettled(() => {
  const handler = () => focusFilter();
  window.addEventListener("keydown", handler);
  return () => window.removeEventListener("keydown", handler);
});
flush(() => setBoard(storePath("cards", 0, "columnId", "done")));
const json = JSON.stringify(snapshot(board), null, 2);
const Button = (props: ComponentProps<"button">) => <button {...props} />;
const view = <For each={[]} keyed={false}>{item => <p>{item()}</p>}</For>;
void json;
void Button;
void view;
