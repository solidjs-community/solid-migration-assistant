import { createContext, useContext } from "solid-js";

const LocalContext = createContext<LocalValue>();
const PublicContext = createContext<PublicValue>();

export const usePublic = () => useContext(PublicContext);

const local = useContext(LocalContext);
