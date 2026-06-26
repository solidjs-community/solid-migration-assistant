import { createSignal, flush } from "solid-js";
import { expect, test } from "vitest";

test("close updates state", () => {
  const [state, setState] = createSignal(0, { ownedWrite: true });
  const ws = new WebSocket("ws://localhost");
  ws.addEventListener("close", () => setState(2));
  ws.close();
  flush();
  expect(state()).toBe(2);
});
