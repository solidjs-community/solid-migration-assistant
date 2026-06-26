import { createEventDispatcher } from "../src/index.js";
import { createRoot, createSignal } from "solid-js";
import { expect, test } from "vitest";

test("dispatch callback", () =>
  createRoot(dispose => {
    const [step, setStep] = createSignal("first");
    const dispatch = createEventDispatcher({
      onChangeStep: (evt: CustomEvent<string>) => setStep(evt.detail),
    });

    expect(dispatch("changeStep", "second")).toBe(true);
    expect(step()).toBe("second");
    dispose();
  }));
