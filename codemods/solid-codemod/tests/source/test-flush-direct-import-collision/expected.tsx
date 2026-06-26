// TODO(solid-2): Review semantic migration sites in this file: createRoot.
import { createRoot, flush } from "solid-js";
import { expect, test } from "vitest";

const dispatchKeyEvent = (key: string, type: "keydown" | "keyup") => {
  const ev = new Event(type) as any;
  ev.key = key;
  window.dispatchEvent(ev);
  flush();
};

test("keyboard helper", () =>
  createRoot(dispose => {
    let captured: any;
    const keys = () => ["A"];
    void keys();

    dispatchKeyEvent("a", "keydown");
    expect(keys()).toEqual(["A"]);
    dispose();
  }));
