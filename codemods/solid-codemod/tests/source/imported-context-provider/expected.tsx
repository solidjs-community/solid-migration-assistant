// TODO(solid-2): Review semantic migration sites in this file: AccordionItemContext.Provider, BreadcrumbsContext.Provider, RemoteProviderBag.Provider.
import { AccordionItemContext, BreadcrumbsContext, RemoteProviderBag } from "./context";

export function View(props) {
  // TODO(solid-2): Review RemoteProviderBag.Provider; only same-file Solid createContext providers are rewritten.
  return (
    <AccordionItemContext value={props.item}>
      <BreadcrumbsContext value={props.breadcrumbs}>
        <RemoteProviderBag.Provider value="x">{props.children}</RemoteProviderBag.Provider>
      </BreadcrumbsContext>
    </AccordionItemContext>
  );
}
