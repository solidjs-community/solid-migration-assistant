import { createContext as makeContext } from "solid-js";
import * as Solid from "solid-js";

export const LocalContext = makeContext<{ value: string }>();
export const ExistingContext = makeContext("ready");
export const NamespaceContext = Solid.createContext<number>();
