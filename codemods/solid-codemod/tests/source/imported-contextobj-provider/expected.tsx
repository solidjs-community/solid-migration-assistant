// TODO(solid-2): Review semantic migration sites in this file: RemoteProviderBag.Provider, RouterContextObj.Provider.
import { RouterContextObj, RemoteProviderBag } from "./context";

export function View(props) {
  // TODO(solid-2): Review RemoteProviderBag.Provider; only same-file Solid createContext providers are rewritten.
  return <RouterContextObj value={props.router}><RemoteProviderBag.Provider value="x">{props.children}</RemoteProviderBag.Provider></RouterContextObj>;
}
