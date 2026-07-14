import { createContext as makeContext } from "solid-js";

const Theme = makeContext("light");
export const view = <Theme.Provider value="dark" />;
