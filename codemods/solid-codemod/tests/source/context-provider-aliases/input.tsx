import { createContext as makeContext } from "solid-js";
import * as Solid from "solid-js";

const Theme = makeContext("light");
const User = Solid.createContext();

export const view = <>
  <Theme.Provider value="dark"><Child /></Theme.Provider>
  <User.Provider value={user()}><Child /></User.Provider>
</>;
