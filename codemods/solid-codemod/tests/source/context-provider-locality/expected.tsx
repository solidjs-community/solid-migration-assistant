// TODO(solid-2): Review semantic migration sites in this file: RemoteContext.Provider.
import { createContext } from "solid-js";
import { RemoteContext } from "./context";

const LocalContext = createContext("local");

export function Providers(props) {
  // TODO(solid-2): Review RemoteContext.Provider; only same-file Solid createContext providers are rewritten.
  return <LocalContext value="here"><RemoteContext.Provider value="there">{props.children}</RemoteContext.Provider></LocalContext>;
}
