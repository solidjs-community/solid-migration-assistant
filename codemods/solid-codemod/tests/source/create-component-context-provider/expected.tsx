// TODO(solid-2): Review semantic migration sites in this file: WidgetContext.Provider.
import { createComponent } from "solid-js";
import { WidgetContext } from "./widget-context";

export function WidgetProvider(props: { children: any }) {
  return createComponent(WidgetContext, {
    value: 1,
    get children() {
      return props.children;
    },
  });
}
