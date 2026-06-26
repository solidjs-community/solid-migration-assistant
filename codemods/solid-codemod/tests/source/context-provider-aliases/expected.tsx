// TODO(solid-2): Review semantic migration sites in this file: createContext default value.
import { createContext as makeContext } from "solid-js";
import * as Solid from "solid-js";

const Theme = makeContext("light");
const User = Solid.createContext(null as any);

export const view = <>
  <Theme value="dark"><Child /></Theme>
  <User value={user()}><Child /></User>
</>;
