// fixture: attribute-values
const flags = { active: true };

export function View() {
  return (
    <section>
      <div classList />
      <div classList={} />
      <div classList={/* only a comment */} />
      <div classList="active" />
      <div classList=<span /> />
      <div ns:classList={flags} />
      <div class-list={flags} />
      <div classlist={flags} />
      <div CLASSLIST={flags} />
      <div data-classList={flags} />
    </section>
  );
}
