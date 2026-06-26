export function Button(props: { selected: boolean }) {
  return <button class={{ selected: props.selected, disabled: isDisabled() }}>Save</button>;
}
