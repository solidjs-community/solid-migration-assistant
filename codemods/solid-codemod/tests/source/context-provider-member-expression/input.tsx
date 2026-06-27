import { createContext } from "solid-js";

const Ctx1 = createContext<string>();
const Ctx2 = createContext<string>();

export const values = [[Ctx1, "Hello"], [Ctx2.Provider, "World"]];
