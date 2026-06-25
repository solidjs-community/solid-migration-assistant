export function Toggle() {
  return <button classList={{ active: isActive(), disabled: isDisabled() }}>Save</button>;
}
