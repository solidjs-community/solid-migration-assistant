// TODO(solid-2): Review semantic migration sites in this file: RemoteContext.Provider.
import { createContext } from "solid-js";
import { RemoteContext } from "./context";

const LocalContext = createContext("local");

export function Providers(props) {
  return <LocalContext value="here"><RemoteContext value="there">{props.children}</RemoteContext></LocalContext>;
}
