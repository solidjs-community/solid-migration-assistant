export function PromptPopover(props: { newLayoutDesigns: boolean }) {
  return (
    <div
      data-component="prompt-popover"
      class={["absolute inset-x-0 -top-2 -translate-y-full origin-bottom-left max-h-80 min-h-10\n             overflow-auto no-scrollbar flex flex-col p-2", {
        "z-[70] rounded-[10px] bg-v2-background-bg-base shadow-[var(--v2-elevation-raised)]": props.newLayoutDesigns,
        "z-50 rounded-md bg-background-base shadow-lg": !props.newLayoutDesigns,
      }]}

    />
  )
}
