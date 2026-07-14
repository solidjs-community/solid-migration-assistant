import { createMemo as __solid2CreateMemo, Errored as __solid2Errored, Loading as __solid2Loading } from "solid-js";

const createMemo = "occupied";
const Loading = "occupied";
const Errored = "occupied";
const details = __solid2CreateMemo(() => {
  const sourceValue = source();
  return sourceValue == null || (sourceValue as unknown) === false ? undefined : loadDetails(sourceValue);
});

export const view = (
  <__solid2Errored fallback={(error) => <p>{(error() as Error).message}</p>}>
    <__solid2Loading fallback={<p>Wait</p>}>{details()?.name}</__solid2Loading>
  </__solid2Errored>
);

console.log(createMemo, Loading, Errored);
