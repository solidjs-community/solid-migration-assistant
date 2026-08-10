import {
  createComputed,
  createEffect,
  createMemo,
  createSignal,
  ErrorBoundary,
  Index,
  mergeProps,
  onMount,
  splitProps,
  Suspense,
  SuspenseList,
} from "solid-js";
import { createMutable, modifyMutable, produce, unwrap } from "solid-js/store";
import { render } from "solid-js/web";

const [count] = createSignal(0);

const props = mergeProps({ label: "Count" }, { label: undefined });
const [localProps, restProps] = splitProps(props, ["label"]);
const seeded = createMemo((previous) => previous + count(), 0);
const legacyMutable = createMutable({ value: 0 });
modifyMutable(legacyMutable, (draft) => {
  draft.value += 1;
});
const plainMutable = unwrap(legacyMutable);
const legacyRecipe = produce((draft: { value: number }) => {
  draft.value += 1;
});

createComputed(() => count() * 2);
createEffect(() => {
  document.title = `Count ${count()}`;
});

onMount(() => {
  document.querySelector("button")?.focus();
});

function Counter() {
  return (
    <Suspense fallback={<span>Loading</span>}>
      <ErrorBoundary fallback={(error) => <span>{error.message}</span>}>
        <SuspenseList revealOrder="forwards" tail="collapsed">
          <Index each={[props.label]}>
            {(item, index) => (
              <button classList={{ active: true }} data-index={index}>
                {item()}: {seeded()}
              </button>
            )}
          </Index>
        </SuspenseList>
      </ErrorBoundary>
    </Suspense>
  );
}

void localProps;
void restProps;
void plainMutable;
void legacyRecipe;

render(() => <Counter />, document.getElementById("root")!);
