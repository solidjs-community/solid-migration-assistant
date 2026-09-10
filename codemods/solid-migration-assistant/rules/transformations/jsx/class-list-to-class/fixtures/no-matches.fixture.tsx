// fixture: no-matches
const classList = { active: true };
const text = "<div classList={{ active: true }} />";
// <div classList={{ active: true }} /> is only a comment.

export function View() {
  return (
    <section class="already-new">
      <div class={classList} />
      <span>{text}</span>
    </section>
  );
}

const element = document.createElement("div");
element.classList.add("active");
