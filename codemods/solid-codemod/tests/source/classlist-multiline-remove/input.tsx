export function Button(props: { active: boolean }) {
  return (
    <button
      id="save"
      class="rounded px-2"
      classList={{ active: props.active }}
      type="button"
    >
      Save
    </button>
  );
}
