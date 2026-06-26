import { createSignal } from "solid-js";

export const createWSState = (ws: WebSocket) => {
  const [state, setState] = createSignal(ws.readyState, { ownedWrite: true });
  ws.addEventListener("open", () => setState(1));
  setTimeout(() => setState(2), 100);
  return state;
};
