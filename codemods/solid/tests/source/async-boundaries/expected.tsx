import { createMemo, createSignal, Errored, Loading as __solid2Loading, isPending } from "solid-js";

declare function loadDetails(id: string): Promise<{ owner: string }>;

const [selectedId, setSelectedId] = createSignal<string>();
const details = createMemo(() => {
  const sourceValue = selectedId();
  return sourceValue == null || (sourceValue as unknown) === false ? undefined : loadDetails(sourceValue);
});
const pending = () => isPending(() => details());
const open = (id: string) => setSelectedId(id);

export const view = (
  <aside aria-busy={isPending(() => details()) || pending() ? "true" : "false"}>
    <Errored fallback={(error) => <p>{(error() as Error).message}</p>}>
      <__solid2Loading fallback={<p>Loading</p>}>
        <p>{details()?.owner}</p>
      </__solid2Loading>
    </Errored>
  </aside>
);
