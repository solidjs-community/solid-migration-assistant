import { createContext as makeContext } from "solid-js";
import * as Solid from "solid-js";

const Theme = makeContext("light");
const User = Solid.createContext();

export const view = <>
  <Theme value="dark"><Child /></Theme>
  <User value={user()}><Child /></User>
</>;
