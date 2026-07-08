export function Link(props, rest) {
  return <a classList={{ ...(props.class && { [props.class!]: true }), ...rest.classList, active: isActive() }} />;
}
