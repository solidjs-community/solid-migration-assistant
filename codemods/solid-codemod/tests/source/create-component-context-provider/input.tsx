import { createComponent } from "solid-js";
import { WidgetContext } from "./widget-context";

export function WidgetProvider(props: { children: any }) {
  return createComponent(WidgetContext.Provider, {
    value: 1,
    get children() {
      return props.children;
    },
  });
}
