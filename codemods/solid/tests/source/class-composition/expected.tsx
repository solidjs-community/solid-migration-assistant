function Chip(props: { classList: Record<string, boolean> }) {
  return <span data-active={props.classList.active}>Chip</span>;
}

export const view = (
  <>
    <article class={["card migration-card", { selected: true }]} />
    <main class={{ dark: true }} />
    <Chip classList={{ active: true }} />
  </>
);
