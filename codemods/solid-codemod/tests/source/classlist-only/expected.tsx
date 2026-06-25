export function Toggle() {
  return <button class={{ active: isActive(), disabled: isDisabled() }}>Save</button>;
}
