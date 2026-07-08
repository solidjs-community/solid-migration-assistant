import { createComputed, createRoot } from "solid-js";
import { expect, test } from "vitest";

test("captured accessor", () => {
  createRoot(dispose => {
    let captured: Event | undefined;
    const event = useKeyDownEvent();
    createComputed(() => (captured = event()));

    expect(captured).toBeUndefined();
    expect(captured.key).toBe("a");
    dispose();
  });
});
