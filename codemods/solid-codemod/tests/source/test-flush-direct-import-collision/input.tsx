import { createComputed, createRoot } from "solid-js";
import { expect, test } from "vitest";

const dispatchKeyEvent = (key: string, type: "keydown" | "keyup") => {
  const ev = new Event(type) as any;
  ev.key = key;
  window.dispatchEvent(ev);
};

test("keyboard helper", () =>
  createRoot(dispose => {
    let captured: any;
    const keys = () => ["A"];
    createComputed(() => (captured = keys()));

    dispatchKeyEvent("a", "keydown");
    expect(captured).toEqual(["A"]);
    dispose();
  }));
