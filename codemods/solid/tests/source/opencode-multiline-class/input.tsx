export function Popover(props: { modern: boolean }) {
  return (
    <div
      class="absolute inset-x-0 -top-2
             overflow-auto flex flex-col p-2"
      classList={{
        "rounded-lg bg-panel": props.modern,
        "rounded-md bg-surface": !props.modern,
      }}
    />
  );
}
