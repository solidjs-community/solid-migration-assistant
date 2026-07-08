// TODO(solid-2): Review semantic migration sites in this file: createRoot.
import { createRoot } from "solid-js";
import { expect, test } from "vitest";

test("captured accessor", () => {
  createRoot(dispose => {
    let captured: Event | undefined;
    const event = useKeyDownEvent();
    void event();

    expect(event()).toBeUndefined();
    expect((event() as any).key).toBe("a");
    dispose();
  });
});
