import { createContext, merge as mergeProps, useContext, type Element as JSXElement, omit } from "solid-js";

const Theme = createContext("light");

export function ThemeProvider(rawProps: { children: JSXElement; class?: string }) {
  const props = mergeProps({ class: "shell" }, rawProps);
  const local = props;
  const rest = omit(props, "children");
  return <Theme value="dark"><main {...rest}>{local.children}</main></Theme>;
}

export const useTheme = () => useContext(Theme);
