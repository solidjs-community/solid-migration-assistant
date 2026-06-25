import { createContext, useContext } from "solid-js";

const LocalContext = createContext<LocalValue>();
const PublicContext = createContext<PublicValue>();

const useLocal = () => {
  const value = useContext(LocalContext);
  if (!value) throw new Error("missing LocalContext.Provider");
  return value;
};

export const usePublic = () => {
  const value = useContext(PublicContext);
  if (!value) throw new Error("missing PublicContext.Provider");
  return value;
};

const local = useLocal();
