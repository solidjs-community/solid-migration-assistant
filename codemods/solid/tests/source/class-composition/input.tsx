function Chip(props: { classList: Record<string, boolean> }) {
  return <span data-active={props.classList.active}>Chip</span>;
}

export const view = (
  <>
    <article class="card migration-card" classList={{ selected: true }} />
    <main classList={{ dark: true }} />
    <Chip classList={{ active: true }} />
  </>
);
