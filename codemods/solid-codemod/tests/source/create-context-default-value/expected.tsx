// TODO(solid-2): Review semantic migration sites in this file: createContext default value.
import { createContext as makeContext } from "solid-js";
import * as Solid from "solid-js";

export const LocalContext = makeContext<{ value: string }>(null as any);
export const ExistingContext = makeContext("ready");
export const NamespaceContext = Solid.createContext<number>(null as any);
