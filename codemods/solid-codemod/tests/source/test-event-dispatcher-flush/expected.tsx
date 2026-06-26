// TODO(solid-2): Review semantic migration sites in this file: createRoot.
import { createEventDispatcher } from "../src/index.js";
import { createRoot, createSignal, flush } from "solid-js";
import { expect, test } from "vitest";

test("dispatch callback", () =>
  createRoot(dispose => {
    const [step, setStep] = createSignal("first", { ownedWrite: true });
    const dispatch = createEventDispatcher({
      onChangeStep: (evt: CustomEvent<string>) => setStep(evt.detail),
    });

    expect(dispatch("changeStep", "second")).toBe(true);
    flush();
    expect(step()).toBe("second");
    dispose();
  }));
