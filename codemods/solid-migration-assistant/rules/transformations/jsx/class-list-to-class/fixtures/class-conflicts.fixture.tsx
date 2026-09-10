// fixture: class-conflicts
const flags = { active: true };
const other = { hidden: true };
const toggle = true;

export function View() {
  return (
    <section>
      <div class="card" classList={flags} />
      <div classList={flags} class={other} />
      <div className="card" classList={flags} />
      <div classList={flags} class:active={toggle} />
      <div attr:class="card" classList={flags} />
      <div prop:className="card" classList={flags} />
      <div bool:class={toggle} classList={flags} />
      <div classList={flags} classList={other} />
    </section>
  );
}
