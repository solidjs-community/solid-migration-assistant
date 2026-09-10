// fixture: non-intrinsic-elements
const flags = { active: true };

function Widget(props: { classList: unknown }) {
  return <pre>{String(props.classList)}</pre>;
}

const Components = { Widget };

export function View() {
  return (
    <>
      <Widget classList={flags} />
      <Components.Widget classList={flags} />
      <svg:circle classList={flags} />
      <Widget classList={flags}>child</Widget>
    </>
  );
}
