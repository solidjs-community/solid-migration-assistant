import { onCleanup, type Accessor, type Element as JSXElement } from "solid-js";
import { type ComponentProps, type JSX, Portal } from "@solidjs/web";

export function autofocus(enabled: Accessor<boolean>) {
  let element!: HTMLInputElement;
  let active = true;
  queueMicrotask(() => {
    if (active && enabled()) element.focus();
  });
  onCleanup(() => { active = false; });
  return (nextElement: HTMLInputElement) => {
    element = nextElement;
  };
}

export function clickOutside(handler: Accessor<() => void>) {
  let element!: HTMLElement;
  const onPointerDown = (event: PointerEvent) => {
    if (!element.contains(event.target as Node)) handler()();
  };
  document.addEventListener("pointerdown", onPointerDown);
  onCleanup(() => document.removeEventListener("pointerdown", onPointerDown));
  return (nextElement: HTMLElement) => {
    element = nextElement;
  };
}

function CancelButton(props: ComponentProps<"button">): JSXElement {
  const save: JSX.EventHandlerUnion<HTMLButtonElement, MouseEvent> = () => undefined;
  return <button {...props} onClick={save} />;
}

export const view = (
  <Portal>
    <section ref={clickOutside(() => () => undefined)}>
      <input ref={autofocus(() => true)} />
      <CancelButton />
    </section>
  </Portal>
);
