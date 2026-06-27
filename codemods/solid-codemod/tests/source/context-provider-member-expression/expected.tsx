// TODO(solid-2): Review semantic migration sites in this file: createContext default value.
import { createContext } from "solid-js";

const Ctx1 = createContext<string>(null as any);
const Ctx2 = createContext<string>(null as any);

// TODO(solid-2): Review value-position removed APIs; direct call patterns may have narrower migrations.
export const values = [[Ctx1, "Hello"], [Ctx2, "World"]];
