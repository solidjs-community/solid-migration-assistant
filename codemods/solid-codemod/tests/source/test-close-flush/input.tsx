import { createSignal } from "solid-js";
import { expect, test } from "vitest";

test("close updates state", () => {
  const [state, setState] = createSignal(0);
  const ws = new WebSocket("ws://localhost");
  ws.addEventListener("close", () => setState(2));
  ws.close();
  expect(state()).toBe(2);
});
