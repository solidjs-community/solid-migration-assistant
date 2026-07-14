import { onCleanup, type Accessor, type ComponentProps, type JSX, type JSXElement } from "solid-js";
import { Portal } from "solid-js/web";

declare module "solid-js" {
  namespace JSX {
    interface Directives {
      autofocus: boolean;
      clickOutside: () => void;
    }
  }
}

export function autofocus(element: HTMLInputElement, enabled: Accessor<boolean>) {
  let active = true;
  queueMicrotask(() => {
    if (active && enabled()) element.focus();
  });
  onCleanup(() => { active = false; });
}

export function clickOutside(element: HTMLElement, handler: Accessor<() => void>) {
  const onPointerDown = (event: PointerEvent) => {
    if (!element.contains(event.target as Node)) handler()();
  };
  document.addEventListener("pointerdown", onPointerDown);
  onCleanup(() => document.removeEventListener("pointerdown", onPointerDown));
}

function CancelButton(props: ComponentProps<"button">): JSXElement {
  const save: JSX.EventHandlerUnion<HTMLButtonElement, MouseEvent> = () => undefined;
  return <button {...props} onClick={save} />;
}

export const view = (
  <Portal>
    <section use:clickOutside={() => undefined}>
      <input use:autofocus={true} />
      <CancelButton />
    </section>
  </Portal>
);
