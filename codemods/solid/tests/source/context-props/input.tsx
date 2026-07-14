import { createContext, mergeProps, splitProps, useContext, type JSXElement } from "solid-js";

const Theme = createContext("light");

export function ThemeProvider(rawProps: { children: JSXElement; class?: string }) {
  const props = mergeProps({ class: "shell" }, rawProps);
  const [local, rest] = splitProps(props, ["children"]);
  return <Theme.Provider value="dark"><main {...rest}>{local.children}</main></Theme.Provider>;
}

export const useTheme = () => useContext(Theme);
