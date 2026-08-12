import { createContext, useContext } from "solid-js";

const ThemeContext = createContext<string>("light");
const UserContext = createContext<{ name: string }>();

export function Provider() {
  return (
    <ThemeContext.Provider value="dark">
      <UserContext.Provider value={{ name: "Alice" }}>
        <App />
      </UserContext.Provider>
    </ThemeContext.Provider>
  );
}

function App() {
  const theme = useContext(ThemeContext);
  return <div class={theme}>content</div>;
}
