export function Popover(props: { modern: boolean }) {
  return (
    <div
      class={["absolute inset-x-0 -top-2\n             overflow-auto flex flex-col p-2", {
        "rounded-lg bg-panel": props.modern,
        "rounded-md bg-surface": !props.modern,
      }]}

    />
  );
}
