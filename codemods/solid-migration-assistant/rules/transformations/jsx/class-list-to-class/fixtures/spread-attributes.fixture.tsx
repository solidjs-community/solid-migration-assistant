// fixture: spread-attributes
const flags = { active: true };
const props = { class: "card" };

export function View() {
  return (
    <section>
      <div {...props} classList={flags} />
      <div classList={flags} {...props} />
      <div id="first" {...props} classList={flags} data-index="1" />
      <div {...{ classList: flags }} />
    </section>
  );
}
