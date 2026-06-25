import { createContext } from "solid-js";

const Theme = createContext("light");

export function View() {
  const Theme = { Provider: (props) => <section>{props.children}</section> };
  return <Theme.Provider value="dark"><Child /></Theme.Provider>;
}
