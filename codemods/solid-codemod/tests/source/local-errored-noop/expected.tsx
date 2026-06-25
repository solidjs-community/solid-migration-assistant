function Errored(props) {
  return <section>{props.children}</section>;
}

export const view = <Errored fallback={err => err.message}><Child /></Errored>;
