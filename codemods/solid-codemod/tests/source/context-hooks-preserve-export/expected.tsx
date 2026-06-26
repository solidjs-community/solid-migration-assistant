// TODO(solid-2): Review semantic migration sites in this file: createContext default value.
import { createContext, useContext } from "solid-js";

const LocalContext = createContext<LocalValue>(null as any);
const PublicContext = createContext<PublicValue>(null as any);


export const usePublic = () => useContext(PublicContext);

const local = useContext(LocalContext);
