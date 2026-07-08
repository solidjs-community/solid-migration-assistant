// TODO(solid-2): Review semantic migration sites in this file: async computation/loading boundary, createMemo.
import { createMemo } from "solid-js";

// TODO(solid-2): Review async computation/loading boundary placement.
const value = createMemo(async () => await fetchValue());
