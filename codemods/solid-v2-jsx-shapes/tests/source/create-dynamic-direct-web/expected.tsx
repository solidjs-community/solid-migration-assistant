import { createComponent } from "solid-js";
import { dynamic } from "@solidjs/web";

export const view = createComponent(dynamic(source), props);
