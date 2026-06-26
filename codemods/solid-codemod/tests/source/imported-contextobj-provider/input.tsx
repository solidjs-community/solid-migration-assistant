import { RouterContextObj, RemoteProviderBag } from "./context";

export function View(props) {
  return <RouterContextObj.Provider value={props.router}><RemoteProviderBag.Provider value="x">{props.children}</RemoteProviderBag.Provider></RouterContextObj.Provider>;
}
