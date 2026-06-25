import { createContext } from "react";

const Theme = createContext("light");

export function View() {
  const Local = createContext("local");
  return <Theme.Provider value="dark"><Local.Provider value="here"><Child /></Local.Provider></Theme.Provider>;
}
