// TODO(solid-2): Review semantic migration sites in this file: createRoot.
import { createRoot, createSignal, flush } from "solid-js";
import { expect, test, vi } from "vitest";

test("flushes test scheduling", () => {
  createRoot(dispose => {
    const [value, setValue] = createSignal(0, { ownedWrite: true });
    setValue(1);
    flush();
    vi.advanceTimersByTime(20);
    flush();
    window.dispatchEvent(new Event("resize"));
    flush();
    expect(value()).toBe(1);
    dispose();
  });
});
