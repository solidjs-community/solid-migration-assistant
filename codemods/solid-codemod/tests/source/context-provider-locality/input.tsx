import { createContext } from "solid-js";
import { RemoteContext } from "./context";

const LocalContext = createContext("local");

export function Providers(props) {
  return <LocalContext.Provider value="here"><RemoteContext.Provider value="there">{props.children}</RemoteContext.Provider></LocalContext.Provider>;
}
