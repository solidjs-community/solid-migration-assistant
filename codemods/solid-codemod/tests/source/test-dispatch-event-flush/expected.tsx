import { createSignal, flush } from "solid-js";
import { test } from "vitest";

const dispatchKeyEvent = (key: string) => {
  const ev = new KeyboardEvent("keydown", { key });
  window.dispatchEvent(ev);
  flush();
};

test("dispatches a keyboard event", () => {
  const [key, setKey] = createSignal<string | null>(null);
  window.addEventListener("keydown", event => setKey(event.key));
  dispatchKeyEvent("a");
  expect(key()).toBe("a");
});
