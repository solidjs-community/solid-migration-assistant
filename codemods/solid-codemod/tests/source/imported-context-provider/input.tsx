import { AccordionItemContext, BreadcrumbsContext, RemoteProviderBag } from "./context";

export function View(props) {
  return (
    <AccordionItemContext.Provider value={props.item}>
      <BreadcrumbsContext.Provider value={props.breadcrumbs}>
        <RemoteProviderBag.Provider value="x">{props.children}</RemoteProviderBag.Provider>
      </BreadcrumbsContext.Provider>
    </AccordionItemContext.Provider>
  );
}
