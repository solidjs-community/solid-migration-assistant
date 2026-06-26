import { createRoot, createSignal, flush } from "solid-js";
import { expect, test, vi } from "vitest";

test("flushes test scheduling", () => {
  createRoot(dispose => {
    const [value, setValue] = createSignal(0);
    setValue(1);
    vi.advanceTimersByTime(20);
    window.dispatchEvent(new Event("resize"));
    expect(value()).toBe(1);
    dispose();
  });
});
